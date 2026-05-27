import Stripe from 'stripe';
import { getAdminClient } from '@/lib/supabase/server';
import { calcTxFee } from '@/lib/stripeFees';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  try {
    const {
      campaign_id,
      quantity,
      buyer_name,
      buyer_email,
      buyer_phone,
      selection_mode,
      specific_numbers,
    } = await req.json();

    // Validate required fields
    if (!campaign_id || !quantity || !buyer_name || !buyer_email) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const qty = parseInt(quantity, 10);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return Response.json({ error: 'Quantity must be between 1 and 20' }, { status: 400 });
    }

    if (selection_mode === 'pick' && specific_numbers) {
      if (!Array.isArray(specific_numbers) || specific_numbers.length !== qty) {
        return Response.json({ error: 'specific_numbers count must match quantity' }, { status: 400 });
      }
    }

    const db = getAdminClient();

    // Fetch campaign
    const { data: campaign, error: campaignError } = await db
      .from('fifty_fifty_campaigns')
      .select('id, title, ticket_price, status, stripe_account_id, payment_method')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return Response.json({ error: 'Campaign not found' }, { status: 404 });
    }
    if (campaign.status !== 'active') {
      return Response.json({ error: 'This raffle is not accepting payments' }, { status: 409 });
    }
    if (campaign.payment_method !== 'stripe' || !campaign.stripe_account_id) {
      return Response.json({ error: 'Stripe not configured for this raffle' }, { status: 400 });
    }

    // Price calculation
    const subtotal      = parseFloat(campaign.ticket_price) * qty;
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
              name:        `${campaign.title} — 50/50 Raffle`,
              description: `${qty} ticket${qty !== 1 ? 's' : ''}`,
            },
            unit_amount: total,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      customer_email: buyer_email,
      payment_intent_data: {
        // Funds stay on platform until draw — different from squares where we transfer immediately
        transfer_group: campaign_id,
      },
      metadata: {
        action:           'fifty_fifty',
        campaign_id,
        buyer_name,
        buyer_email,
        buyer_phone:      buyer_phone || '',
        quantity:         String(qty),
        selection_mode:   selection_mode || 'auto',
        specific_numbers: Array.isArray(specific_numbers) ? specific_numbers.join(',') : '',
        subtotal_cents:   String(subtotalCents),
      },
      success_url: `${appUrl}/raffle/${campaign_id}?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${appUrl}/raffle/${campaign_id}`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    console.error('create-fifty-fifty-checkout error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
