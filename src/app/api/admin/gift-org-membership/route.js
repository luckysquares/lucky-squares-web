import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

export async function POST(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, email, first_name, org_name } = await req.json();
  if (!user_id || !email) return NextResponse.json({ error: 'user_id and email are required' }, { status: 400 });

  const db = getAdminClient();

  const { error } = await db.rpc('admin_gift_org_membership', { p_user_id: user_id });
  if (error) {
    console.error('[gift-org-membership] RPC error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const txEmailUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`
    : null;

  if (txEmailUrl) {
    const name = first_name || email.split('@')[0];
    await fetch(txEmailUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        type: 'org_welcome',
        to:   email.trim(),
        data: {
          first_name:     name.split(' ')[0],
          org_name:       org_name || name,
          campaign_limit: 10,
        },
      }),
    });
  }

  // Log to CRM contact activity
  const { data: contactId } = await db.rpc('get_or_create_marketing_contact', {
    p_user_id: user_id,
    p_email:   email.trim(),
    p_name:    first_name || null,
  });
  if (contactId) {
    await db.from('marketing_contact_logs').insert({
      contact_id: contactId,
      entry:      `Gifted 12-month Organisation membership${org_name ? ` for ${org_name}` : ''}. Org welcome email sent.`,
      entry_type: 'System',
    });
  }

  return NextResponse.json({ ok: true });
}
