import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
import { sendEmail, ADMIN_EMAIL } from '../_shared/resend.ts';
import {
  emailDrawCompleteOrganiser,
  emailDrawResultWinner,
  emailDrawResultWinnerClaim,
  emailDrawResultDidNotWin,
  emailFirstCampaignTips,
  emailTestimonialInvite,
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

  // Fetch campaign details (including idempotency flag).
  const { data: f, error } = await supabase
    .from('fundraisers')
    .select(`
      id, title, org, contact_name, contact_email, contact_phone,
      payment_method, grid_size, price_per_sq,
      bank_account_name, bank_bsb, bank_account,
      stripe_account_id, owner_id,
      winner_square_num, winner_square_nums,
      notifications_sent_at
    `)
    .eq('id', fundraiserId)
    .single();

  if (error || !f) {
    return new Response('Campaign not found', { status: 404 });
  }

  // Idempotency guard: if notifications were already sent, return immediately.
  // This prevents anyone with a public fundraiser_id from triggering repeated
  // emails to all buyers by calling this endpoint multiple times.
  if (f.notifications_sent_at) {
    console.log(`[draw-notification] Notifications already sent for ${fundraiserId} at ${f.notifications_sent_at} — skipping.`);
    return new Response(
      JSON.stringify({ ok: true, skipped: true, reason: 'already_sent' }),
      { status: 200 },
    );
  }

  // Fetch sold squares
  const { data: squares } = await supabase
    .from('squares')
    .select('number, buyer_name, buyer_email')
    .eq('fundraiser_id', fundraiserId)
    .eq('status', 'sold');

  const soldSquares      = squares ?? [];
  const soldCount        = soldSquares.length;
  const fundsRaised      = (soldCount * parseFloat(f.price_per_sq)).toFixed(2);
  const isStripe         = f.payment_method === 'stripe';

  // ── Automatic Stripe payout (Stripe campaigns only) ──────────────────────
  //
  // With the split-at-purchase model, non-prize funds are already transferred to
  // the organiser's connected account in real time as squares are sold.
  //
  // At draw time we transfer the full prize reserve to the organiser. They are
  // responsible for paying winners directly from their connected account.
  // Lucky Squares does not handle winner payouts.
  //
  // IDEMPOTENCY: The payout_queue PENDING sentinel prevents double-transfer if
  // this function is called more than once for the same fundraiser.

  let transferResult: { ok: boolean; transferId?: string; error?: string; skipped?: boolean } = { ok: true };

  // Fetch prize reserve details and prizes to calculate what's owed to winners vs organiser.
  const { data: fReserve } = await supabase
    .from('fundraisers')
    .select('prize_reserve_cents, prize_reserve_held_cents')
    .eq('id', fundraiserId)
    .single();

  const prizeReserveHeld = fReserve?.prize_reserve_held_cents ?? 0;

  // Resolve winner square numbers up front (needed for prize matching below).
  const winnerNums: number[] = Array.isArray(f.winner_square_nums)
    ? f.winner_square_nums
    : f.winner_square_num != null ? [f.winner_square_num] : [];

  // Fetch all prizes to work out cash prize totals for the admin email summary.
  // The organiser is responsible for paying winners directly from their connected account,
  // so the full prize reserve held on the platform is transferred to them at draw time.
  const { data: allPrizes } = await supabase
    .from('prizes')
    .select('value, donated, sort_order')
    .eq('fundraiser_id', fundraiserId)
    .order('sort_order');

  const winnerPrizes = (allPrizes ?? []).slice(0, winnerNums.length);
  const cashPrizesTotalCents = winnerPrizes.reduce((sum, p) => {
    if (p.donated) return sum;
    const val = parseFloat((p.value || '').replace(/[^0-9.]/g, '')) || 0;
    return sum + Math.round(val * 100);
  }, 0);

  // Transfer the full prize reserve to the organiser. They are responsible for
  // paying winners directly. cashPrizesTotalCents is informational only (admin email).
  const prizeReserveToTransferCents = prizeReserveHeld;

  if (isStripe && f.stripe_account_id && prizeReserveToTransferCents > 0) {
    // Step 1: Atomically claim the payout slot.
    const { data: claimed } = await supabase
      .from('payout_queue')
      .update({ stripe_transfer_id: 'PENDING' })
      .eq('fundraiser_id', fundraiserId)
      .is('stripe_transfer_id', null)
      .select('id');

    if (!claimed || claimed.length === 0) {
      const { data: existing } = await supabase
        .from('payout_queue')
        .select('stripe_transfer_id')
        .eq('fundraiser_id', fundraiserId)
        .single();

      const existingId = existing?.stripe_transfer_id;

      if (existingId && existingId !== 'PENDING' && existingId !== 'FAILED') {
        console.log(`[draw-notification] Prize reserve transfer already processed for ${fundraiserId}: ${existingId}`);
        transferResult = { ok: true, transferId: existingId, skipped: true };
      } else if (existingId === 'PENDING') {
        console.warn(`[draw-notification] Transfer already in progress for ${fundraiserId} — skipping.`);
        transferResult = { ok: true, skipped: true };
      } else {
        console.warn(`[draw-notification] No payout_queue row for ${fundraiserId} — proceeding without idempotency anchor.`);
      }
    }

    if (!transferResult.skipped) {
      try {
        const transfer = await stripe.transfers.create({
          amount:         prizeReserveToTransferCents,
          currency:       'aud',
          destination:    f.stripe_account_id,
          transfer_group: fundraiserId,
          description:    `Prize reserve for ${f.title} — draw complete`,
          metadata: {
            fundraiser_id:          fundraiserId,
            type:                   'prize_reserve_full',
            prize_reserve_held:     String(prizeReserveHeld),
            cash_prizes_total:      String(cashPrizesTotalCents),
          },
        });

        transferResult = { ok: true, transferId: transfer.id };

        await supabase
          .from('payout_queue')
          .update({ stripe_transfer_id: transfer.id, status: 'processed', processed_at: new Date().toISOString() })
          .eq('fundraiser_id', fundraiserId);

      } catch (err: any) {
        console.error('[draw-notification] Stripe transfer failed:', err);
        transferResult = { ok: false, error: err?.message ?? 'Unknown error' };

        await supabase
          .from('payout_queue')
          .update({ stripe_transfer_id: 'FAILED' })
          .eq('fundraiser_id', fundraiserId)
          .eq('stripe_transfer_id', 'PENDING');
      }
    }
  }

  // Re-use allPrizes fetched above (includes place/description for email templates).
  // Filter to those with descriptions for the email display list.
  const { data: prizesWithDesc } = await supabase
    .from('prizes')
    .select('place, description, value, sort_order')
    .eq('fundraiser_id', fundraiserId)
    .order('sort_order');

  const prizeList = (prizesWithDesc ?? []).filter((p) => p.description);

  // Map winner square numbers to buyer details
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

  const firstName = (f.contact_name ?? 'there').split(' ')[0];

  // 1. Email admin (internal notification)
  const winnerSummary = winners.map((w) => `#${w.square_number} (${w.buyer_name})`).join(', ');
  const paymentLabel  = ({
    stripe:       'Online card (Stripe)',
    bank:         'Bank transfer',
    bank_inperson: 'In person + bank transfer',
    inperson:     'In person',
  } as Record<string, string>)[f.payment_method] ?? f.payment_method;

  // Winner payout summary (cash prizes that need to be paid from the held reserve)
  const winnerPayoutLines = winners
    .map((w, i) => {
      const p = winnerPrizes[i];
      if (!p || p.donated) return null;
      const val = (parseFloat((p.value || '').replace(/[^0-9.]/g, '')) || 0).toFixed(2);
      return `  · ${w.place}: ${w.buyer_name} <${w.buyer_email ?? 'no email'}> — $${val} (square #${w.square_number})`;
    })
    .filter(Boolean);

  let payoutLine: string;
  if (isStripe) {
    const reserveHeldDollars = (prizeReserveHeld / 100).toFixed(2);
    const cashPrizesDollars  = (cashPrizesTotalCents / 100).toFixed(2);

    const transferLine = prizeReserveToTransferCents > 0
      ? transferResult.skipped
        ? `Prize reserve ($${reserveHeldDollars}) already transferred to organiser. No action required.`
        : transferResult.ok
          ? `Prize reserve ($${reserveHeldDollars}) transferred to organiser (${transferResult.transferId}).`
          : `ACTION REQUIRED: prize reserve transfer FAILED ($${reserveHeldDollars}). Error: ${transferResult.error}\nTo retry: set payout_queue.stripe_transfer_id = NULL for fundraiser_id = '${fundraiserId}'.`
      : `No prize reserve to transfer (nothing held on platform).`;

    const winnerInfoBlock = winnerPayoutLines.length > 0
      ? `The organiser is responsible for paying the following winners from their connected account:\n${winnerPayoutLines.join('\n')}\n\nTotal cash prizes: $${cashPrizesDollars}\n\nWinners will be asked to supply bank details via a claim link. The organiser will receive their details by email.`
      : `All prizes are donated items (no cash payouts required).`;

    payoutLine = [transferLine, '', winnerInfoBlock].join('\n');
  } else {
    payoutLine = `No Stripe payout needed (organiser collects directly).`;
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

  const needsAction = isStripe && !transferResult.ok && !transferResult.skipped;
  const adminSubject = needsAction
    ? `ACTION REQUIRED: Draw complete — ${f.title}`
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

    // 2a. First-campaign tips: send once after the organiser's very first draw.
    if (f.owner_id) {
      const { count: drawnCount } = await supabase
        .from('fundraisers')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', f.owner_id)
        .eq('status', 'drawn');

      if (drawnCount === 1) {
        // This is (or just became) their first completed draw.
        const prizeSummary = prizeList.length > 0
          ? prizeList[0].description ?? 'a prize'
          : 'a prize';
        const campaignUrl = `${Deno.env.get('APP_URL') ?? 'https://luckysquares.com.au'}/${f.slug ?? fundraiserId}`;
        const tipsTpl = emailFirstCampaignTips({
          first_name:     firstName,
          campaign_title: f.title,
          org_name:       f.org ?? '',
          price_per_sq:   String(f.price_per_sq),
          prize_summary:  prizeSummary,
          campaign_url:   campaignUrl,
        });
        await sendEmail({ to: f.contact_email, subject: tipsTpl.subject, text: tipsTpl.text });
      }
    }
  }

  // 3. Email each buyer (winner or no-win)
  const appUrl            = Deno.env.get('APP_URL') ?? 'https://luckysquares.com.au';
  const winnerNums_set    = new Set(winnerNums);
  const uniqueBuyers      = [...new Map(soldSquares.filter((s) => s.buyer_email).map((s) => [s.buyer_email, s])).values()];
  const winnerSummaryList = winners.map((w) => ({
    prize_place: w.place, prize_description: w.prize, square_number: w.square_number,
  }));

  for (const buyer of uniqueBuyers) {
    const buyerSquareNums = soldSquares
      .filter((s) => s.buyer_email === buyer.buyer_email)
      .map((s) => s.number);

    const buyerWins = buyerSquareNums.filter((n) => winnerNums_set.has(n));

    if (buyerWins.length > 0) {
      for (const winningNum of buyerWins) {
        const wIdx = winnerNums.indexOf(winningNum);
        const w    = winners.find((x) => x.square_number === winningNum);
        if (!w) continue;

        // Stripe campaigns with a non-donated cash prize: collect bank details via claim link.
        // All other cases: standard winner email (organiser contacts them directly).
        const isCashPrize = isStripe && wIdx >= 0 && !winnerPrizes[wIdx]?.donated;

        if (isCashPrize) {
          // Create a prize_claim row — token is auto-generated by the DB default.
          const { data: claim, error: claimErr } = await supabase
            .from('prize_claims')
            .insert({
              fundraiser_id:        fundraiserId,
              winner_square_number: winningNum,
              buyer_name:           w.buyer_name,
              buyer_email:          w.buyer_email ?? buyer.buyer_email,
              place:                w.place,
              prize_description:    w.prize,
              campaign_title:       f.title,
              org_name:             f.org,
              contact_email:        f.contact_email ?? '',
            })
            .select('token')
            .single();

          if (claimErr) {
            console.error('[draw-notification] Failed to create prize_claim:', claimErr);
          }

          if (claim?.token) {
            const claimUrl = `${appUrl}/claim-prize/${claim.token}`;
            const tpl = emailDrawResultWinnerClaim({
              buyer_name:        buyer.buyer_name ?? 'there',
              campaign_title:    f.title,
              org_name:          f.org,
              winning_square:    winningNum,
              prize_place:       w.place,
              prize_description: w.prize,
              contact_email:     f.contact_email ?? '',
              claim_url:         claimUrl,
            });
            await sendEmail({ to: buyer.buyer_email!, subject: tpl.subject, text: tpl.text });
          } else {
            // Fallback: send standard winner email so the winner is not left without notice.
            const tpl = emailDrawResultWinner({
              buyer_name:        buyer.buyer_name ?? 'there',
              campaign_title:    f.title,
              org_name:          f.org,
              winning_square:    winningNum,
              prize_place:       w.place,
              prize_description: w.prize,
              contact_email:     f.contact_email ?? '',
            });
            await sendEmail({ to: buyer.buyer_email!, subject: tpl.subject, text: tpl.text });
          }
        } else {
          // Non-Stripe, or donated prize: organiser arranges prize delivery directly.
          const tpl = emailDrawResultWinner({
            buyer_name:        buyer.buyer_name ?? 'there',
            campaign_title:    f.title,
            org_name:          f.org,
            winning_square:    winningNum,
            prize_place:       w.place,
            prize_description: w.prize,
            contact_email:     f.contact_email ?? '',
          });
          await sendEmail({ to: buyer.buyer_email!, subject: tpl.subject, text: tpl.text });
        }
      }
    } else {
      const tpl = emailDrawResultDidNotWin({
        buyer_name:     buyer.buyer_name ?? 'there',
        campaign_title: f.title,
        org_name:       f.org,
        amount_raised:  fundsRaised,
        winners:        winnerSummaryList,
      });
      await sendEmail({ to: buyer.buyer_email!, subject: tpl.subject, text: tpl.text });
    }
  }

  // Send testimonial invite to organiser
  if (f.contact_email) {
    const { data: testimonial } = await supabase
      .from('testimonials')
      .insert({
        fundraiser_id:  fundraiserId,
        organiser_name: f.contact_name,
        org_name:       f.org,
        contact_email:  f.contact_email,
      })
      .select('token')
      .single();

    if (testimonial?.token) {
      const appUrl = Deno.env.get('APP_URL') ?? 'https://luckysquares.com.au';
      const tpl = emailTestimonialInvite({
        first_name:      firstName,
        campaign_title:  f.title,
        org_name:        f.org,
        amount_raised:   `$${fundsRaised}`,
        testimonial_url: `${appUrl}/testimonial/${testimonial.token}`,
      });
      await sendEmail({ to: f.contact_email, subject: tpl.subject, text: tpl.text });
    }
  }

  // Stamp the idempotency flag so repeat calls are no-ops.
  await supabase
    .from('fundraisers')
    .update({ notifications_sent_at: new Date().toISOString() })
    .eq('id', fundraiserId);

  return new Response(
    JSON.stringify({ ok: true, admin: true, organiser: !!f.contact_email, buyers: uniqueBuyers.length, transferResult }),
    { status: 200 },
  );
});
