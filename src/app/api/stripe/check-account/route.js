import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const { fundraiser_id } = await req.json();
    const db = supabase();

    // Resolve the user ID from the auth token when available
    let userId = null;
    if (token) {
      const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
        headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY },
      });
      if (userRes.ok) {
        const u = await userRes.json();
        userId = u.id;
      }
    }

    // Find the stripe_account_id — user profile is canonical, fundraiser is the fallback
    let accountId = null;
    if (userId) {
      const { data: profile } = await db
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', userId)
        .single();
      accountId = profile?.stripe_account_id;
    }
    if (!accountId && fundraiser_id) {
      const { data: fundraiser } = await db
        .from('fundraisers')
        .select('stripe_account_id')
        .eq('id', fundraiser_id)
        .single();
      accountId = fundraiser?.stripe_account_id;
    }

    if (!accountId) return Response.json({ complete: false });

    const account = await stripe.accounts.retrieve(accountId);
    const complete = account.charges_enabled && account.payouts_enabled;

    if (complete) {
      // Mark onboarding complete at user level and on the specific fundraiser
      const updates = [];
      if (userId) {
        updates.push(
          db.from('profiles')
            .update({ stripe_onboarding_complete: true })
            .eq('id', userId)
        );
      }
      if (fundraiser_id) {
        updates.push(
          db.from('fundraisers')
            .update({ stripe_onboarding_complete: true })
            .eq('id', fundraiser_id)
        );
      }
      await Promise.all(updates);
    }

    return Response.json({ complete, account_id: accountId });
  } catch (err) {
    console.error('check-account error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
