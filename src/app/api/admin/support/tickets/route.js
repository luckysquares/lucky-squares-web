import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

async function verifyAdmin(req) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin ? user : null;
}

export async function GET(req) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status   = searchParams.get('status');
  const priority = searchParams.get('priority');
  const category = searchParams.get('category');
  const assignee = searchParams.get('assignee');
  const search   = searchParams.get('search');
  const page     = parseInt(searchParams.get('page') || '1', 10);
  const limit    = parseInt(searchParams.get('limit') || '25', 10);
  const offset   = (page - 1) * limit;

  const supabase = getSupabase();

  let query = supabase
    .from('support_tickets')
    .select(`
      id, ticket_ref, contact_name, contact_email, subject,
      category, priority, status, sla_breached, created_at, updated_at, closed_at,
      assignee_id
    `, { count: 'exact' })
    .is('merged_into', null);

  if (status)   query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);
  if (category) query = query.eq('category', category);
  if (assignee) query = query.eq('assignee_id', assignee);
  if (search)   query = query.or(`contact_name.ilike.%${search}%,contact_email.ilike.%${search}%,subject.ilike.%${search}%,ticket_ref.ilike.%${search}%`);

  // SLA breach: mark tickets open > 24h as high breach, > 48h as urgent
  const now       = new Date();
  const h24ago    = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const h48ago    = new Date(now - 48 * 60 * 60 * 1000).toISOString();

  query = query
    .order('sla_breached', { ascending: false })
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Annotate SLA breaches on the fly (also updated async by a future cron)
  const tickets = (data || []).map((t) => {
    let slaLevel = null;
    if (['open', 'in_progress'].includes(t.status)) {
      if (t.created_at < h48ago) slaLevel = 'urgent';
      else if (t.created_at < h24ago) slaLevel = 'high';
    }
    return { ...t, sla_level: slaLevel };
  });

  return NextResponse.json({ tickets, total: count ?? 0, page, limit });
}
