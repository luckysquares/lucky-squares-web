import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const ADMIN_EMAIL   = 'jwstott@me.com';
const FROM_EMAIL    = 'no-reply@luckysquares.com.au';
const SUPPORT_EMAIL = 'support@luckysquares.com.au';

Deno.serve(async (req) => {
  // Only accept POST from the app
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let fundraiserId: string | undefined;
  try {
    const body = await req.json();
    fundraiserId = body.fundraiser_id;
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  if (!fundraiserId) {
    return new Response('fundraiser_id required', { status: 400 });
  }

  // Fetch campaign details
  const { data: f, error } = await supabase
    .from('fundraisers')
    .select(`
      id, title, org, contact_name, contact_email, contact_phone,
      payment_method, grid_size, price_per_sq,
      bank_account_name, bank_bsb, bank_account,
      winner_square_num, winner_square_nums
    `)
    .eq('id', fundraiserId)
    .single();

  if (error || !f) {
    return new Response('Campaign not found', { status: 404 });
  }

  // Count sold squares
  const { count: soldCount } = await supabase
    .from('squares')
    .select('id', { count: 'exact', head: true })
    .eq('fundraiser_id', fundraiserId)
    .eq('status', 'sold');

  const fundsRaised = (soldCount ?? 0) * parseFloat(f.price_per_sq);
  const winners = Array.isArray(f.winner_square_nums)
    ? f.winner_square_nums.join(', ')
    : f.winner_square_num ?? 'Unknown';

  const paymentMethodLabel: Record<string, string> = {
    stripe:       'Online card (Stripe)',
    bank:         'Bank transfer',
    bank_inperson:'In person + bank transfer',
    inperson:     'In person',
  };

  const requiresTransfer = f.payment_method === 'stripe';

  const subject = requiresTransfer
    ? `ACTION REQUIRED: Draw complete, payout needed — ${f.title}`
    : `Draw complete: ${f.title}`;

  const payoutSection = requiresTransfer
    ? `PAYOUT REQUIRED\nFunds raised: $${fundsRaised.toFixed(2)}\nLucky Squares needs to transfer net funds to the organiser.\nLog in to the admin portal to mark this as processed once done.\n\n`
    : `Payment method: ${paymentMethodLabel[f.payment_method] ?? f.payment_method}\nOrganiser collects funds directly — no transfer required.\n\n`;

  const bankSection = (f.bank_account_name || f.bank_bsb)
    ? `Organiser bank account:\n  Name: ${f.bank_account_name ?? 'Not provided'}\n  BSB:  ${f.bank_bsb ?? 'Not provided'}\n  Acct: ${f.bank_account ?? 'Not provided'}\n\n`
    : '';

  const body = `Lucky Squares Draw Notification\n${'─'.repeat(40)}\n\nCampaign: ${f.title}\nOrganisation: ${f.org}\nContact: ${f.contact_name} (${f.contact_email}${f.contact_phone ? `, ${f.contact_phone}` : ''})\n\nGrid: ${f.grid_size} squares at $${f.price_per_sq} each\nSquares sold: ${soldCount ?? 0} of ${f.grid_size}\nFunds raised: $${fundsRaised.toFixed(2)}\n\nWinning square(s): #${winners}\n\n${payoutSection}${bankSection}Admin portal: https://luckysquares.com.au/admin/campaigns\n\n${SUPPORT_EMAIL}`;

  await sendEmail({ to: ADMIN_EMAIL, subject, body });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});

async function sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  const resendKey = Deno.env.get('RESEND_API_KEY');
  if (!resendKey) {
    console.log(`[email] RESEND_API_KEY not set — logging only`);
    console.log(`[email] To: ${to} | Subject: ${subject}`);
    console.log(body);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to,
      subject,
      text: body,
      reply_to: ADMIN_EMAIL,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[email] Resend error: ${err}`);
  }
}
