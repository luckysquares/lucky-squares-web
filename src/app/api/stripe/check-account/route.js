import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    // Authentication is required — this route writes to the profiles table
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY },
    });
    if (!userRes.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: userId } = await userRes.json();

    const { fundraiser_id } = await req.json();
    const db = supabase();

    // User profile is the canonical source for the Stripe account ID
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    let accountId = profile?.stripe_account_id;

    // Fallback: read from the fundraiser, but only if it belongs to this user
    if (!accountId && fundraiser_id) {
      const { data: fundraiser } = await db
        .from('fundraisers')
        .select('stripe_account_id, owner_id')
        .eq('id', fundraiser_id)
        .single();

      if (fundraiser?.owner_id !== userId) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      accountId = fundraiser?.stripe_account_id;
    }

    if (!accountId) return Response.json({ complete: false });

    const account = await stripe.accounts.retrieve(accountId);
    const complete = account.charges_enabled && account.payouts_enabled;

    if (complete) {
      // Mark onboarding complete at user level and on the specific fundraiser
      const updates = [
        db.from('profiles')
          .update({ stripe_onboarding_complete: true })
          .eq('id', userId),
      ];
      if (fundraiser_id) {
        updates.push(
          db.from('fundraisers')
            .update({ stripe_onboarding_complete: true })
            .eq('id', fundraiser_id)
            .eq('owner_id', userId) // ownership guard
        );
      }
      await Promise.all(updates);
    }

    return Response.json({ complete });
  } catch (err) {
    console.error('check-account error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
