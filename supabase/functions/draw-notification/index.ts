import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { sendEmail, ADMIN_EMAIL } from '../_shared/resend.ts';
import {
  emailDrawCompleteOrganiser,
  emailDrawResultWinner,
  emailDrawResultDidNotWin,
  emailDrawMilestone,
} from '../_shared/templates.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

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

  const soldSquares = squares ?? [];
  const soldCount   = soldSquares.length;
  const fundsRaised = (soldCount * parseFloat(f.price_per_sq)).toFixed(2);

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
  const isStripe   = f.payment_method === 'stripe';

  // 1. Email admin (internal notification)
  const winnerSummary = winners.map((w) => `#${w.square_number} (${w.buyer_name})`).join(', ');
  const paymentLabel  = { stripe: 'Online card (Stripe)', bank: 'Bank transfer', bank_inperson: 'In person + bank transfer', inperson: 'In person' }[f.payment_method as string] ?? f.payment_method;
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
    `Winning square(s): #${winnerNums.join(', ')}`,
    isStripe ? `\nACTION REQUIRED: transfer net funds to organiser after verifying draw.` : `\nNo payout action needed (organiser collects directly).`,
    (f.bank_bsb || f.bank_account) ? `\nOrganiser bank: ${f.bank_account_name ?? ''} | BSB: ${f.bank_bsb ?? ''} | Acct: ${f.bank_account ?? ''}` : '',
    ``,
    `Admin portal: https://luckysquares.com.au/admin/campaigns`,
  ].filter((l) => l !== undefined).join('\n');

  await sendEmail({
    to:      ADMIN_EMAIL,
    subject: isStripe ? `ACTION REQUIRED: Draw complete, payout needed — ${f.title}` : `Draw complete: ${f.title}`,
    text:    adminBody,
  });

  // 2. Email organiser (draw complete)
  if (f.contact_email) {
    const tpl = emailDrawCompleteOrganiser({
      first_name:     firstName,
      campaign_title: f.title,
      org_name:       f.org,
      amount_raised:  fundsRaised,
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

  // 4. Draw milestone email to organiser (celebratory wrap-up)
  if (f.contact_email) {
    const tpl = emailDrawMilestone({
      first_name:     firstName,
      campaign_title: f.title,
      sold_count:     soldCount,
      grid_size:      f.grid_size,
      amount_raised:  fundsRaised,
      org_name:       f.org,
      winner_summary: winnerSummary,
    });
    // Send after a short delay so organiser gets draw_complete first
    await new Promise((r) => setTimeout(r, 2000));
    await sendEmail({ to: f.contact_email, subject: tpl.subject, text: tpl.text });
  }

  return new Response(JSON.stringify({ ok: true, admin: true, organiser: !!f.contact_email, buyers: uniqueBuyers.length }), { status: 200 });
});
