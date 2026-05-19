import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnon   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Skip if Supabase not configured (local dev without env vars)
  if (!supabaseUrl || !supabaseAnon) return NextResponse.next();

  const response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll()           { return request.cookies.getAll(); },
      setAll(cookies)    { cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options)); },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return response;
}

export const config = {
  matcher: ['/api/admin/:path*'],
};
