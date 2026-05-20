import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
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
