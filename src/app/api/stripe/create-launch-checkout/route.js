import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { fundraiser_id, final_fee, coupon_code } = await req.json();

    if (!fundraiser_id || final_fee == null) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';
    const amountCents = Math.round(final_fee * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: 'Lucky Squares — Platform Fee',
              description: 'One-off fee to launch your fundraiser campaign.',
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        action: 'launch',
        fundraiser_id,
        coupon_code: coupon_code || '',
      },
      success_url: `${appUrl}/fundraise?launch_success=1&fid=${fundraiser_id}`,
      cancel_url: `${appUrl}/fundraise`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-launch-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
