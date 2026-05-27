import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';

// Saves org application details using the service-role client so RLS doesn't
// block the insert — the anon client has no session immediately after signUp()
// when email confirmation is enabled.

export async function POST(req) {
  const body = await req.json();
  const { user_id, org_name, abn, org_type, street, suburb, state, postcode, contact_name, email, phone } = body;

  if (!org_name || !abn || !email) {
    return NextResponse.json({ error: 'Missing required fields.' }, { status: 400 });
  }

  const supabase = getAdminClient();

  const { error } = await supabase.from('org_applications').insert({
    user_id:      user_id ?? null,
    org_name,
    abn,
    org_type,
    street,
    suburb,
    state,
    postcode,
    contact_name,
    email,
    phone,
  });

  if (error) {
    console.error('[org-application] insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
