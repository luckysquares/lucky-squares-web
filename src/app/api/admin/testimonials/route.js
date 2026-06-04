import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const db = getAdminClient();
  const { data, error } = await db
    .from('testimonials')
    .select('id, status, organiser_name, org_name, display_name, quote, rating, submitted_at, approved_at, created_at')
    .order('submitted_at', { ascending: false, nullsFirst: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
