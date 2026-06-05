import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(req, { params }) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const db = getAdminClient();
  const { data, error } = await db
    .from('marketing_contact_logs')
    .select('*')
    .eq('contact_id', id)
    .order('logged_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req, { params }) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { entry, entry_type, logged_at } = await req.json();
  if (!entry?.trim()) return NextResponse.json({ error: 'Entry is required' }, { status: 400 });
  const db = getAdminClient();
  const { data, error } = await db
    .from('marketing_contact_logs')
    .insert({ contact_id: id, entry: entry.trim(), entry_type: entry_type || null, logged_at: logged_at || new Date().toISOString() })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
