import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail } from '../_shared/resend.ts';
import {
  emailExpiryReminder7,
  emailExpiryReminder14,
  emailExpiryReminder21,
} from '../_shared/templates.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const REMINDER_DAYS = [7, 14, 21];

Deno.serve(async () => {
  const { data: campaigns, error } = await supabase
    .from('fundraisers')
    .select(`
      id, title, org, contact_email, contact_name,
      launched_at, price_per_sq, grid_size, payment_method,
      prizes ( value, donated )
    `)
    .eq('status', 'active')
    .not('launched_at', 'is', null)
    .not('contact_email', 'is', null);

  if (error || !campaigns?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { status: 200 });
  }

  const now = Date.now();
  let sent = 0;

  for (const c of campaigns) {
    const daysLive = Math.floor((now - new Date(c.launched_at).getTime()) / 86400000);
    if (!REMINDER_DAYS.includes(daysLive)) continue;

    const daysRemaining = 30 - daysLive;

    const costPrizes = (c.prizes ?? []).reduce(
      (sum: number, p: { value: string; donated: boolean }) =>
        p.donated ? sum : sum + (parseFloat(String(p.value).replace(/[^0-9.]/g, '')) || 0),
      0,
    );

    const { data: stats } = await supabase
      .from('fundraiser_stats')
      .select('sold_count')
      .eq('fundraiser_id', c.id)
      .single();

    const soldCount      = Number(stats?.sold_count ?? 0);
    const soldRevenue    = soldCount * parseFloat(c.price_per_sq);
    const shortfall      = Math.max(0, costPrizes - soldRevenue);
    const sqNeeded       = shortfall > 0 ? Math.ceil(shortfall / parseFloat(c.price_per_sq)) : 0;
    const belowBreakeven = sqNeeded > 0;
    const amountRaised   = soldRevenue.toFixed(2);
    const firstName      = (c.contact_name ?? 'there').split(' ')[0];
    const isStripe       = c.payment_method === 'stripe';

    let tpl: { subject: string; text: string };

    if (daysLive === 7) {
      tpl = emailExpiryReminder7({
        first_name: firstName, campaign_title: c.title,
        sold_count: soldCount, grid_size: c.grid_size,
        amount_raised: amountRaised, org_name: c.org,
        below_breakeven: belowBreakeven,
      });
    } else if (daysLive === 14) {
      tpl = emailExpiryReminder14({
        first_name: firstName, campaign_title: c.title,
        sold_count: soldCount, grid_size: c.grid_size,
        amount_raised: amountRaised, days_remaining: daysRemaining,
      });
    } else {
      tpl = emailExpiryReminder21({
        first_name: firstName, campaign_title: c.title,
        sold_count: soldCount, grid_size: c.grid_size,
        amount_raised: amountRaised, days_remaining: daysRemaining,
        squares_needed: sqNeeded, below_breakeven: belowBreakeven,
        is_stripe: isStripe,
      });
    }

    await sendEmail({ to: c.contact_email, subject: tpl.subject, text: tpl.text });
    sent++;
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});
