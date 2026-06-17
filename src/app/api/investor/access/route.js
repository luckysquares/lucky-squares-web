import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const INVESTOR_PASSWORD = process.env.INVESTOR_PASSWORD;

export async function POST(req) {
  if (!INVESTOR_PASSWORD) return NextResponse.json({ error: 'Investor portal not configured' }, { status: 500 });

  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`investor:${ip}`, { limit: 10, windowMs: 15 * 60 * 1000 });
  if (!allowed) return NextResponse.json({ error: 'Too many attempts. Please try again later.' }, { status: 429 });

  const { name, email, password } = await req.json();
  const success = password === INVESTOR_PASSWORD;

  try {
    const db = getAdminClient();
    await db.from('investor_access_log').insert({
      name:    name?.trim() || null,
      email:   email?.trim().toLowerCase() || null,
      success,
      ip,
    });
  } catch { /* log silently */ }

  if (!success) {
    return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set('investor_session', 'granted', {
    httpOnly: true,
    secure:   true,
    sameSite: 'strict',
    maxAge:   60 * 60 * 8, // 8 hours
    path:     '/',
  });
  return res;
}
