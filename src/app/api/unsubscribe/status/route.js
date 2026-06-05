import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

// Check whether an email is opted out but hasn't re-enabled transactional emails.
// Only called client-side immediately after a purchase with the buyer's own email.
export async function GET(req) {
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`unsub-status:${ip}`, { limit: 20, windowMs: 60 * 1000 });
  if (!allowed) return NextResponse.json({ needs_reconfirm: false }, { status: 429 });

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
