/**
 * Daily digest for organiser: squares sold since last digest.
 * Also handles 3-day no-sales nudge.
 * Runs via pg_cron at 10:00 UTC (8pm AEST).
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import { emailSquareDailyDigest, emailSquareNoSalesNudge } from '../_shared/templates.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function firstName(name: string): string {
  return (name || 'there').split(' ')[0];
}

function formatBuyerNames(names: string[]): string {
  if (names.length === 0) return 'unknown';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names[0]}, ${names[1]} and ${names.length - 2} other${names.length - 2 !== 1 ? 's' : ''}`;
}

Deno.serve(async () => {
  const now = new Date();

  // Fetch all active campaigns with contact email
  const { data: campaigns } = await supabase
    .from('fundraisers')
    .select('id, slug, title, org, contact_email, contact_name, grid_size, price_per_sq, last_digest_at, last_nudge_at')
    .eq('status', 'active')
    .not('contact_email', 'is', null);

  if (!campaigns?.length) {
    return new Response(JSON.stringify({ digests: 0, nudges: 0 }), { status: 200 });
  }

  let digests = 0;
  let nudges = 0;

  for (const c of campaigns) {
    const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? 'https://luckysquares.com.au';
    const campaignUrl = `${appUrl}/${c.slug ?? c.id}`;

    // Fetch squares sold since last digest (or ever, if no digest sent yet)
    const since = c.last_digest_at ?? new Date(0).toISOString();
    const { data: recentSales } = await supabase
      .from('squares')
      .select('number, buyer_name, updated_at')
      .eq('fundraiser_id', c.id)
      .eq('status', 'sold')
      .gt('updated_at', since)
      .order('updated_at', { ascending: false });

    const { data: allStats } = await supabase
      .from('fundraiser_stats')
      .select('sold_count')
      .eq('fundraiser_id', c.id)
      .single();

    const soldCount = Number(allStats?.sold_count ?? 0);
    const amountRaised = (soldCount * parseFloat(c.price_per_sq)).toFixed(2);

    if (recentSales && recentSales.length > 0) {
      // Send daily digest
      const buyerNames = [...new Set(recentSales.map((s) => s.buyer_name).filter(Boolean))];
      const tpl = emailSquareDailyDigest({
        first_name: firstName(c.contact_name),
        campaign_title: c.title,
        sales_today: recentSales.length,
        buyer_names: formatBuyerNames(buyerNames),
        sold_count: soldCount,
        grid_size: c.grid_size,
        amount_raised: amountRaised,
        campaign_url: campaignUrl,
      });
      await sendEmail({ to: c.contact_email, subject: tpl.subject, text: tpl.text });
      await supabase.from('fundraisers').update({ last_digest_at: now.toISOString() }).eq('id', c.id);
      digests++;
    } else {
      // Check for 3-day no-sales nudge
      // Find most recent sale
      const { data: lastSale } = await supabase
        .from('squares')
        .select('updated_at')
        .eq('fundraiser_id', c.id)
        .eq('status', 'sold')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (lastSale) {
        const daysSinceLastSale = (now.getTime() - new Date(lastSale.updated_at).getTime()) / 86400000;
        const daysSinceLastNudge = c.last_nudge_at
          ? (now.getTime() - new Date(c.last_nudge_at).getTime()) / 86400000
          : 999;

        if (daysSinceLastSale >= 3 && daysSinceLastNudge >= 7) {
          const tpl = emailSquareNoSalesNudge({
            first_name: firstName(c.contact_name),
            campaign_title: c.title,
            sold_count: soldCount,
            grid_size: c.grid_size,
            campaign_url: campaignUrl,
          });
          await sendEmail({ to: c.contact_email, subject: tpl.subject, text: tpl.text });
          await supabase.from('fundraisers').update({ last_nudge_at: now.toISOString() }).eq('id', c.id);
          nudges++;
        }
      }
    }
  }

  return new Response(JSON.stringify({ digests, nudges }), { status: 200 });
});
