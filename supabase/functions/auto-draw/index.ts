/**
 * auto-draw — scheduled edge function
 *
 * Fires scheduled draws for campaigns where:
 *   draw_type = 'auto'  AND  status = 'active'  AND  draw_date <= now()
 *
 * This is the server-side fallback for the client-side draw timer in LiveGrid.js.
 * If the organiser isn't on the campaign page when the draw time passes, this
 * function picks it up on the next run.
 *
 * The two paths are idempotent: execute_draw checks status = 'active' before
 * selecting winners. Once a draw has run (status = 'drawn') a second call is
 * silently rejected with 'Campaign not found or not active'.
 *
 * Recommended schedule: every 5 minutes via Supabase Cron.
 *   Dashboard: Database → Extensions → pg_cron, then:
 *   SELECT cron.schedule(
 *     'auto-draw',
 *     '* /5 * * * *',
 *     $$SELECT net.http_post(
 *       url := 'https://<project>.supabase.co/functions/v1/auto-draw',
 *       headers := '{"Authorization": "Bearer <service_role_key>"}'::jsonb,
 *       body := '{}'::jsonb
 *     )$$
 *   );
 *
 * Note: Foundation Member badges are granted inside execute_draw, so organisers
 * whose auto-draw fires while they are offline will see the badge on next login.
 * The Foundation Member congratulation email is only sent for manual draws
 * (handled in FundraiseApp.js handleDrawComplete).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL       = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async () => {
  // Find all active campaigns where the scheduled draw time has passed.
  // Limit to 20 per run as a safety cap — any remainder will be caught next cycle.
  const now = new Date().toISOString();
  const { data: campaigns, error: queryErr } = await supabase
    .from('fundraisers')
    .select('id, title, prizes(description, place, value)')
    .eq('status', 'active')
    .eq('draw_type', 'auto')
    .lte('draw_date', now)
    .limit(20);

  if (queryErr) {
    console.error('[auto-draw] Query failed:', queryErr.message);
    return new Response(JSON.stringify({ error: queryErr.message }), { status: 500 });
  }

  if (!campaigns?.length) {
    return new Response(JSON.stringify({ drawn: 0 }), { status: 200 });
  }

  const results: Array<{ id: string; ok: boolean; winners?: number; error?: string }> = [];

  for (const campaign of campaigns) {
    // Count prizes with descriptions to determine number of winners.
    const activePrizes = (campaign.prizes as Array<{ description: string }> ?? [])
      .filter((p) => p.description);
    const numWinners = Math.max(1, activePrizes.length);

    // execute_draw: selects winners server-side, marks fundraiser 'drawn',
    // runs Foundation Member check. Service-role caller bypasses ownership guard.
    const { data: winners, error: drawErr } = await supabase.rpc('execute_draw', {
      p_fundraiser_id: campaign.id,
      p_num_winners:   numWinners,
    });

    if (drawErr) {
      console.error(`[auto-draw] execute_draw failed for ${campaign.id}:`, drawErr.message);
      results.push({ id: campaign.id, ok: false, error: drawErr.message });
      continue;
    }

    console.log(`[auto-draw] Drew ${winners?.length ?? 0} winner(s) for ${campaign.title} (${campaign.id})`);

    // Trigger draw-notification: emails organiser + all buyers, runs Stripe
    // prize-reserve transfer for card campaigns. Fire-and-forget; failure here
    // does not undo the draw (result is already persisted).
    try {
      const notifyRes = await fetch(`${SUPABASE_URL}/functions/v1/draw-notification`, {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ fundraiser_id: campaign.id }),
      });
      if (!notifyRes.ok) {
        const notifyText = await notifyRes.text().catch(() => '');
        console.error(`[auto-draw] draw-notification returned ${notifyRes.status} for ${campaign.id}:`, notifyText);
      }
    } catch (notifyErr: unknown) {
      const msg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
      console.error(`[auto-draw] draw-notification fetch failed for ${campaign.id}:`, msg);
    }

    results.push({ id: campaign.id, ok: true, winners: winners?.length ?? 0 });
  }

  const drawnCount = results.filter((r) => r.ok).length;
  console.log(`[auto-draw] Processed ${campaigns.length} campaign(s), drew ${drawnCount} successfully.`);

  return new Response(
    JSON.stringify({ drawn: drawnCount, total: campaigns.length, results }),
    { status: 200 },
  );
});
