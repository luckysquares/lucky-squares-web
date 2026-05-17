import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const SUPPORT_EMAIL = 'support@luckysquares.com.au';
const REMINDER_DAYS = [7, 14, 21];

Deno.serve(async () => {
  // Find active campaigns whose launched_at matches a reminder day (within the last 24h window)
  const { data: campaigns, error } = await supabase
    .from('fundraisers')
    .select(`
      id, title, org, contact_email, contact_name,
      launched_at, price_per_sq, grid_size,
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
    const costPrizes = (c.prizes ?? []).reduce((sum: number, p: { value: string; donated: boolean }) =>
      p.donated ? sum : sum + (parseFloat(String(p.value).replace(/[^0-9.]/g, '')) || 0), 0);

    // Fetch sold count
    const { data: stats } = await supabase
      .from('fundraiser_stats')
      .select('sold_count')
      .eq('fundraiser_id', c.id)
      .single();

    const soldCount   = Number(stats?.sold_count ?? 0);
    const soldRevenue = soldCount * parseFloat(c.price_per_sq);
    const shortfall   = Math.max(0, costPrizes - soldRevenue);
    const sqNeeded    = shortfall > 0 ? Math.ceil(shortfall / parseFloat(c.price_per_sq)) : 0;
    const atBreakEven = sqNeeded === 0;

    const urgency = daysRemaining <= 7 ? 'urgent' : 'normal';
    const subject = urgency === 'urgent'
      ? `⚠️ ${daysRemaining} days left — ${c.title}`
      : `Reminder: ${daysLive} days in — ${c.title}`;

    const body = atBreakEven
      ? `Hi ${c.contact_name ?? 'there'},\n\nGreat news — your Lucky Squares fundraiser "${c.title}" has already covered your prize costs! You can run your draw any time.\n\nYou have ${daysRemaining} days remaining before the campaign expires. Keep selling for maximum fundraising impact.\n\nLuckySquares Australia\n${SUPPORT_EMAIL}`
      : `Hi ${c.contact_name ?? 'there'},\n\nYour Lucky Squares fundraiser "${c.title}" has been live for ${daysLive} days. You have ${daysRemaining} days remaining.\n\nYou need to sell ${sqNeeded} more square${sqNeeded !== 1 ? 's' : ''} to cover your prize costs. If the campaign has not reached break-even by day 30, it will be automatically cancelled and buyers will be refunded.\n\nShare your fundraiser link to get more squares sold:\nhttps://luckysquares.com.au/f/${c.id}\n\nLuckySquares Australia\n${SUPPORT_EMAIL}`;

    await sendEmail({ to: c.contact_email, subject, body });
    sent++;
  }

  return new Response(JSON.stringify({ sent }), { status: 200 });
});

async function sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  // Replace with your email provider (Resend, SendGrid, etc.)
  // await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ from: 'no-reply@luckysquares.com.au', to, subject, text: body }),
  // });
  console.log(`[email] To: ${to} | Subject: ${subject}`);
}
