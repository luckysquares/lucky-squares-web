import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Maps our org types to Stripe business_type for AU.
// Non-commercial orgs (clubs, schools, charities) use 'non_profit' not 'company'.
// 'business' is the only type that maps to 'company'.
const ORG_TYPE_TO_BUSINESS_TYPE = {
  sporting_club:   'non_profit',
  school:          'non_profit',
  charity:         'non_profit',
  community_group: 'non_profit',
  business:        'company',
  other:           'non_profit',
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
      headers: { Authorization: `Bearer ${token}`, apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
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

    if (accountId) {
      // Existing account — patch business_profile and statement descriptor in case
      // this account was created before those pre-fills were added. Stripe ignores
      // fields that are already set to the same value, so this is safe to call every time.
      try {
        await stripe.accounts.update(accountId, {
          business_profile: BUSINESS_PROFILE,
          settings: { payments: { statement_descriptor: 'LUCKY SQUARES' } },
        });
      } catch (patchErr) {
        // Non-fatal — session creation below will still work.
        console.warn('account-session: could not patch existing account:', patchErr.message);
      }
    }

    if (!accountId) {
      const isOrg       = prefill?.businessType === 'company';
      const nameParts   = (prefill?.name || '').trim().split(' ');
      const firstName   = nameParts[0] || undefined;
      const lastName    = nameParts.slice(1).join(' ') || undefined;
      const abn         = prefill?.orgAbn ? prefill.orgAbn.replace(/\s/g, '') : undefined;
      const bizType     = prefill?.orgType ? (ORG_TYPE_TO_BUSINESS_TYPE[prefill.orgType] ?? 'non_profit') : 'non_profit';

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
        // Organisation account — use correct Stripe business_type for AU.
        // non_profit covers clubs, schools, charities; company covers businesses.
        accountParams.business_type = bizType;
        accountParams.company = {
          ...(prefill?.orgName ? { name: prefill.orgName } : {}),
          ...(abn              ? { tax_id: abn }           : {}),
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
