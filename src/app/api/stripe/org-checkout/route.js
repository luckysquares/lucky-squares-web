import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

export async function POST(req) {
  const {
    user_id, email, contact_name,
    org_name, abn, org_type,
    street, suburb, state, postcode, phone,
  } = await req.json();

  if (!email || !org_name || !abn) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const priceId = process.env.STRIPE_ORG_PLAN_PRICE_ID;
  if (!priceId) {
    return NextResponse.json({ error: 'Org plan not configured — run /api/admin/stripe/setup-org-plan first' }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  // Create or retrieve Stripe customer
  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer = existing.data[0] ?? await stripe.customers.create({
    email,
    name: contact_name || org_name,
    metadata: { user_id: user_id ?? '', org_name },
  });

  const session = await stripe.checkout.sessions.create({
    customer:   customer.id,
    mode:       'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${APP_URL}/org-next-steps?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${APP_URL}/upgrade-to-org?cancelled=1`,
    metadata: {
      type:         'org_application',
      user_id:      user_id ?? '',
      contact_name: contact_name ?? '',
      org_name,
      abn,
      org_type:     org_type ?? '',
      street:       street ?? '',
      suburb:       suburb ?? '',
      state:        state ?? '',
      postcode:     postcode ?? '',
      phone:        phone ?? '',
      email,
    },
    subscription_data: {
      metadata: {
        type:    'org_plan',
        user_id: user_id ?? '',
      },
    },
  });

  return NextResponse.json({ url: session.url });
}
