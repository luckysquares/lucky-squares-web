import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { fundraiser_id } = await req.json();
    const db = supabase();

    const { data: fundraiser } = await db
      .from('fundraisers')
      .select('stripe_account_id')
      .eq('id', fundraiser_id)
      .single();

    if (!fundraiser?.stripe_account_id) return Response.json({ complete: false });

    const account = await stripe.accounts.retrieve(fundraiser.stripe_account_id);
    const complete = account.charges_enabled && account.payouts_enabled;

    if (complete) {
      await db
        .from('fundraisers')
        .update({ stripe_onboarding_complete: true })
        .eq('id', fundraiser_id);
    }

    return Response.json({ complete });
  } catch (err) {
    console.error('check-account error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
