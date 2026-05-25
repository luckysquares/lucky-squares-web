import { getAdminClient } from '@/lib/supabase/server';
import { NextResponse }   from 'next/server';

export async function GET() {
  const supabase = getAdminClient();
  const { data, error } = await supabase.rpc('admin_list_email_templates');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
