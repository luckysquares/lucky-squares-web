import { getAdminClient } from '@/lib/supabase/server';
import { NextResponse }   from 'next/server';

// Middleware already verified is_admin before any of these handlers run.
// Service role bypasses RLS, so we query email_templates directly rather
// than calling the security-definer RPCs (which check auth.uid() and
// always see NULL when called from a service-role client).

export async function GET(req, { params }) {
  const { key } = await params;
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from('email_templates')
    .select('key, subject, body, updated_at')
    .eq('key', key)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? null);
}

export async function POST(req, { params }) {
  const { key } = await params;
  const { subject, body } = await req.json();
  if (!subject?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'subject and body are required' }, { status: 400 });
  }
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('email_templates')
    .upsert(
      { key, subject: subject.trim(), body: body.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'key' },
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const { key } = await params;
  const supabase = getAdminClient();
  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('key', key);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
