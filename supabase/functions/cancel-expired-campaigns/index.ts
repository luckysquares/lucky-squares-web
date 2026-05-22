import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';
import { sendEmail } from '../_shared/resend.ts';
import { emailCampaignCancelled, emailRefundNotification } from '../_shared/templates.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

Deno.serve(async () => {
  const { data: cancelled, error } = await supabase.rpc('cancel_expired_campaigns');
  if (error) {
    console.error('cancel_expired_campaigns RPC failed:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  if (!cancelled?.length) {
    return new Response(JSON.stringify({ cancelled: 0 }), { status: 200 });
  }

  const results = [];

  for (const campaign of cancelled) {
    await processCancellation(campaign);
    results.push({ id: campaign.id, title: campaign.title });
  }

  return new Response(JSON.stringify({ cancelled: cancelled.length, results }), { status: 200 });
});

// Shared cancellation handler — used by both the cron job above and the
// admin manual-cancel endpoint (cancel-campaign edge function).
export async function processCancellation(campaign: {
  id: string;
  title: string;
  contact_name: string | null;
  contact_email: string | null;
  payment_method: string;
  price_per_sq: number;
}) {
  const { data: squares } = await supabase
    .from('squares')
    .select('id, number, buyer_email, buyer_name, payment_intent_id')
    .eq('fundraiser_id', campaign.id)
    .eq('status', 'sold');

  const squareList = squares ?? [];
  const isStripe   = campaign.payment_method === 'stripe';
  const isBank     = ['bank', 'bank_inperson'].includes(campaign.payment_method);
  const firstName  = (campaign.contact_name ?? 'there').split(' ')[0];

  // Stripe: auto-refund each unique payment_intent, then email each buyer
  if (isStripe) {
    // Deduplicate by payment_intent_id to avoid attempting the same refund twice
    // (a multi-square purchase shares one payment_intent across all its squares)
    const uniqueIntents = [...new Set(
      squareList.map((s) => s.payment_intent_id).filter(Boolean)
    )];

    for (const intentId of uniqueIntents) {
      try {
        await stripe.refunds.create({ payment_intent: intentId });
      } catch (err) {
        console.error(`Refund failed for payment_intent ${intentId} in campaign ${campaign.id}:`, err);
      }
    }

    // Email each unique buyer
    const buyerMap = new Map<string, typeof squareList>();
    for (const sq of squareList) {
      if (!sq.buyer_email) continue;
      if (!buyerMap.has(sq.buyer_email)) buyerMap.set(sq.buyer_email, []);
      buyerMap.get(sq.buyer_email)!.push(sq);
    }

    for (const [email, buyerSquares] of buyerMap) {
      const squareNums = buyerSquares.map((s) => s.number).join(', ');
      const amountPaid = (buyerSquares.length * Number(campaign.price_per_sq)).toFixed(2);

      const tpl = emailRefundNotification({
        buyer_name: buyerSquares[0].buyer_name ?? 'there',
        campaign_title: campaign.title,
        amount_paid: amountPaid,
        square_numbers: squareNums,
        is_stripe: true,
      });
      await sendEmail({ to: email, subject: tpl.subject, text: tpl.text });
    }
  }

  // Notify organiser regardless of payment method
  if (campaign.contact_email) {
    const tpl = emailCampaignCancelled({
      first_name: firstName,
      campaign_title: campaign.title,
      is_stripe: isStripe,
      is_bank: isBank,
      contact_name: campaign.contact_name ?? undefined,
      contact_email: campaign.contact_email,
    });
    await sendEmail({ to: campaign.contact_email, subject: tpl.subject, text: tpl.text });
  }
}
