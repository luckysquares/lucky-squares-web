/**
 * One-time setup endpoint: creates the Lucky Squares Organisation Plan
 * product and annual recurring price in Stripe.
 *
 * Call once after deploying:
 *   GET https://luckysquares.com.au/api/admin/stripe/setup-org-plan
 *   (must be logged in as admin)
 *
 * Copy the returned price_id and add it to Vercel as:
 *   STRIPE_ORG_PLAN_PRICE_ID=price_xxxx
 */

import { NextResponse } from 'next/server';
import Stripe from 'stripe';

export async function GET() {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  // Create the product
  const product = await stripe.products.create({
    name:        'Lucky Squares Organisation Plan',
    description: 'Annual membership for schools, clubs and charities. Up to 10 concurrent campaigns, team management, and priority support.',
    metadata:    { type: 'org_plan' },
  });

  // Create the annual recurring price — AUD $149/year
  const price = await stripe.prices.create({
    product:    product.id,
    unit_amount: 14900, // $149.00 in cents
    currency:   'aud',
    recurring:  { interval: 'year' },
    metadata:   { type: 'org_plan_annual' },
  });

  return NextResponse.json({
    ok:         true,
    product_id: product.id,
    price_id:   price.id,
    message:    `Add STRIPE_ORG_PLAN_PRICE_ID=${price.id} to Vercel environment variables, then redeploy.`,
  });
}
