/**
 * Welcome Sequence Edge Function
 * Triggered daily by pg_cron at 09:00 AEST (23:00 UTC).
 *
 * Sends three drip emails to organisers who signed up but haven't launched:
 *   - welcome_day3_no_campaign  (day 2-4 after signup)
 *   - welcome_day7_no_campaign  (day 6-8 after signup)
 *   - re_engagement             (30+ days after signup)
 *
 * Each batch RPC atomically marks users so they never receive the same
 * email twice, even if the cron fires more than once in a window.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TX_EMAIL_URL = `${SUPABASE_URL}/functions/v1/transactional-email`;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

async function sendEmail(type: string, to: string, data: Record<string, unknown>) {
  const res = await fetch(TX_EMAIL_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ type, to, data }),
  });
  if (!res.ok) {
    console.error(`[welcome-sequence] Failed to send ${type} to ${to}: ${res.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const results = { day3: 0, day7: 0, re_engagement: 0, errors: 0 };

  // ── Day-3 batch ─────────────────────────────────────────────────────────────
  const { data: day3Users, error: day3Err } = await supabase.rpc('batch_welcome_day3');
  if (day3Err) {
    console.error('[welcome-sequence] batch_welcome_day3 error:', day3Err.message);
    results.errors++;
  } else {
    for (const u of day3Users ?? []) {
      await sendEmail('welcome_day3_no_campaign', u.email, { first_name: u.first_name });
      results.day3++;
    }
  }

  // ── Day-7 batch ─────────────────────────────────────────────────────────────
  const { data: day7Users, error: day7Err } = await supabase.rpc('batch_welcome_day7');
  if (day7Err) {
    console.error('[welcome-sequence] batch_welcome_day7 error:', day7Err.message);
    results.errors++;
  } else {
    for (const u of day7Users ?? []) {
      await sendEmail('welcome_day7_no_campaign', u.email, { first_name: u.first_name });
      results.day7++;
    }
  }

  // ── Re-engagement batch ─────────────────────────────────────────────────────
  const { data: reUsers, error: reErr } = await supabase.rpc('batch_re_engagement');
  if (reErr) {
    console.error('[welcome-sequence] batch_re_engagement error:', reErr.message);
    results.errors++;
  } else {
    for (const u of reUsers ?? []) {
      await sendEmail('re_engagement', u.email, {
        first_name: u.first_name,
        org_name:   u.org_name,
      });
      results.re_engagement++;
    }
  }

  console.log('[welcome-sequence] Done:', results);
  return new Response(JSON.stringify({ ok: true, ...results }), { status: 200 });
});
