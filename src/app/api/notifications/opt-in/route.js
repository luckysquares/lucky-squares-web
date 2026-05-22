import { getAdminClient as supabase } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { email, fundraiser_id } = await req.json();
    if (!email || !fundraiser_id) {
      return NextResponse.json({ error: 'email and fundraiser_id required' }, { status: 400 });
    }

    const { error } = await supabase().rpc('opt_in_campaign_notifications', {
      p_email: email.trim().toLowerCase(),
      p_fundraiser_id: fundraiser_id,
    });

    if (error) {
      console.error('opt_in_campaign_notifications error:', error);
      return NextResponse.json({ error: 'Failed to save opt-in' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
