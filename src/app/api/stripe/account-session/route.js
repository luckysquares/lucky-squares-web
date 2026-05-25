import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Maps our org types to Stripe company structures for AU
const ORG_TYPE_TO_STRUCTURE = {
  sporting_club:   'unincorporated_association',
  school:          'incorporated_non_profit',
  charity:         'registered_charity',
  community_group: 'unincorporated_association',
  business:        'private_company',
  other:           'unincorporated_association',
};

// Pre-filled for all accounts — suppresses the industry/website/product description screens
const BUSINESS_PROFILE = {
  mcc:                 '8398', // Charitable and Social Service Organizations — Fundraising
  url:                 'https://luckysquares.com.au',
  product_description: 'Online fundraising for schools, clubs and charities. Participants purchase squares in a Lucky Squares grid to raise money for their cause.',
};

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

    const db = supabase();

    // Verify fundraiser ownership if provided
    if (fundraiser_id) {
      const { data: fundraiser, error } = await db
        .from('fundraisers')
        .select('owner_id')
        .eq('id', fundraiser_id)
        .single();
      if (error || !fundraiser) return Response.json({ error: 'Fundraiser not found' }, { status: 404 });
      if (fundraiser.owner_id !== userId) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ── User-level Stripe account ─────────────────────────────────────────────
    // One Stripe account per user. Create once, reuse for all campaigns.
    const { data: profile } = await db
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', userId)
      .single();

    let accountId = profile?.stripe_account_id;

    if (!accountId) {
      const isOrg      = prefill?.businessType === 'company';
      const nameParts  = (prefill?.name || '').trim().split(' ');
      const firstName  = nameParts[0] || undefined;
      const lastName   = nameParts.slice(1).join(' ') || undefined;
      const abn        = prefill?.orgAbn ? prefill.orgAbn.replace(/\s/g, '') : undefined;
      const structure  = prefill?.orgType ? (ORG_TYPE_TO_STRUCTURE[prefill.orgType] ?? 'unincorporated_association') : undefined;

      const accountParams = {
        controller: {
          stripe_dashboard:       { type: 'none' },
          fees:                   { payer: 'application' },
          losses:                 { payments: 'stripe' },
          requirement_collection: 'stripe',
        },
        capabilities: {
          card_payments: { requested: true },
          transfers:     { requested: true },
        },
        country:          'AU',
        email:            prefill?.email || undefined,
        business_profile: BUSINESS_PROFILE,
        settings: {
          payments: { statement_descriptor: 'LUCKY SQUARES' },
        },
      };

      if (isOrg) {
        // Organisation account — pre-fill company name, ABN, and structure
        accountParams.business_type = 'company';
        accountParams.company = {
          ...(prefill?.orgName ? { name: prefill.orgName } : {}),
          ...(abn              ? { tax_id: abn }           : {}),
          ...(structure        ? { structure }             : {}),
        };
      } else {
        // Individual account — pre-fill personal details to reduce what Stripe asks
        accountParams.business_type = 'individual';
        accountParams.individual = {
          ...(firstName      ? { first_name: firstName }   : {}),
          ...(lastName       ? { last_name:  lastName }    : {}),
          ...(prefill?.email ? { email: prefill.email }    : {}),
          ...(prefill?.phone ? { phone: prefill.phone }    : {}),
        };
      }

      const account = await stripe.accounts.create(accountParams);
      accountId = account.id;

      // Save at user level — this account is reused for all future campaigns
      await db.from('profiles').update({ stripe_account_id: accountId }).eq('id', userId);
    }

    // Link this account to the specific fundraiser so payouts route correctly
    if (fundraiser_id) {
      await db.from('fundraisers').update({ stripe_account_id: accountId }).eq('id', fundraiser_id);
    }

    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
        account_management: { enabled: true },
      },
    });

    return Response.json({ client_secret: accountSession.client_secret });
  } catch (err) {
    console.error('account-session error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
