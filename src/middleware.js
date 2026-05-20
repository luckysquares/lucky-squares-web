import { NextResponse } from 'next/server';

// Routes locked during beta — redirect to /coming-soon (waitlist)
const BETA_LOCKED = [
  '/fundraise',
  '/feeling-lucky',
  '/org-signup',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ── Beta gate: lock campaign/registration routes on production ───────────
  if (process.env.NEXT_PUBLIC_SITE_PHASE === 'beta') {
    const locked = BETA_LOCKED.some((p) => pathname.startsWith(p))
      || /^\/f\/[^/]+/.test(pathname); // campaign pages /f/[id]
    if (locked) {
      return NextResponse.redirect(new URL('/coming-soon', request.url));
    }
  }

  // ── Admin API auth ───────────────────────────────────────────────────────
  if (pathname.startsWith('/api/admin')) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) return NextResponse.next();

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
    });
    if (!userRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: userId } = await userRes.json();

    const profileRes = await fetch(
      `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=is_admin&limit=1`,
      { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
    );
    if (!profileRes.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const [profile] = await profileRes.json();
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
