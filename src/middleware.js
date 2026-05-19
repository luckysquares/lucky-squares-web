import { NextResponse } from 'next/server';

export async function middleware(request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) return NextResponse.next();

  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify JWT and get user via Supabase Auth REST API
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: serviceKey },
  });
  if (!userRes.ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id: userId } = await userRes.json();

  // Check is_admin via PostgREST REST API
  const profileRes = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=is_admin&limit=1`,
    { headers: { Authorization: `Bearer ${serviceKey}`, apikey: serviceKey } },
  );
  if (!profileRes.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const [profile] = await profileRes.json();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/admin/:path*'],
};
