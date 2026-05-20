import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

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

export async function GET(req, { params }) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = getSupabase();

  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select(`
      id, ticket_ref, contact_name, contact_email, subject,
      category, priority, status, sla_breached, satisfaction,
      created_at, updated_at, closed_at, merged_into,
      assignee:profiles!assignee_id(id, full_name, email)
    `)
    .eq('id', id)
    .single();

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 404 });

  const { data: messages, error: mErr } = await supabase
    .from('support_messages')
    .select('id, body, is_internal, sender_type, sender_name, sender_email, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true });

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  return NextResponse.json({ ticket, messages: messages || [] });
}

export async function PATCH(req, { params }) {
  const user = await verifyAdmin(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await req.json();

  const allowed = ['status', 'priority', 'category', 'assignee_id'];
  const updates = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 });
  }

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select('id, ticket_ref, status, priority, category, assignee_id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ticket: data });
}
