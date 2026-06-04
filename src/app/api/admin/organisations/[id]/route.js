import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';
import Stripe from 'stripe';

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`
  : null;

async function sendEmail(type, to, data) {
  if (!SUPABASE_FUNCTIONS_URL) return;
  try {
    await fetch(SUPABASE_FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (err) {
    console.error(`[org-approval] Failed to send ${type} email:`, err.message);
  }
}

// POST /api/admin/organisations/[id]
// body: { action: 'approve' | 'reject' }
export async function POST(req, { params }) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { action } = await req.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const db = getAdminClient();

  // We need the calling user's session to pass to the RPC (security definer checks is_admin)
  // Since this route is already admin-verified by middleware, we can call directly via service role
  // by running a raw query with the service role client (bypasses auth.uid() check in RPC).
  // Instead: fetch the application directly and update it.
  const { data: app, error: fetchErr } = await db
    .from('org_applications')
    .select('id, user_id, contact_name, email, org_name, status, stripe_subscription_id')
    .eq('id', id)
    .single();

  if (fetchErr || !app) {
    return NextResponse.json({ error: 'Application not found' }, { status: 404 });
  }

  if (app.status === action + 'd') {
    return NextResponse.json({ error: `Already ${action}d` }, { status: 409 });
  }

  const newStatus = action === 'approve' ? 'approved' : 'rejected';

  const { error: updateErr } = await db
    .from('org_applications')
    .update({ status: newStatus })
    .eq('id', id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const firstName = (app.contact_name || '').split(' ')[0] || 'there';
  const appUrl    = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';
  const stripe    = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  if (action === 'approve') {
    // Upgrade plan to org
    if (app.user_id) {
      await db.from('profiles').update({ plan: 'org' }).eq('id', app.user_id);
    }

    await Promise.all([
      sendEmail('org_application_approved', app.email, {
        first_name: firstName,
        org_name:   app.org_name,
        portal_url: `${appUrl}/fundraise`,
      }),
      sendEmail('org_welcome', app.email, {
        first_name:     firstName,
        org_name:       app.org_name,
        campaign_limit: 10,
      }),
    ]);

  } else {
    // Rejected — cancel Stripe subscription and refund the latest invoice
    if (app.stripe_subscription_id) {
      try {
        // Cancel the subscription immediately
        await stripe.subscriptions.cancel(app.stripe_subscription_id);

        // Refund the most recent payment
        const invoices = await stripe.invoices.list({
          subscription: app.stripe_subscription_id,
          limit: 1,
        });
        const invoice = invoices.data[0];
        if (invoice?.payment_intent) {
          await stripe.refunds.create({ payment_intent: invoice.payment_intent });
        }
      } catch (stripeErr) {
        console.error('[org-approval] Stripe refund error:', stripeErr.message);
        // Don't block the rejection — log and continue
      }
    }

    await sendEmail('org_application_rejected', app.email, {
      first_name: firstName,
      org_name:   app.org_name,
    });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
