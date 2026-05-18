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
    const { data: squares } = await supabase
      .from('squares')
      .select('id, number, buyer_email, buyer_name, payment_intent_id')
      .eq('fundraiser_id', campaign.id)
      .eq('status', 'sold');

    const squareList = squares ?? [];
    const isStripe   = campaign.payment_method === 'stripe';
    const isBank     = ['bank', 'bank_inperson'].includes(campaign.payment_method);
    const firstName  = (campaign.contact_name ?? 'there').split(' ')[0];

    // Stripe: auto-refund each payment and email each buyer
    if (isStripe) {
      const uniqueBuyers = [...new Map(squareList.map((s) => [s.buyer_email, s])).values()];

      for (const sq of squareList) {
        if (!sq.payment_intent_id) continue;
        try {
          await stripe.refunds.create({ payment_intent: sq.payment_intent_id });
        } catch (err) {
          console.error(`Refund failed for square ${sq.number} in ${campaign.id}:`, err);
        }
      }

      for (const buyer of uniqueBuyers) {
        if (!buyer.buyer_email) continue;
        const buyerSquares = squareList
          .filter((s) => s.buyer_email === buyer.buyer_email)
          .map((s) => s.number)
          .join(', ');
        const amountPaid = (
          squareList.filter((s) => s.buyer_email === buyer.buyer_email).length *
          parseFloat(campaign.price_per_sq)
        ).toFixed(2);

        const tpl = emailRefundNotification({
          buyer_name: buyer.buyer_name ?? 'there',
          campaign_title: campaign.title,
          amount_paid: amountPaid,
          square_numbers: buyerSquares,
          is_stripe: true,
        });
        await sendEmail({ to: buyer.buyer_email, subject: tpl.subject, text: tpl.text });
      }
    }

    // Notify organiser regardless of payment method
    if (campaign.contact_email) {
      const tpl = emailCampaignCancelled({
        first_name: firstName,
        campaign_title: campaign.title,
        is_stripe: isStripe,
        is_bank: isBank,
        contact_name: campaign.contact_name,
        contact_email: campaign.contact_email,
      });
      await sendEmail({ to: campaign.contact_email, subject: tpl.subject, text: tpl.text });
    }

    results.push({ id: campaign.id, title: campaign.title, squares: squareList.length });
  }

  return new Response(JSON.stringify({ cancelled: cancelled.length, results }), { status: 200 });
});
