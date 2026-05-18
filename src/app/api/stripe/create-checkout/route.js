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
    const { fundraiser_id, square_numbers, buyer_name, buyer_email, buyer_phone } = await req.json();

    if (!fundraiser_id || !square_numbers?.length || !buyer_name || !buyer_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = supabase();
    const { data: fundraiser, error } = await db
      .from('fundraisers')
      .select('title, org, price_per_sq, stripe_account_id, stripe_onboarding_complete')
      .eq('id', fundraiser_id)
      .single();

    if (error || !fundraiser) return Response.json({ error: 'Fundraiser not found' }, { status: 404 });
    if (!fundraiser.stripe_account_id) {
      return Response.json({ error: 'Stripe not configured for this fundraiser' }, { status: 400 });
    }

    const subtotal = parseFloat(fundraiser.price_per_sq) * square_numbers.length;
    const txFee = subtotal * 0.0175 + 0.30;
    const total = Math.round((subtotal + txFee) * 100); // cents
    const subtotalCents = Math.round(subtotal * 100);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name: `${fundraiser.title} — Lucky Squares`,
              description: `Square${square_numbers.length > 1 ? 's' : ''} #${square_numbers.join(', #')}`,
            },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: buyer_email,
      payment_intent_data: {
        transfer_data: { destination: fundraiser.stripe_account_id },
        transfer_group: fundraiser_id,
      },
      metadata: {
        fundraiser_id,
        buyer_name,
        buyer_email,
        buyer_phone: buyer_phone || '',
        square_numbers: square_numbers.join(','),
        subtotal_cents: String(subtotalCents),
      },
      success_url: `${appUrl}/f/${fundraiser_id}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/f/${fundraiser_id}`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
