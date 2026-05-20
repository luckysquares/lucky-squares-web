import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function supabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
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
      await db.rpc('admin_gift_square', {
        p_fundraiser_id: fundraiser_id,
        p_square_number: squareNum,
      });
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
      }

      return new Response('ok', { status: 200 });
    }

    // ── Buyer square purchase ─────────────────────────────────────────────────
    if (!square_numbers) {
      return new Response('Missing square_numbers', { status: 400 });
    }

    const squareNums = square_numbers.split(',').map(Number);

    // Claim the squares
    const { error: claimError } = await db.rpc('claim_squares', {
      p_fundraiser_id: fundraiser_id,
      p_square_numbers: squareNums,
      p_buyer_name: buyer_name,
      p_buyer_email: buyer_email,
      p_buyer_phone: buyer_phone || '',
    });

    if (claimError) {
      console.error('claim_squares error:', claimError);
      return new Response('Failed to claim squares', { status: 500 });
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
      .select('title, org, draw_type, draw_date, contact_name')
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
            square_numbers: squareNums.map((n) => `#${n}`).join(', '),
            amount_paid: `$${subtotal.toFixed(2)}`,
            draw_type_description: drawDesc,
            campaign_url: `${appUrl}/f/${fundraiser_id}`,
          },
        }),
      });
    }
  }

  return new Response('ok', { status: 200 });
}
