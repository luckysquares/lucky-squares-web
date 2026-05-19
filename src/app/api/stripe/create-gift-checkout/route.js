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
  try {
    const { fundraiser_id, square_number } = await req.json();

    if (!fundraiser_id || !square_number) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = supabase();
    const { data: fundraiser, error } = await db
      .from('fundraisers')
      .select('title, price_per_sq')
      .eq('id', fundraiser_id)
      .single();

    if (error || !fundraiser) return Response.json({ error: 'Fundraiser not found' }, { status: 404 });

    const price = parseFloat(fundraiser.price_per_sq);
    const txFee = price * 0.017 + 0.30;
    const total = Math.round((price + txFee) * 100);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `${fundraiser.title} — Gift Square #${square_number}`,
              description: `Sponsored square for ${fundraiser.title}`,
            },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        action: 'admin_gift',
        fundraiser_id,
        square_number: String(square_number),
      },
      success_url: `${appUrl}/admin/campaigns?gift_success=1`,
      cancel_url: `${appUrl}/admin/campaigns`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-gift-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
