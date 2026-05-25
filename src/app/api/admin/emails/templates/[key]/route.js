import { getAdminClient } from '@/lib/supabase/server';
import { NextResponse }   from 'next/server';

function getSupabase() { return getAdminClient(); }

export async function GET(req, { params }) {
  const { key } = await params;
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc('admin_get_email_template', { p_key: key });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0] ?? null);
}

export async function POST(req, { params }) {
  const { key } = await params;
  const { subject, body } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 });
  }
  const supabase = getSupabase();
  const { error } = await supabase.rpc('admin_upsert_email_template', {
    p_key:     key,
    p_subject: subject.trim(),
    p_body:    body.trim(),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { key } = await params;
  const supabase = getSupabase();
  const { error } = await supabase.rpc('admin_delete_email_template', { p_key: key });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
