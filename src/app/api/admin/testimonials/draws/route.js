import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const db = getAdminClient();
  const { data, error } = await db
    .from('testimonial_draws')
    .select('*')
    .order('draw_month', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
