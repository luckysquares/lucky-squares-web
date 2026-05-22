import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.SUPABASE_SERVICE_ROLE_KEY },
    });
    if (!userRes.ok) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: userId } = await userRes.json();

    const { fundraiser_id, prefill } = await req.json();
    if (!fundraiser_id) return Response.json({ error: 'fundraiser_id required' }, { status: 400 });

    const db = supabase();
    const { data: fundraiser, error } = await db
      .from('fundraisers')
      .select('stripe_account_id, owner_id')
      .eq('id', fundraiser_id)
      .single();

    if (error || !fundraiser) return Response.json({ error: 'Fundraiser not found' }, { status: 404 });
    if (fundraiser.owner_id !== userId) return Response.json({ error: 'Forbidden' }, { status: 403 });

    let accountId = fundraiser.stripe_account_id;

    if (!accountId) {
      const isOrg       = prefill?.businessType === 'company';
      const [firstName, ...rest] = (prefill?.name || '').trim().split(' ');
      const lastName    = rest.join(' ') || undefined;
      const abn         = prefill?.orgAbn ? prefill.orgAbn.replace(/\s/g, '') : undefined;

      const accountParams = {
        controller: {
          stripe_dashboard: { type: 'none' },
          fees: { payer: 'application' },
          losses: { payments: 'stripe' },
          requirement_collection: 'stripe',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        country: 'AU',
        email: prefill?.email || undefined,
      };

      if (isOrg) {
        accountParams.business_type = 'company';
        accountParams.company = {
          ...(prefill?.orgName ? { name: prefill.orgName } : {}),
          ...(abn ? { tax_id: abn } : {}),
        };
      } else {
        accountParams.individual = {
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName  ? { last_name:  lastName  } : {}),
          ...(prefill?.email ? { email: prefill.email } : {}),
        };
      }

      const account = await stripe.accounts.create(accountParams);
      accountId = account.id;
      await db.from('fundraisers').update({ stripe_account_id: accountId }).eq('id', fundraiser_id);
    }

    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
        account_management: { enabled: true },
      },
    });

    return Response.json({ client_secret: accountSession.client_secret, account_id: accountId });
  } catch (err) {
    console.error('account-session error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
