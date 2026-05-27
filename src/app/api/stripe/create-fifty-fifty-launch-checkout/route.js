import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// The platform launch fee in AUD. Single source of truth — never accepted from the client.
const PLATFORM_FEE_AUD = 19;

export async function POST(req) {
  try {
    // Authentication required — prevents unauthenticated parties from creating
    // checkout sessions and activating any campaign they can guess the ID of.
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY },
    });
    if (!userRes.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: userId } = await userRes.json();

    const body = await req.json();
    const campaign_id = body?.campaign_id;

    if (!campaign_id) {
      return Response.json({ error: 'campaign_id is required' }, { status: 400 });
    }

    const db = supabase();

    // Verify the campaign exists, belongs to this user, and is still a draft.
    const { data: campaign, error: campError } = await db
      .from('fifty_fifty_campaigns')
      .select('id, status, owner_id, title')
      .eq('id', campaign_id)
      .single();

    if (campError || !campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }

    if (campaign.owner_id !== userId) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (campaign.status === 'active') {
      // Idempotency: already launched, nothing to charge.
      return Response.json({ error: 'Campaign is already active' }, { status: 409 });
    }

    const amountCents = Math.round(PLATFORM_FEE_AUD * 100);
    const appUrl      = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name:        'Lucky Squares — 50/50 Raffle Launch Fee',
              description: `One-off fee to launch your 50/50 raffle: ${campaign.title}`,
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        action:      'fifty_fifty_launch',
        campaign_id,
      },
      success_url: `${appUrl}/fundraise?ff_launch=1&ffid=${campaign_id}`,
      cancel_url:  `${appUrl}/fundraise`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-fifty-fifty-launch-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
