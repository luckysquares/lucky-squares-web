import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Parse a prize value string like "$1,000" or "500.00" into cents.
function prizeValueToCents(value) {
  const n = parseFloat((value || '').replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : Math.round(n * 100);
}

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { action, fundraiser_id, buyer_name, buyer_email, buyer_phone, square_numbers, subtotal_cents, coupon_code } = session.metadata;

    if (!fundraiser_id) {
      return new Response('Missing fundraiser_id', { status: 400 });
    }

    const db = supabase();

    // ── Admin gift square payment ─────────────────────────────────────────────
    if (action === 'admin_gift') {
      const squareNum = parseInt(session.metadata.square_number);
      const { error: giftError } = await db.rpc('admin_gift_square', {
        p_fundraiser_id: fundraiser_id,
        p_square_number: squareNum,
      });
      if (giftError) {
        console.error('admin_gift_square error:', giftError);
        return new Response('Failed to gift square', { status: 500 });
      }
      await db.from('squares')
        .update({ payment_intent_id: session.payment_intent })
        .eq('fundraiser_id', fundraiser_id)
        .eq('number', squareNum);
      return new Response('ok', { status: 200 });
    }

    // ── Platform launch fee payment ───────────────────────────────────────────
    if (action === 'launch') {
      const { data: existing } = await db
        .from('fundraisers')
        .select('status')
        .eq('id', fundraiser_id)
        .single();

      if (existing?.status !== 'active') {
        // Calculate prize reserve: sum of non-donated cash prizes, locked at launch.
        // Organisers cannot change prize values once a campaign is live.
        const { data: prizes } = await db
          .from('prizes')
          .select('value, donated')
          .eq('fundraiser_id', fundraiser_id);

        const prizeReserveCents = (prizes || [])
          .filter((p) => !p.donated)
          .reduce((sum, p) => sum + prizeValueToCents(p.value), 0);

        await db.from('fundraisers').update({
          status:               'active',
          launched_at:          new Date().toISOString(),
          prize_reserve_cents:  prizeReserveCents,
        }).eq('id', fundraiser_id);

        if (coupon_code) {
          await db.rpc('redeem_coupon', { p_code: coupon_code });
        }

        // Notify opted-in buyers from previous campaigns
        const { data: followers } = await db.rpc('get_campaign_notification_followers', { p_fundraiser_id: fundraiser_id });
        if (followers?.length) {
          const { data: fr } = await db.from('fundraisers').select('title, org').eq('id', fundraiser_id).single();
          const campaignUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au'}/f/${fundraiser_id}`;
          await Promise.all(followers.map((f) =>
            fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
              body: JSON.stringify({ type: 'campaign_launched_notification', to: f.email, data: { organiser_name: fr?.org || 'the organiser', campaign_title: fr?.title || 'New fundraiser', campaign_url: campaignUrl } }),
            })
          ));
        }
      }

      return new Response('ok', { status: 200 });
    }

    // ── Buyer square purchase ─────────────────────────────────────────────────
    if (!square_numbers) {
      return new Response('Missing square_numbers', { status: 400 });
    }

    const squareNums = square_numbers.split(',').map(Number);

    // Claim the squares atomically (FIND-008: only reserved squares can be claimed).
    const { data: claimCount, error: claimError } = await db.rpc('claim_squares', {
      p_fundraiser_id:  fundraiser_id,
      p_square_numbers: squareNums,
      p_buyer_name:     buyer_name,
      p_buyer_email:    buyer_email,
      p_buyer_phone:    buyer_phone || '',
    });

    if (claimError) {
      console.error('claim_squares error:', claimError);
      return new Response('Failed to claim squares', { status: 500 });
    }

    // FIND-001: Double-payment guard — auto-refund if squares already sold.
    if (typeof claimCount === 'number' && claimCount < squareNums.length) {
      console.error(
        `[webhook] Double-payment detected — fundraiser ${fundraiser_id}: ` +
        `expected ${squareNums.length} squares, claimed ${claimCount}. ` +
        `Auto-refunding ${session.payment_intent}.`,
      );
      try {
        await stripe.refunds.create({ payment_intent: session.payment_intent });
      } catch (refundErr) {
        console.error('[webhook] Auto-refund failed — manual action required:', refundErr);
      }
      return new Response('ok', { status: 200 });
    }

    // Mark squares as paid and record payment_intent_id for audit trail.
    await db
      .from('squares')
      .update({ paid: true, payment_intent_id: session.payment_intent })
      .eq('fundraiser_id', fundraiser_id)
      .in('number', squareNums)
      .eq('buyer_email', buyer_email);

    // ── Prize reserve split + immediate organiser transfer ────────────────────
    // The buyer paid: subtotal (square revenue) + tx fee on top.
    // Stripe's fee is covered by the tx fee the buyer paid — so subtotal_cents
    // is clean revenue that hits the platform.
    //
    // claim_prize_reserve atomically works out how much of this payment needs to
    // stay on the platform (prize reserve top-up) vs can go to the organiser now.
    const subtotalCents = parseInt(subtotal_cents || '0');

    const { data: fundraiserData } = await db
      .from('fundraisers')
      .select('stripe_account_id, prize_reserve_cents')
      .eq('id', fundraiser_id)
      .single();

    if (fundraiserData?.stripe_account_id) {
      const { data: reserve, error: reserveErr } = await db.rpc('claim_prize_reserve', {
        p_fundraiser_id:  fundraiser_id,
        p_subtotal_cents: subtotalCents,
      });

      if (reserveErr) {
        console.error('[webhook] claim_prize_reserve error:', reserveErr.message);
        // Money is safe on platform — continue without the transfer.
      } else {
        const transferCents = reserve?.[0]?.transfer_cents ?? 0;
        const holdCents     = reserve?.[0]?.hold_cents     ?? subtotalCents;

        if (transferCents > 0) {
          try {
            await stripe.transfers.create({
              amount:         transferCents,
              currency:       'aud',
              destination:    fundraiserData.stripe_account_id,
              transfer_group: fundraiser_id,
              metadata: {
                fundraiser_id,
                type:             'square_proceeds',
                payment_intent:   session.payment_intent,
                held_for_prizes:  String(holdCents),
              },
            });
          } catch (transferErr) {
            // Transfer failure is not fatal — funds are safe on the platform.
            // Admin will see the gap between payout_queue and transfers at draw time.
            console.error('[webhook] Organiser transfer failed:', transferErr.message,
              `— ${transferCents}c will need manual transfer for fundraiser ${fundraiser_id}`);
          }
        }
      }
    }

    // ── Confirmation email to buyer ───────────────────────────────────────────
    const { data: fundraiser } = await db
      .from('fundraisers')
      .select('title, org, draw_type, draw_date, contact_name, contact_email')
      .eq('id', fundraiser_id)
      .single();

    if (fundraiser) {
      const subtotal = subtotalCents / 100;
      const drawDesc = fundraiser.draw_type === 'auto' && fundraiser.draw_date
        ? `The draw will take place on ${new Date(fundraiser.draw_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`
        : 'The organiser will announce the draw date soon.';

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'square_purchase_confirmation',
          to: buyer_email,
          data: {
            buyer_name,
            campaign_title: fundraiser.title,
            org_name:       fundraiser.org,
            square_numbers: squareNums.join(', '),
            amount_paid:    subtotal.toFixed(2),
            draw_type_description: drawDesc,
            campaign_url:   `${appUrl}/f/${fundraiser_id}`,
          },
        }),
      });

      // First-sale notification to organiser
      const { data: stats } = await db
        .from('fundraiser_stats')
        .select('sold_count')
        .eq('fundraiser_id', fundraiser_id)
        .single();

      const totalSold   = Number(stats?.sold_count ?? 0);
      const isFirstSale = totalSold === squareNums.length;

      if (isFirstSale && fundraiser?.contact_email) {
        const { data: fullFundraiser } = await db
          .from('fundraisers')
          .select('contact_email, contact_name, grid_size, price_per_sq')
          .eq('id', fundraiser_id)
          .single();

        if (fullFundraiser?.contact_email) {
          const amountRaised = (totalSold * parseFloat(fullFundraiser.price_per_sq || 0)).toFixed(2);
          await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({
              type: 'square_sold',
              to:   fullFundraiser.contact_email,
              data: {
                first_name:     (fullFundraiser.contact_name ?? 'there').split(' ')[0],
                campaign_title: fundraiser.title,
                org_name:       fundraiser.org,
                buyer_name,
                square_number:  squareNums[0],
                sold_count:     totalSold,
                grid_size:      fullFundraiser.grid_size,
                amount_raised:  amountRaised,
                is_first:       true,
              },
            }),
          }).catch(() => {});
        }
      }
    }
  }

  return new Response('ok', { status: 200 });
}
