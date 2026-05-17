import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2024-04-10',
  httpClient: Stripe.createFetchHttpClient(),
});

const FROM_EMAIL = 'no-reply@luckysquares.com.au';
const SUPPORT_EMAIL = 'support@luckysquares.com.au';

Deno.serve(async () => {
  // 1. Cancel all eligible campaigns and get their details
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
    // 2. Fetch all sold squares for this campaign
    const { data: squares } = await supabase
      .from('squares')
      .select('id, number, buyer_email, buyer_name, payment_intent_id')
      .eq('fundraiser_id', campaign.id)
      .eq('status', 'sold');

    const squareList = squares ?? [];

    if (campaign.payment_method === 'stripe') {
      // 3a. Auto-refund Stripe payments
      for (const sq of squareList) {
        if (!sq.payment_intent_id) continue;
        try {
          await stripe.refunds.create({ payment_intent: sq.payment_intent_id });
        } catch (err) {
          console.error(`Refund failed for square ${sq.number} in campaign ${campaign.id}:`, err);
        }
      }

      // 4a. Email each buyer their refund confirmation
      const uniqueBuyers = [...new Map(squareList.map((s) => [s.buyer_email, s])).values()];
      for (const buyer of uniqueBuyers) {
        await sendEmail({
          to: buyer.buyer_email,
          subject: `Your Lucky Squares refund — ${campaign.title}`,
          body: `Hi ${buyer.buyer_name},\n\nUnfortunately the Lucky Squares fundraiser "${campaign.title}" was cancelled because it did not reach its break-even target within 30 days.\n\nYour payment has been automatically refunded. Please allow 5–10 business days for it to appear on your statement.\n\nThank you for your support.\n\nThe LuckySquares Australia team\n${SUPPORT_EMAIL}`,
        });
      }
    } else {
      // 3b. Non-Stripe: email organiser to handle manual refunds
      if (campaign.contact_email) {
        const buyerCount = squareList.length;
        await sendEmail({
          to: campaign.contact_email,
          subject: `Action required: campaign cancelled — ${campaign.title}`,
          body: `Hi,\n\nYour Lucky Squares fundraiser "${campaign.title}" has been automatically cancelled because it did not reach its break-even target within 30 days.\n\nYou have ${buyerCount} square purchase${buyerCount !== 1 ? 's' : ''} that require manual refunds. Please contact each buyer directly to arrange payment.\n\nIf you have questions, contact us at ${SUPPORT_EMAIL}.\n\nThe LuckySquares Australia team`,
        });
      }
    }

    // 5. Email organiser regardless of payment method
    if (campaign.contact_email && campaign.payment_method === 'stripe') {
      await sendEmail({
        to: campaign.contact_email,
        subject: `Your campaign has been cancelled — ${campaign.title}`,
        body: `Hi,\n\nYour Lucky Squares fundraiser "${campaign.title}" was automatically cancelled after 30 days because it had not reached its break-even point.\n\nAll buyers who paid by card have been automatically refunded.\n\nIf you would like to run the fundraiser again, you are welcome to create a new campaign at luckysquares.com.au.\n\nThe LuckySquares Australia team\n${SUPPORT_EMAIL}`,
      });
    }

    results.push({ id: campaign.id, title: campaign.title, squares: squareList.length });
  }

  return new Response(JSON.stringify({ cancelled: cancelled.length, results }), { status: 200 });
});

async function sendEmail({ to, subject, body }: { to: string; subject: string; body: string }) {
  // Replace with your email provider (Resend, SendGrid, etc.)
  // Example using Resend:
  // await fetch('https://api.resend.com/emails', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ from: FROM_EMAIL, to, subject, text: body }),
  // });
  console.log(`[email] To: ${to} | Subject: ${subject}`);
}
