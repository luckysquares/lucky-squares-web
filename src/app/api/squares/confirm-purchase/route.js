import { NextResponse } from 'next/server';
import { getAdminClient as supabase } from '@/lib/supabase/server';

// Sends the buyer confirmation email + organiser sale notification for
// bank-transfer / in-person square purchases. Stripe purchases get these
// emails from the webhook (claim_squares already ran there); this route
// covers the LiveGrid client path where claim_squares runs directly via RPC
// with no payment provider in the loop.
export async function POST(req) {
  const { fundraiser_id, square_numbers, buyer_name, buyer_email } = await req.json();

  if (!fundraiser_id || !Array.isArray(square_numbers) || !square_numbers.length || !buyer_email) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const db = supabase();

  // Verify these squares actually belong to this buyer before sending any
  // email — prevents an arbitrary caller triggering emails for squares they
  // didn't buy.
  const { data: ownedSquares, error: ownedErr } = await db
    .from('squares')
    .select('number')
    .eq('fundraiser_id', fundraiser_id)
    .in('number', square_numbers)
    .eq('buyer_email', buyer_email);

  if (ownedErr || !ownedSquares?.length) {
    return NextResponse.json({ error: 'No matching claimed squares found' }, { status: 404 });
  }

  const { data: fundraiser } = await db
    .from('fundraisers')
    .select('title, org, draw_type, draw_date, contact_name, contact_email, owner_id, grid_size, price_per_sq, slug')
    .eq('id', fundraiser_id)
    .single();

  if (!fundraiser) {
    return NextResponse.json({ error: 'Fundraiser not found' }, { status: 404 });
  }

  const subtotal = ownedSquares.length * parseFloat(fundraiser.price_per_sq || 0);
  const drawDesc = fundraiser.draw_type === 'auto' && fundraiser.draw_date
    ? `The draw will take place on ${new Date(fundraiser.draw_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}.`
    : 'The organiser will announce the draw date soon.';

  const appUrl     = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';
  const txUrl      = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`;
  const txHeaders  = { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` };

  // ── Confirmation email to buyer ─────────────────────────────────────────
  await fetch(txUrl, {
    method:  'POST',
    headers: txHeaders,
    body: JSON.stringify({
      type: 'square_purchase_confirmation',
      to:   buyer_email,
      data: {
        buyer_name,
        campaign_title:         fundraiser.title,
        org_name:               fundraiser.org,
        square_numbers:         ownedSquares.map((s) => s.number).join(', '),
        amount_paid:            subtotal.toFixed(2),
        draw_type_description:  drawDesc,
        campaign_url:           `${appUrl}/f/${fundraiser.slug ?? fundraiser_id}`,
      },
    }),
  }).catch(() => {});

  // ── Sale notification to organiser ──────────────────────────────────────
  if (fundraiser.contact_email) {
    const { data: stats } = await db
      .from('fundraiser_stats')
      .select('sold_count')
      .eq('fundraiser_id', fundraiser_id)
      .single();

    const totalSold   = Number(stats?.sold_count ?? 0);
    const isFirstSale = totalSold === ownedSquares.length;

    let isOrgPlan = false;
    if (fundraiser.owner_id) {
      const { data: ownerProfile } = await db
        .from('profiles')
        .select('plan')
        .eq('id', fundraiser.owner_id)
        .single();
      isOrgPlan = ownerProfile?.plan === 'org';
    }

    const amountRaised = (totalSold * parseFloat(fundraiser.price_per_sq || 0)).toFixed(2);

    if (isFirstSale) {
      await fetch(txUrl, {
        method:  'POST',
        headers: txHeaders,
        body: JSON.stringify({
          type: isOrgPlan ? 'org_square_sold' : 'square_sold',
          to:   fundraiser.contact_email,
          data: {
            first_name:     (fundraiser.contact_name ?? 'there').split(' ')[0],
            org_name:       fundraiser.org,
            campaign_title: fundraiser.title,
            buyer_name,
            square_number:  ownedSquares[0].number,
            sold_count:     totalSold,
            grid_size:      fundraiser.grid_size,
            amount_raised:  amountRaised,
            is_first:       true,
          },
        }),
      }).catch(() => {});
    }
  }

  return NextResponse.json({ ok: true });
}
