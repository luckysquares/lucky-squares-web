import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

export async function GET(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const db = getAdminClient();
  const { data, error } = await db
    .from('testimonial_draws')
    .select('*')
    .order('draw_month', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
