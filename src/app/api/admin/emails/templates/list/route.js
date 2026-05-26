import { getAdminClient } from '@/lib/supabase/server';
import { NextResponse }   from 'next/server';

export async function GET() {
  const supabase = getAdminClient();
  // Middleware already verified is_admin. Service role bypasses RLS so we
  // query the table directly — avoids auth.uid() = null with service role.
  const { data, error } = await supabase
    .from('email_templates')
    .select('key, updated_at')
    .order('key');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
