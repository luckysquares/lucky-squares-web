import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// The platform launch fee in AUD. Single source of truth — never accepted from the client.
const PLATFORM_FEE_AUD = 19;

export async function POST(req) {
  try {
    const body = await req.json();
    const fundraiser_id = body?.fundraiser_id;
    const coupon_code   = body?.coupon_code ? String(body.coupon_code).trim().toUpperCase().slice(0, 32) : null;

    if (!fundraiser_id) {
      return Response.json({ error: 'fundraiser_id is required' }, { status: 400 });
    }

    const db = supabase();

    // Verify the fundraiser exists and hasn't already been activated.
    // Using the admin client so this check can't be bypassed by RLS.
    const { data: fundraiser, error: frError } = await db
      .from('fundraisers')
      .select('id, status, grid_size')
      .eq('id', fundraiser_id)
      .single();

    if (frError || !fundraiser) {
      return Response.json({ error: 'Fundraiser not found' }, { status: 404 });
    }

    if (fundraiser.status === 'active') {
      // Idempotency: already launched, nothing to charge.
      return Response.json({ error: 'Campaign is already active' }, { status: 409 });
    }

    // ── Fee calculation (server-side only) ──────────────────────────────────
    // The base fee is always $19 regardless of grid size.
    // If a coupon code was provided, validate it against the database and apply the
    // discount. The client never supplies the final amount — it is always derived here.
    let finalFee          = PLATFORM_FEE_AUD;
    let appliedCouponCode = null;

    if (coupon_code) {
      const { data: couponRows } = await db.rpc('validate_coupon', { p_code: coupon_code });
      const coupon = Array.isArray(couponRows) ? couponRows[0] : couponRows;

      if (coupon?.valid) {
        if (coupon.discount_type === 'percent') {
          finalFee = Math.max(0, PLATFORM_FEE_AUD * (1 - Number(coupon.discount_value) / 100));
        } else {
          // fixed discount
          finalFee = Math.max(0, PLATFORM_FEE_AUD - Number(coupon.discount_value));
        }
        appliedCouponCode = coupon_code;
      }
      // Invalid or expired coupons are silently ignored — the organiser sees
      // the standard fee. We do not reveal whether a code exists.
    }

    // Guard: a zero-cost launch should use the free launch path on the client,
    // which calls onComplete() directly without touching Stripe.
    // If we somehow receive a request that results in $0, reject it rather than
    // creating a $0 Stripe session (which would activate the campaign for free
    // via the webhook without explicit client-side coupon redemption).
    if (finalFee <= 0) {
      return Response.json({ error: 'Zero-cost campaigns must use the free launch path' }, { status: 400 });
    }

    const amountCents = Math.round(finalFee * 100);
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name:        'Lucky Squares — Campaign Fee',
              description: 'One-off fee to launch your fundraiser campaign.',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        action:       'launch',
        fundraiser_id,
        coupon_code:  appliedCouponCode || '',
      },
      success_url: `${appUrl}/fundraise?launch_success=1&fid=${fundraiser_id}`,
      cancel_url:  `${appUrl}/fundraise`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-launch-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
