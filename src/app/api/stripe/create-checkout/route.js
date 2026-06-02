import Stripe from 'stripe';
import { getAdminClient as supabase } from '@/lib/supabase/server';
import { calcTxFee } from '@/lib/stripeFees';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const { fundraiser_id, square_numbers, buyer_name, buyer_email, buyer_phone } = await req.json();

    if (!fundraiser_id || !square_numbers?.length || !buyer_name || !buyer_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // ── Input validation ─────────────────────────────────────────────────────
    if (square_numbers.length > 10) {
      return Response.json({ error: 'Maximum 10 squares per purchase' }, { status: 400 });
    }

    // Deduplicate, reject non-positive integers. Range check (> grid_size)
    // is handled below after we know the fundraiser's grid size.
    const uniqueNums = [...new Set(square_numbers)];
    if (uniqueNums.some((n) => !Number.isInteger(n) || n < 1)) {
      return Response.json({ error: 'Invalid square numbers' }, { status: 400 });
    }

    const db = supabase();

    // Fetch fundraiser details — only active campaigns can accept payments.
    // Also need grid_size for the range check.
    const { data: fundraiser, error } = await db
      .from('fundraisers')
      .select('title, org, slug, price_per_sq, stripe_account_id, stripe_onboarding_complete, grid_size, status')
      .eq('id', fundraiser_id)
      .single();

    if (error || !fundraiser) {
      return Response.json({ error: 'Fundraiser not found' }, { status: 404 });
    }
    if (fundraiser.status !== 'active') {
      return Response.json({ error: 'This campaign is not accepting payments' }, { status: 409 });
    }
    if (!fundraiser.stripe_account_id) {
      return Response.json({ error: 'Stripe not configured for this fundraiser' }, { status: 400 });
    }

    // Reject square numbers outside the grid (prevents phantom-square exploits)
    if (uniqueNums.some((n) => n > fundraiser.grid_size)) {
      return Response.json({ error: 'Square number out of range for this campaign' }, { status: 400 });
    }

    // ── Atomic server-side reservation (FIND-001) ────────────────────────────
    // Replaces the previous non-atomic `paid = true` check.
    //
    // reserve_squares_for_checkout atomically marks all requested squares as
    // 'reserved' in a single UPDATE, also extending any existing reservations.
    // It returns any square numbers that could not be reserved because they are
    // already 'sold'. If any are taken we abort — no Stripe session is created.
    //
    // This eliminates the TOCTOU race where two buyers could both pass the old
    // availability check and both receive checkout sessions for the same square.
    const { data: takenSquares, error: reserveErr } = await db.rpc(
      'reserve_squares_for_checkout',
      { p_fundraiser_id: fundraiser_id, p_square_numbers: uniqueNums },
    );

    if (reserveErr) {
      console.error('reserve_squares_for_checkout error:', reserveErr);
      return Response.json({ error: 'Failed to reserve squares. Please try again.' }, { status: 500 });
    }

    if (takenSquares && takenSquares.length > 0) {
      return Response.json(
        { error: 'One or more squares are no longer available', taken: takenSquares },
        { status: 409 },
      );
    }

    // ── Price calculation ────────────────────────────────────────────────────
    const subtotal      = parseFloat(fundraiser.price_per_sq) * uniqueNums.length;
    const txFee         = calcTxFee(subtotal);
    const total         = Math.round((subtotal + txFee) * 100); // cents
    const subtotalCents = Math.round(subtotal * 100);

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'aud',
            product_data: {
              name:        `${fundraiser.title} — Lucky Squares`,
              description: `Square${uniqueNums.length > 1 ? 's' : ''} #${uniqueNums.join(', #')}`,
            },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: buyer_email,
      payment_intent_data: {
        // Funds stay in the Lucky Squares platform account until the draw completes.
        // draw-notification transfers the net proceeds to the organiser's connected
        // account automatically after the draw, from where Stripe pays out to their
        // bank within 2 business days.
        transfer_group: fundraiser_id,
      },
      metadata: {
        fundraiser_id,
        buyer_name,
        buyer_email,
        buyer_phone:    buyer_phone || '',
        square_numbers: uniqueNums.join(','),
        subtotal_cents: String(subtotalCents),
      },
      success_url: `${appUrl}/${fundraiser.slug ?? fundraiser_id}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/${fundraiser.slug ?? fundraiser_id}`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
