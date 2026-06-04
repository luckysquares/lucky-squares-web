import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';

export async function GET(req, { params }) {
  const { token } = await params;
  const db = getAdminClient();

  const { data, error } = await db
    .from('testimonials')
    .select('id, status, organiser_name, org_name, fundraiser_id')
    .eq('token', token)
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
  if (data.status === 'submitted' || data.status === 'approved') {
    return NextResponse.json({ already_submitted: true });
  }

  return NextResponse.json({
    organiser_name: data.organiser_name,
    org_name:       data.org_name,
  });
}

export async function POST(req, { params }) {
  const { token } = await params;
  const body = await req.json();
  const { quote, rating, display_name } = body;

  if (!quote?.trim()) return NextResponse.json({ error: 'Quote is required' }, { status: 400 });
  if (quote.trim().length < 20) return NextResponse.json({ error: 'Please write at least 20 characters' }, { status: 400 });
  if (quote.trim().length > 500) return NextResponse.json({ error: 'Please keep your testimonial under 500 characters' }, { status: 400 });

  const db = getAdminClient();

  const { data, error } = await db
    .from('testimonials')
    .update({
      quote:        quote.trim(),
      rating:       rating ?? null,
      display_name: display_name?.trim() || null,
      status:       'submitted',
      submitted_at: new Date().toISOString(),
    })
    .eq('token', token)
    .eq('status', 'pending')
    .select('id')
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invalid or already submitted' }, { status: 400 });

  return NextResponse.json({ ok: true });
}
