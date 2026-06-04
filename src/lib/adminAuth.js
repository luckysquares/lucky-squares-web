import { getAdminClient } from '@/lib/supabase/server';

/**
 * Verify the request is from an authenticated admin user.
 * Checks the Authorization: Bearer <token> header against Supabase auth
 * and confirms the user has is_admin = true on their profile.
 *
 * Usage:
 *   if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 */
export async function verifyAdmin(req) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const supabase = getAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin === true;
}
