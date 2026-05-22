import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
import { sendEmail, ADMIN_EMAIL } from '../_shared/resend.ts';
import {
  emailDrawCompleteOrganiser,
  emailDrawResultWinner,
  emailDrawResultDidNotWin,
} from '../_shared/templates.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async (req) => {
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
      stripe_account_id,
      winner_square_num, winner_square_nums
    `)
    .eq('id', fundraiserId)
    .single();

  if (error || !f) {
    return new Response('Campaign not found', { status: 404 });
  }

  // Fetch sold squares
  const { data: squares } = await supabase
    .from('squares')
    .select('number, buyer_name, buyer_email')
    .eq('fundraiser_id', fundraiserId)
    .eq('status', 'sold');

  const soldSquares    = squares ?? [];
  const soldCount      = soldSquares.length;
  const fundsRaised    = (soldCount * parseFloat(f.price_per_sq)).toFixed(2);
  const fundsRaisedCents = Math.round(soldCount * parseFloat(f.price_per_sq) * 100);
  const isStripe       = f.payment_method === 'stripe';

  // ── Automatic Stripe payout (Stripe campaigns only) ──────────────────────
  // Transfer the net proceeds to the organiser's connected account immediately
  // after the draw. Stripe's standard T+2 payout schedule then automatically
  // deposits the funds into the organiser's bank within 2 business days.
  let transferResult: { ok: boolean; transferId?: string; error?: string } = { ok: true };
  if (isStripe && f.stripe_account_id && fundsRaisedCents > 0) {
    try {
      const transfer = await stripe.transfers.create({
        amount:        fundsRaisedCents,
        currency:      'aud',
        destination:   f.stripe_account_id,
        transfer_group: fundraiserId,
        description:   `Payout for ${f.title} — draw complete`,
      });
      transferResult = { ok: true, transferId: transfer.id };
    } catch (err: any) {
      console.error('Stripe transfer failed:', err);
      transferResult = { ok: false, error: err?.message ?? 'Unknown error' };
    }
  }

  // Fetch prizes
  const { data: prizes } = await supabase
    .from('prizes')
    .select('place, description, value, sort_order')
    .eq('fundraiser_id', fundraiserId)
    .order('sort_order');

  const prizeList = (prizes ?? []).filter((p) => p.description);

  // Map winner square numbers to buyer details
  const winnerNums: number[] = Array.isArray(f.winner_square_nums)
    ? f.winner_square_nums
    : f.winner_square_num != null ? [f.winner_square_num] : [];

  const winners = winnerNums.map((num, i) => {
    const sq = soldSquares.find((s) => s.number === num);
    return {
      square_number: num,
      buyer_name:    sq?.buyer_name ?? 'Unknown',
      buyer_email:   sq?.buyer_email ?? null,
      place:         prizeList[i]?.place ?? `${i + 1}${i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'} Prize`,
      prize:         prizeList[i]?.description ?? '',
      value:         prizeList[i]?.value ?? '',
    };
  });

  const firstName  = (f.contact_name ?? 'there').split(' ')[0];

  // 1. Email admin (internal notification)
  const winnerSummary = winners.map((w) => `#${w.square_number} (${w.buyer_name})`).join(', ');
  const paymentLabel  = { stripe: 'Online card (Stripe)', bank: 'Bank transfer', bank_inperson: 'In person + bank transfer', inperson: 'In person' }[f.payment_method as string] ?? f.payment_method;

  let payoutLine: string;
  if (isStripe) {
    if (transferResult.ok) {
      payoutLine = `Stripe transfer triggered automatically: $${fundsRaised} to ${f.stripe_account_id} (transfer ${transferResult.transferId}). Organiser should receive funds within 2 business days.`;
    } else {
      payoutLine = `ACTION REQUIRED: automatic Stripe transfer FAILED. Error: ${transferResult.error}\nManual transfer needed: $${fundsRaised} to connected account ${f.stripe_account_id ?? 'UNKNOWN'}.`;
    }
  } else {
    payoutLine = `No payout action needed (organiser collects directly).`;
  }

  const adminBody = [
    `Lucky Squares Draw Notification`,
    `${'─'.repeat(40)}`,
    ``,
    `Campaign: ${f.title}`,
    `Organisation: ${f.org}`,
    `Contact: ${f.contact_name} (${f.contact_email}${f.contact_phone ? `, ${f.contact_phone}` : ''})`,
    ``,
    `Grid: ${f.grid_size} squares at $${f.price_per_sq} each`,
    `Squares sold: ${soldCount} of ${f.grid_size}`,
    `Funds raised: $${fundsRaised}`,
    `Payment method: ${paymentLabel}`,
    ``,
    `Winning square(s): ${winnerSummary}`,
    ``,
    payoutLine,
    ``,
    `Admin portal: https://luckysquares.com.au/admin/campaigns`,
  ].join('\n');

  const adminSubject = isStripe && !transferResult.ok
    ? `ACTION REQUIRED: Stripe transfer failed — ${f.title}`
    : `Draw complete — ${f.title}`;

  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: adminSubject,
    text:    adminBody,
  });

  // 2. Email organiser (draw complete)
  if (f.contact_email) {
    const tpl = emailDrawCompleteOrganiser({
      first_name:     firstName,
      campaign_title: f.title,
      org_name:       f.org,
      amount_raised:  fundsRaised,
      sold_count:     soldCount,
      grid_size:      f.grid_size,
      winners:        winners.map((w) => ({ place: w.place, prize: w.prize, square_number: w.square_number, buyer_name: w.buyer_name })),
      is_stripe:      isStripe,
    });
    await sendEmail({ to: f.contact_email, subject: tpl.subject, text: tpl.text });
  }

  // 3. Email each buyer (winner or no-win)
  const winnerNums_set = new Set(winnerNums);
  const uniqueBuyers   = [...new Map(soldSquares.filter((s) => s.buyer_email).map((s) => [s.buyer_email, s])).values()];

  const winnerSummaryList = winners.map((w) => ({
    prize_place: w.place, prize_description: w.prize, square_number: w.square_number,
  }));

  for (const buyer of uniqueBuyers) {
    const buyerSquareNums = soldSquares
      .filter((s) => s.buyer_email === buyer.buyer_email)
      .map((s) => s.number);

    const buyerWins = buyerSquareNums.filter((n) => winnerNums_set.has(n));

    if (buyerWins.length > 0) {
      // Winner email (one per winning square)
      for (const winningNum of buyerWins) {
        const w = winners.find((x) => x.square_number === winningNum);
        if (!w) continue;
        const tpl = emailDrawResultWinner({
          buyer_name:      buyer.buyer_name ?? 'there',
          campaign_title:  f.title,
          org_name:        f.org,
          winning_square:  winningNum,
          prize_place:     w.place,
          prize_description: w.prize,
          contact_email:   f.contact_email ?? '',
        });
        await sendEmail({ to: buyer.buyer_email!, subject: tpl.subject, text: tpl.text });
      }
    } else {
      // Did not win
      const tpl = emailDrawResultDidNotWin({
        buyer_name:    buyer.buyer_name ?? 'there',
        campaign_title: f.title,
        org_name:      f.org,
        amount_raised: fundsRaised,
        winners:       winnerSummaryList,
      });
      await sendEmail({ to: buyer.buyer_email!, subject: tpl.subject, text: tpl.text });
    }
  }

  return new Response(JSON.stringify({ ok: true, admin: true, organiser: !!f.contact_email, buyers: uniqueBuyers.length }), { status: 200 });
});
