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
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return Response.json({ error: 'No billing account found.' }, { status: 404 });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   profile.stripe_customer_id,
      return_url: `${appUrl}/org/dashboard`,
    });

    return Response.json({ url: portalSession.url });
  } catch (err) {
    console.error('org-portal error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
