import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Check whether an email is opted out but hasn't re-enabled transactional emails.
// Only called client-side immediately after a purchase with the buyer's own email.
export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.trim().toLowerCase();
  if (!email) return NextResponse.json({ needs_reconfirm: false });

  try {
    const { data } = await getSupabase()
      .from('email_opt_outs')
      .select('opted_out, transactional_ok')
      .eq('email', email)
      .single();

    const needs_reconfirm = !!data?.opted_out && !data?.transactional_ok;
    return NextResponse.json({ needs_reconfirm });
  } catch {
    return NextResponse.json({ needs_reconfirm: false });
  }
}
