import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return Response.json({ error: 'Unauthorised' }, { status: 401 });

    const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
    if (!userRes.ok) return Response.json({ error: 'Unauthorised' }, { status: 401 });
    const user = await userRes.json();
    if (!user?.id) return Response.json({ error: 'Unauthorised' }, { status: 401 });

    const db = getAdminClient();

    // Fetch current profile — must be an approved org (casual or already org)
    const { data: profile } = await db
      .from('profiles')
      .select('plan, stripe_customer_id, org_subscription_id')
      .eq('id', user.id)
      .single();

    if (!profile || !['casual', 'org'].includes(profile.plan)) {
      return Response.json({ error: 'Organisation membership is only available to approved organisations.' }, { status: 403 });
    }

    if (profile.org_subscription_id) {
      return Response.json({ error: 'You already have an active organisation membership.' }, { status: 409 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      // Reuse existing Stripe customer if we have one, otherwise create from email
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email }
      ),
      line_items: [{
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'Lucky Squares Annual Organisation Membership',
            description: 'Unlimited campaigns with up to 10 live simultaneously.',
          },
          unit_amount: 14900, // $149 AUD
          recurring: { interval: 'year' },
        },
        quantity: 1,
      }],
      subscription_data: {
        metadata: { user_id: user.id, action: 'org_membership' },
      },
      metadata: { action: 'org_membership', user_id: user.id },
      payment_method_types: ['card'],
      success_url: `${appUrl}/org/dashboard?membership=1`,
      cancel_url:  `${appUrl}/org/dashboard`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-org-membership-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
