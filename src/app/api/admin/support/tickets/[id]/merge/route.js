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

export async function POST(req, { params }) {
  const adminUser = await verifyAdmin(req);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { merge_into_id } = await req.json();

  if (!merge_into_id) {
    return NextResponse.json({ error: 'merge_into_id is required.' }, { status: 400 });
  }
  if (merge_into_id === id) {
    return NextResponse.json({ error: 'Cannot merge a ticket into itself.' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch both tickets
  const [{ data: source, error: sErr }, { data: target, error: tErr }] = await Promise.all([
    supabase.from('support_tickets').select('id, ticket_ref').eq('id', id).single(),
    supabase.from('support_tickets').select('id, ticket_ref').eq('id', merge_into_id).single(),
  ]);

  if (sErr || !source) return NextResponse.json({ error: 'Source ticket not found.' }, { status: 404 });
  if (tErr || !target) return NextResponse.json({ error: 'Target ticket not found.' }, { status: 404 });

  // Move all messages to target ticket
  await supabase
    .from('support_messages')
    .update({ ticket_id: merge_into_id })
    .eq('ticket_id', id);

  // Add internal note to target
  await supabase.from('support_messages').insert({
    ticket_id:   merge_into_id,
    body:        `Ticket ${source.ticket_ref} merged into ${target.ticket_ref}`,
    is_internal: true,
    sender_type: 'admin',
    sender_name: 'System',
  });

  // Mark source ticket as merged and closed
  await supabase
    .from('support_tickets')
    .update({ merged_into: merge_into_id, status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', id);

  return NextResponse.json({ ok: true, source_ref: source.ticket_ref, target_ref: target.ticket_ref });
}
