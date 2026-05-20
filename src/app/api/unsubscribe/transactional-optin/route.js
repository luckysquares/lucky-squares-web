import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function POST(req) {
  try {
    const { email, fundraiser_id, square_numbers, amount_paid } = await req.json();
    if (!email?.trim()) return NextResponse.json({ error: 'email required' }, { status: 400 });

    const supabase = getSupabase();

    // Set transactional_ok = true
    const { error } = await supabase.rpc('opt_in_transactional', { p_email: email.trim().toLowerCase() });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Re-send purchase confirmation if we have enough info
    if (fundraiser_id && square_numbers) {
      const { data: f } = await supabase
        .from('fundraisers')
        .select('title, org, draw_type, draw_date')
        .eq('id', fundraiser_id)
        .single();

      if (f) {
        const drawDesc = f.draw_type === 'auto' && f.draw_date
          ? `The draw will take place on ${new Date(f.draw_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`
          : 'The organiser will announce the draw date soon.';

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` },
          body: JSON.stringify({
            type: 'square_purchase_confirmation',
            to: email.trim().toLowerCase(),
            data: {
              buyer_name: email,
              campaign_title: f.title,
              org_name: f.org,
              square_numbers,
              amount_paid: amount_paid || '0.00',
              draw_type_description: drawDesc,
              campaign_url: `${appUrl}/f/${fundraiser_id}`,
            },
          }),
        }).catch(() => {});
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
