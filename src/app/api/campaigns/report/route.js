import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { headers } from 'next/headers';

const VALID_REASONS = ['inappropriate_content', 'suspicious_activity', 'misleading_information', 'spam', 'other'];

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
    const { fundraiser_id, reason, details } = await req.json();

    if (!fundraiser_id) return NextResponse.json({ error: 'fundraiser_id required' }, { status: 400 });
    if (!VALID_REASONS.includes(reason)) return NextResponse.json({ error: 'Invalid reason' }, { status: 400 });

    const headersList = await headers();
    const ip = headersList.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';

    const supabase = getSupabase();

    // Rate limit: max 5 reports per fundraiser per IP per hour
    const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
    const { count } = await supabase
      .from('campaign_reports')
      .select('*', { count: 'exact', head: true })
      .eq('fundraiser_id', fundraiser_id)
      .eq('reporter_ip', ip)
      .gte('created_at', oneHourAgo);

    if (count >= 5) return NextResponse.json({ error: 'Too many reports' }, { status: 429 });

    const { error } = await supabase.from('campaign_reports').insert({
      fundraiser_id,
      reason,
      details: details?.trim().slice(0, 500) || null,
      reporter_ip: ip,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
