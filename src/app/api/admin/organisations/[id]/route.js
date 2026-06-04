import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

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
    .select('id, user_id, contact_name, email, org_name, status')
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

  // If approving, set plan to 'casual' — the user can upgrade to full annual
  // membership ($149/year) from their org dashboard when ready.
  if (action === 'approve' && app.user_id) {
    await db.from('profiles').update({ plan: 'casual' }).eq('id', app.user_id);
  }

  // Send notification email
  const firstName = (app.contact_name || '').split(' ')[0] || 'there';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

  if (action === 'approve') {
    await Promise.all([
      sendEmail('org_application_approved', app.email, {
        first_name: firstName,
        org_name:   app.org_name,
        portal_url: `${appUrl}/org/dashboard`,
      }),
      sendEmail('org_welcome', app.email, {
        first_name:     firstName,
        org_name:       app.org_name,
        campaign_limit: 10,
      }),
    ]);
  } else {
    await sendEmail('org_application_rejected', app.email, {
      first_name: firstName,
      org_name:   app.org_name,
    });
  }

  return NextResponse.json({ ok: true, status: newStatus });
}
