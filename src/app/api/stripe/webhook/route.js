import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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
      // Store payment_intent_id so cancellation refund loop can return Lucky Squares' money
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
        await db.from('fundraisers').update({
          status: 'active',
          launched_at: new Date().toISOString(),
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

    // Claim the squares.
    // FIND-008: claim_squares now returns INTEGER (count of squares actually claimed)
    // and only updates squares with status = 'reserved'. If a square was already
    // 'sold', it is silently skipped and not counted.
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

    // FIND-001: Double-payment guard.
    // If fewer squares were claimed than requested, some were already 'sold' by a
    // prior payment (race condition at checkout creation time). Issue an automatic
    // full refund for this duplicate payment and return 200 so Stripe stops retrying.
    // The first buyer's payment and square ownership are preserved intact.
    if (typeof claimCount === 'number' && claimCount < squareNums.length) {
      console.error(
        `[webhook] Double-payment detected — fundraiser ${fundraiser_id}: ` +
        `expected to claim ${squareNums.length} squares, got ${claimCount}. ` +
        `Auto-refunding payment_intent ${session.payment_intent}.`,
      );
      try {
        await stripe.refunds.create({ payment_intent: session.payment_intent });
      } catch (refundErr) {
        console.error('[webhook] Auto-refund failed — manual action required:', refundErr);
        // Return 200 regardless so Stripe does not retry. Manual refund needed.
      }
      return new Response('ok', { status: 200 });
    }

    // Mark squares as paid and record the Stripe payment_intent_id for audit
    await db
      .from('squares')
      .update({ paid: true, payment_intent_id: session.payment_intent })
      .eq('fundraiser_id', fundraiser_id)
      .in('number', squareNums)
      .eq('buyer_email', buyer_email);

    // Fetch fundraiser details for email
    const { data: fundraiser } = await db
      .from('fundraisers')
      .select('title, org, draw_type, draw_date, contact_name, contact_email')
      .eq('id', fundraiser_id)
      .single();

    // Send confirmation email
    if (fundraiser) {
      const subtotal = parseInt(subtotal_cents || 0) / 100;
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
            org_name: fundraiser.org,
            square_numbers: squareNums.join(', '),
            amount_paid: subtotal.toFixed(2),
            draw_type_description: drawDesc,
            campaign_url: `${appUrl}/f/${fundraiser_id}`,
          },
        }),
      });

      // First-sale notification to organiser
      const { data: stats } = await db
        .from('fundraiser_stats')
        .select('sold_count')
        .eq('fundraiser_id', fundraiser_id)
        .single();

      const totalSold = Number(stats?.sold_count ?? 0);
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
              to: fullFundraiser.contact_email,
              data: {
                first_name: (fullFundraiser.contact_name ?? 'there').split(' ')[0],
                campaign_title: fundraiser.title,
                org_name: fundraiser.org,
                buyer_name: buyer_name,
                square_number: squareNums[0],
                sold_count: totalSold,
                grid_size: fullFundraiser.grid_size,
                amount_raised: amountRaised,
                is_first: true,
              },
            }),
          }).catch(() => {});
        }
      }
    }
  }

  return new Response('ok', { status: 200 });
}
