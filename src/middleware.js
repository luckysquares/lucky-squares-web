import { NextResponse } from 'next/server';

// Routes locked during beta — redirect to /coming-soon (waitlist)
const BETA_LOCKED = [
  '/fundraise',
  '/feeling-lucky',
  '/org-signup',
];

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ── /betatest: never accessible on the production site ──────────────────
  if (pathname.startsWith('/betatest') && process.env.VERCEL_ENV === 'production') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── Redirect legacy /f/[slug-or-uuid] links to root-level slug route ───────
  if (pathname.startsWith('/f/')) {
    return NextResponse.redirect(new URL(pathname.slice(2), request.url), 301);
  }

  // ── Beta gate: lock campaign/registration routes on production ───────────
  if (process.env.NEXT_PUBLIC_SITE_PHASE === 'beta') {
    const locked = BETA_LOCKED.some((p) => pathname.startsWith(p));
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

  // Thread x-pathname as a *request* header so server components can read it
  // via headers(). Setting it on the response is not enough — Next.js only
  // forwards modified request headers to the rendering pipeline.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
