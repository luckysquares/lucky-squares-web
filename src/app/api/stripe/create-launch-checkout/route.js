import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// The platform launch fee in AUD. Single source of truth — never accepted from the client.
const PLATFORM_FEE_AUD = 19;

export async function POST(req) {
  try {
    // Authentication required — prevents unauthenticated parties from creating
    // checkout sessions (and thus activating) any fundraiser they can guess the ID of.
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
    });
    if (!userRes.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: userId } = await userRes.json();

    const body = await req.json();
    const fundraiser_id = body?.fundraiser_id;
    const coupon_code   = body?.coupon_code ? String(body.coupon_code).trim().toUpperCase().slice(0, 32) : null;

    if (!fundraiser_id) {
      return Response.json({ error: 'fundraiser_id is required' }, { status: 400 });
    }

    const db = supabase();

    // Verify the fundraiser exists, belongs to this user, and hasn't already been activated.
    const { data: fundraiser, error: frError } = await db
      .from('fundraisers')
      .select('id, status, grid_size, owner_id')
      .eq('id', fundraiser_id)
      .single();

    if (frError || !fundraiser) {
      return Response.json({ error: 'Fundraiser not found' }, { status: 404 });
    }

    if (fundraiser.owner_id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
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
          finalFee = Math.max(0, PLATFORM_FEE_AUD - Number(coupon.discount_value));
        }
        appliedCouponCode = coupon_code;
      } else {
        // The coupon was invalid or expired — tell the client so they can
        // show an error rather than silently charging the full fee.
        return Response.json({ error: 'COUPON_INVALID' }, { status: 422 });
      }
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
