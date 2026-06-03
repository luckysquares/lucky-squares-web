import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';
import { logException } from '@/lib/logError';

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
    await logException(err, { route: '/api/stripe/webhook', source: 'server', metadata: { type: 'signature_verification_failed' } });
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const { action, fundraiser_id, buyer_name, buyer_email, buyer_phone, square_numbers, subtotal_cents, coupon_code } = session.metadata;

    // ── Org annual membership — must be handled before the fundraiser_id guard ──
    // Org membership checkouts have no fundraiser_id in metadata.
    if (action === 'org_membership' && session.mode === 'subscription') {
      const db          = supabase();
      const userId      = session.metadata.user_id;
      const subId       = session.subscription;
      const customerId  = session.customer;
      const sub         = await stripe.subscriptions.retrieve(subId);
      const memberUntil = new Date(sub.current_period_end * 1000).toISOString();

      await db.from('profiles').update({
        plan:                'org',
        org_subscription_id: subId,
        org_member_until:    memberUntil,
        stripe_customer_id:  customerId,
      }).eq('id', userId);

      return new Response('ok', { status: 200 });
    }

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
        .select('status, grid_size, slug')
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

        const { error: activateError } = await db.from('fundraisers').update({
          status:               'active',
          launched_at:          new Date().toISOString(),
          prize_reserve_cents:  prizeReserveCents,
        }).eq('id', fundraiser_id);

        if (activateError) {
          // Trigger blocked activation (most likely CAMPAIGN_LIMIT_REACHED).
          // Auto-refund the launch fee so the organiser is not charged.
          console.error('[webhook] Campaign activation blocked by DB trigger:', activateError.message, 'fundraiser:', fundraiser_id);
          try {
            await stripe.refunds.create({ payment_intent: session.payment_intent });
            console.log('[webhook] Launch fee auto-refunded for fundraiser:', fundraiser_id);
          } catch (refundErr) {
            console.error('[webhook] Auto-refund failed:', refundErr.message);
          }
          return new Response('ok', { status: 200 });
        }

        // Create one row per square in the squares table so buyers can reserve them.
        // Uses upsert + ignoreDuplicates for idempotency (safe if webhook fires twice).
        const gridSize = existing.grid_size;
        if (gridSize) {
          const squareRows = Array.from({ length: gridSize }, (_, i) => ({
            fundraiser_id,
            number: i + 1,
            status: 'available',
          }));
          await db.from('squares').upsert(squareRows, { onConflict: 'fundraiser_id,number', ignoreDuplicates: true });
        }

        if (coupon_code) {
          await db.rpc('redeem_coupon', { p_code: coupon_code });
        }

        // Fetch campaign details for emails
        const { data: fr } = await db.from('fundraisers').select('title, org, slug, contact_name, contact_email').eq('id', fundraiser_id).single();
        const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';
        const campaignUrl = `${appUrl}/${fr?.slug ?? fundraiser_id}`;
        const txEmail     = (type: string, to: string, data: Record<string, string>) =>
          fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
            body: JSON.stringify({ type, to, data }),
          }).catch(() => {});

        // Email the organiser — your campaign is live
        if (fr?.contact_email) {
          await txEmail('campaign_launched', fr.contact_email, {
            first_name:    (fr.contact_name || 'there').split(' ')[0],
            campaign_title: fr.title || 'Your campaign',
            campaign_url:  campaignUrl,
          });
        }

        // Notify opted-in buyers from previous campaigns
        const { data: followers } = await db.rpc('get_campaign_notification_followers', { p_fundraiser_id: fundraiser_id });
        if (followers?.length) {
          await Promise.all(followers.map((f: { email: string }) =>
            txEmail('campaign_launched_notification', f.email, {
              organiser_name: fr?.org || 'the organiser',
              campaign_title: fr?.title || 'New fundraiser',
              campaign_url:  campaignUrl,
            })
          ));
        }
      }

      return new Response('ok', { status: 200 });
    }

    // ── 50/50 raffle launch fee ──────────────────────────────────────────────
    if (action === 'fifty_fifty_launch') {
      const { campaign_id } = session.metadata;

      if (!campaign_id) {
        return new Response('Missing campaign_id', { status: 400 });
      }

      const { data: existing } = await db
        .from('fifty_fifty_campaigns')
        .select('status')
        .eq('id', campaign_id)
        .single();

      if (existing?.status !== 'active') {
        const { error: activateError } = await db
          .from('fifty_fifty_campaigns')
          .update({ status: 'active', launched_at: new Date().toISOString() })
          .eq('id', campaign_id);

        if (activateError) {
          console.error('[webhook] fifty_fifty_launch activation failed:', activateError.message, 'campaign:', campaign_id);
          try {
            await stripe.refunds.create({ payment_intent: session.payment_intent });
            console.log('[webhook] 50/50 launch fee auto-refunded for campaign:', campaign_id);
          } catch (refundErr) {
            console.error('[webhook] 50/50 launch fee auto-refund failed:', refundErr.message);
          }
        }
      }

      return new Response('ok', { status: 200 });
    }

    // ── 50/50 raffle ticket purchase ─────────────────────────────────────────
    if (action === 'fifty_fifty') {
      const { campaign_id, buyer_name, buyer_email, buyer_phone, quantity } = session.metadata;

      if (!campaign_id || !quantity) {
        return new Response('Missing fifty_fifty metadata', { status: 400 });
      }

      const qty = parseInt(quantity, 10);

      // Fetch campaign to get ticket price
      const { data: campaign } = await db
        .from('fifty_fifty_campaigns')
        .select('ticket_price, stripe_account_id')
        .eq('id', campaign_id)
        .single();

      if (!campaign) {
        console.error('[webhook] fifty_fifty campaign not found:', campaign_id);
        return new Response('ok', { status: 200 });
      }

      const amountPaid = parseFloat(campaign.ticket_price) * qty;

      const { data: ticketResult, error: ticketError } = await db.rpc('reserve_fifty_fifty_tickets', {
        p_campaign_id:              campaign_id,
        p_quantity:                 qty,
        p_buyer_name:               buyer_name,
        p_buyer_email:              buyer_email,
        p_buyer_phone:              buyer_phone || '',
        p_amount_paid:              amountPaid,
        p_payment_method:           'stripe',
        p_stripe_payment_intent_id: session.payment_intent,
      });

      if (ticketError || ticketResult?.error) {
        const msg = ticketResult?.error || ticketError?.message;
        console.error('[webhook] reserve_fifty_fifty_tickets error:', msg);
        // Auto-refund if ticket reservation failed
        try {
          await stripe.refunds.create({ payment_intent: session.payment_intent });
        } catch (refundErr) {
          console.error('[webhook] fifty_fifty auto-refund failed:', refundErr.message);
        }
        return new Response('ok', { status: 200 });
      }

      // Mark ticket as paid
      if (ticketResult?.ticket_id) {
        await db
          .from('fifty_fifty_tickets')
          .update({ payment_status: 'paid' })
          .eq('id', ticketResult.ticket_id);
      }

      // Send confirmation email to buyer
      const ticketNumbers = (ticketResult?.ticket_numbers || [])
        .map((n) => `#${String(n).padStart(3, '0')}`)
        .join(', ');

      // Fetch updated campaign jackpot for confirmation email
      const { data: campaignData } = await db.rpc('get_fifty_fifty_campaign', { p_campaign_id: campaign_id });
      const jackpot = campaignData?.jackpot ? `$${parseFloat(campaignData.jackpot).toFixed(2)}` : '$0.00';

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          type: 'fifty_fifty_ticket_confirmation',
          to: buyer_email,
          data: {
            buyer_name,
            campaign_title:      campaignData?.title || 'Raffle',
            org_name:            '', // 50/50 campaigns don't have an org name field
            ticket_numbers:      ticketNumbers,
            quantity:            qty,
            amount_paid:         amountPaid.toFixed(2),
            jackpot_at_purchase: jackpot,
            campaign_url:        `${appUrl}/raffle/${campaign_id}`,
          },
        }),
      }).catch(() => {});

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
        await logException(refundErr, { route: '/api/stripe/webhook', source: 'server', metadata: { type: 'auto_refund_failed', payment_intent: session.payment_intent } });
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
            await logException(transferErr, { route: '/api/stripe/webhook', source: 'server', metadata: { type: 'transfer_failed', fundraiser_id, transfer_cents: transferCents } });
          }
        }
      }
    }

    // ── Confirmation email to buyer ───────────────────────────────────────────
    const { data: fundraiser } = await db
      .from('fundraisers')
      .select('title, org, draw_type, draw_date, contact_name, contact_email, owner_id, grid_size, price_per_sq, slug')
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
            campaign_url:   `${appUrl}/f/${fundraiser.slug ?? fundraiser_id}`,
          },
        }),
      });

      // Sale notification to organiser (square_sold for standard plans; org_square_sold for org plan)
      const { data: stats } = await db
        .from('fundraiser_stats')
        .select('sold_count')
        .eq('fundraiser_id', fundraiser_id)
        .single();

      const totalSold   = Number(stats?.sold_count ?? 0);
      const isFirstSale = totalSold === squareNums.length;

      if (fundraiser?.contact_email) {
        // Check if the campaign owner is on the org plan
        let isOrgPlan = false;
        if (fundraiser.owner_id) {
          const { data: ownerProfile } = await db
            .from('profiles')
            .select('plan')
            .eq('id', fundraiser.owner_id)
            .single();
          isOrgPlan = ownerProfile?.plan === 'org';
        }

        const amountRaised = (totalSold * parseFloat(fundraiser.price_per_sq || 0)).toFixed(2);
        const txUrl        = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`;
        const txHeaders    = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };

        if (isOrgPlan) {
          // Org plan: send org_square_sold for every sale (first and subsequent)
          await fetch(txUrl, {
            method: 'POST',
            headers: txHeaders,
            body: JSON.stringify({
              type: 'org_square_sold',
              to:   fundraiser.contact_email,
              data: {
                first_name:     (fundraiser.contact_name ?? 'there').split(' ')[0],
                org_name:       fundraiser.org,
                campaign_title: fundraiser.title,
                buyer_name,
                square_number:  squareNums[0],
                sold_count:     totalSold,
                grid_size:      fundraiser.grid_size,
                amount_raised:  amountRaised,
                is_first:       isFirstSale,
              },
            }),
          }).catch(() => {});
        } else if (isFirstSale) {
          // Standard plan: send square_sold only on the first sale
          await fetch(txUrl, {
            method: 'POST',
            headers: txHeaders,
            body: JSON.stringify({
              type: 'square_sold',
              to:   fundraiser.contact_email,
              data: {
                first_name:     (fundraiser.contact_name ?? 'there').split(' ')[0],
                campaign_title: fundraiser.title,
                org_name:       fundraiser.org,
                buyer_name,
                square_number:  squareNums[0],
                sold_count:     totalSold,
                grid_size:      fundraiser.grid_size,
                amount_raised:  amountRaised,
                is_first:       true,
              },
            }),
          }).catch(() => {});
        }
      }
    }
  }

  // ── Org membership renewal (annual) ──────────────────────────────────────
  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
      const db = supabase();
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription);
      const memberUntil  = new Date(subscription.current_period_end * 1000).toISOString();

      await db.from('profiles')
        .update({ org_member_until: memberUntil })
        .eq('org_subscription_id', invoice.subscription);
    }
    return new Response('ok', { status: 200 });
  }

  // ── Org membership cancelled (fires at end of paid period) ────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    if (subscription.metadata?.action === 'org_membership') {
      const db = supabase();
      await db.from('profiles')
        .update({ plan: 'casual', org_subscription_id: null, org_member_until: null })
        .eq('org_subscription_id', subscription.id);
    }
    return new Response('ok', { status: 200 });
  }

  return new Response('ok', { status: 200 });
}
