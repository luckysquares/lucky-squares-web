import { getAdminClient as supabase } from '@/lib/supabase/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return Response.json({ error: 'Missing token' }, { status: 400 });
  }

  const { data: email, error } = await supabase().rpc('unsubscribe_by_token', { p_token: token });

  if (error || !email) {
    return Response.json({ error: 'Invalid or expired unsubscribe link' }, { status: 400 });
  }

  return Response.json({ ok: true, email });
}
