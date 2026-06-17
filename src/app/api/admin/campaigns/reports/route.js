import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

async function verifyAdmin(req) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  return profile?.is_admin === true;
}

export async function GET(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { data, error } = await getSupabase()
      .from('campaign_reports')
      .select(`
        id, reason, details, reporter_ip, created_at,
        fundraisers ( id, title, org, status )
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
