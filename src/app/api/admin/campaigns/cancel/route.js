import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { campaign_id } = await req.json();
    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id required' }, { status: 400 });
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cancel-campaign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ campaign_id }),
      },
    );

    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json({ error: json.error ?? 'Cancellation failed' }, { status: res.status });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
