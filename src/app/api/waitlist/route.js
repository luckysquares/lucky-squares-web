import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

export async function POST(req) {
  try {
    // Rate limit: 3 signups per IP per 10 minutes.
    const ip = getClientIp(req);
    const { allowed } = checkRateLimit(`waitlist:${ip}`, {
      limit:    3,
      windowMs: 10 * 60 * 1000, // 10 minutes
    });
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 },
      );
    }

    const { name, email } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });

    const { error } = await getSupabase().from('waitlist').insert({ email: email.trim().toLowerCase(), name: name?.trim() || null });

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'You are already on the waitlist.' }, { status: 409 });
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_waitlist');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
