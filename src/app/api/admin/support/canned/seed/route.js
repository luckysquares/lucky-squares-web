import { getAdminClient as getSupabase } from '@/lib/supabase/server';

async function verifyAdmin(req) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin ? user : null;
}

// 25 standard canned responses for the Lucky Squares support desk.
// {{name}} is replaced with the customer's first name at send time.
const DEFAULT_RESPONSES = [
  // ── Organiser: Payments ───────────────────────────────────────────────────
  {
    title: 'Payment confirmed',
    category: 'organiser_payments',
    body: `Hi {{name}}, thanks for reaching out. I can confirm your payment has been received and processed successfully. You can view your payment history from your campaign dashboard at any time. Let me know if there is anything else I can help with.`,
  },
  {
    title: 'Platform fee explained',
    category: 'organiser_payments',
    body: `Hi {{name}}, the Lucky Squares platform fee is 1.7% + 30c per transaction. This fee is added on top of your square price and is paid by the buyer at checkout, so your full square revenue goes directly to your fundraiser. Let me know if you have any other questions.`,
  },
  {
    title: 'Accepted payment methods',
    category: 'organiser_payments',
    body: `Hi {{name}}, Lucky Squares accepts all major credit and debit cards (Visa, Mastercard, American Express) as well as Apple Pay and Google Pay. All payments are processed securely through Stripe. Is there anything else I can help with?`,
  },

  // ── Organiser: Campaigns ──────────────────────────────────────────────────
  {
    title: 'Getting started with your campaign',
    category: 'organiser_campaigns',
    body: `Hi {{name}}, great to hear you are setting up a campaign! To get started, head to your dashboard and click "New campaign". You can set your grid size, price per square, prizes and draw date. Once you are happy with everything, you can launch your campaign and start sharing the link with your supporters. Let me know if you get stuck at any point.`,
  },
  {
    title: 'Sharing your campaign',
    category: 'organiser_campaigns',
    body: `Hi {{name}}, the best way to share your campaign is to copy your unique campaign link from the dashboard and share it directly with your community via social media, messaging apps, or email. You can also use the QR code on your campaign page for in-person events. The more places you share it, the faster your grid fills up!`,
  },
  {
    title: 'Editing a live campaign',
    category: 'organiser_campaigns',
    body: `Hi {{name}}, once a campaign is launched some details cannot be changed, including the square price and prize values (as these are locked in at launch for fairness to buyers). You can still update your campaign description and contact details. If you need to make a significant change, please let me know and we can discuss the options.`,
  },
  {
    title: 'Campaign not showing up',
    category: 'organiser_campaigns',
    body: `Hi {{name}}, if your campaign is not visible, the most common reason is that it is still in draft status and has not been launched yet. Head to your dashboard, find the campaign and click "Launch campaign" to make it live. If it is already launched and you are still having trouble, please send me the campaign link and I will take a look.`,
  },

  // ── Organiser: Draw & prizes ──────────────────────────────────────────────
  {
    title: 'How the draw works',
    category: 'organiser_draw',
    body: `Hi {{name}}, when you are ready to run your draw, head to your campaign page and click "Run draw". The system will randomly select winning square numbers for each prize. Winners are automatically notified by email with instructions on how to collect their prize. You can also download a draw certificate as a record of the results. Let me know if you have any questions about the process.`,
  },
  {
    title: 'Changing your draw date',
    category: 'organiser_draw',
    body: `Hi {{name}}, you can update your draw date from your campaign settings at any time before the draw takes place. Just log in to your dashboard, open the campaign, and update the draw date. If your campaign is already live, buyers who have purchased squares will not be notified of the change automatically, so we recommend posting an update in your community as well.`,
  },
  {
    title: 'What is a donated prize?',
    category: 'organiser_draw',
    body: `Hi {{name}}, a donated prize is one where the prize item or voucher is being provided by a sponsor or donor rather than purchased by you. When you mark a prize as donated, it is not included in the prize reserve calculation, which means more of your square revenue is available to you immediately. Simply tick the donated checkbox when adding your prize details.`,
  },
  {
    title: 'How winners are notified',
    category: 'organiser_draw',
    body: `Hi {{name}}, when you run the draw, each winner is automatically sent an email notification with their name, the prize they have won, and instructions for claiming it. The email comes from Lucky Squares on your behalf. If a winner does not receive their email, they should check their spam folder. You can also view winner details from your campaign dashboard at any time.`,
  },

  // ── Organiser: Payouts ────────────────────────────────────────────────────
  {
    title: 'When will I receive my payout?',
    category: 'organiser_payouts',
    body: `Hi {{name}}, payouts are processed after your draw has been completed and the prize reserve requirements have been met. Funds are transferred to your connected bank account, typically within 2-5 business days depending on your bank. You can track your payout status from your campaign dashboard. Let me know if you have not received your payout within that timeframe.`,
  },
  {
    title: 'Setting up your payout account',
    category: 'organiser_payouts',
    body: `Hi {{name}}, to receive your fundraiser proceeds you will need to connect a bank account via Stripe. You can do this from your organiser settings page. The process takes just a few minutes and you will need your BSB and account number handy. Once connected, your payouts will be processed automatically after your draw. Let me know if you run into any issues during setup.`,
  },
  {
    title: 'Payout not received',
    category: 'organiser_payouts',
    body: `Hi {{name}}, I am sorry to hear your payout has not arrived yet. Could you let me know the name of the campaign and approximately when the draw was completed? I will look into this for you straight away. In the meantime, please also check with your bank in case the payment is still pending on their end.`,
  },

  // ── Buyer: Payments ───────────────────────────────────────────────────────
  {
    title: 'Payment failed or declined',
    category: 'buyer_payments',
    body: `Hi {{name}}, I am sorry to hear you had trouble with your payment. The most common reasons for a declined payment are insufficient funds, an incorrect card number, or a bank security block. Please try again with a different card, or contact your bank to ensure online transactions are enabled. If the problem persists, feel free to get back in touch and we will help sort it out.`,
  },
  {
    title: 'Refund request',
    category: 'buyer_payments',
    body: `Hi {{name}}, thank you for getting in touch. Refunds are handled on a case-by-case basis. As a general rule, purchases are non-refundable once a square has been confirmed, as the fundraiser is relying on the committed support. However, if there are exceptional circumstances, please explain the situation and I will review it with the organiser. We want to make sure every experience with Lucky Squares is a positive one.`,
  },
  {
    title: 'Confirmation email not received',
    category: 'buyer_payments',
    body: `Hi {{name}}, your purchase confirmation email should arrive within a few minutes. If you have not received it, please check your spam or junk folder first. If it is not there either, please confirm the email address you used at checkout and I will look into it for you.`,
  },
  {
    title: 'Checking which squares are available',
    category: 'buyer_payments',
    body: `Hi {{name}}, you can see which squares are still available by visiting the campaign page and browsing the grid. Available squares are shown in white, while sold squares are shown in the buyer's chosen colour. Simply click any available square to start the checkout process. If you have a specific number in mind and it is taken, the grid will show you the next available options.`,
  },

  // ── Buyer: Prizes ─────────────────────────────────────────────────────────
  {
    title: 'How prizes work',
    category: 'buyer_prizes',
    body: `Hi {{name}}, each campaign has one or more prizes listed on the campaign page. When the organiser runs the draw, winning square numbers are selected at random. If your square is drawn, you win the corresponding prize. You will be notified by email straight away with details on how to claim your prize. Good luck!`,
  },
  {
    title: 'I think I won, what happens next?',
    category: 'buyer_prizes',
    body: `Hi {{name}}, congratulations! If your square was drawn as a winner, you should have received an email notification from us. If you have not received it, please check your spam folder. The email will include details about your prize and how to arrange collection or delivery with the organiser. If you still cannot find the email, let me know the campaign name and your square number and I will look into it for you.`,
  },
  {
    title: 'Prize not received',
    category: 'buyer_prizes',
    body: `Hi {{name}}, I am sorry to hear you have not received your prize. Prize collection and delivery is arranged between you and the organiser directly. I have flagged your query with the organiser and they should be in contact with you shortly. If you do not hear back within 48 hours, please let me know and I will follow up on your behalf.`,
  },

  // ── Account & access ──────────────────────────────────────────────────────
  {
    title: 'Trouble logging in',
    category: 'account',
    body: `Hi {{name}}, I am sorry to hear you are having trouble logging in. Please try resetting your password using the "Forgot password" link on the login page. If you are still unable to access your account after resetting, please let me know the email address on your account and I will look into it for you.`,
  },
  {
    title: 'Changing your email address',
    category: 'account',
    body: `Hi {{name}}, to update the email address on your account, please log in and head to your account settings. If you are unable to log in to make the change, please confirm your current email address and the new one you would like to use and I can assist you further.`,
  },
  {
    title: 'Account deletion request',
    category: 'account',
    body: `Hi {{name}}, I have received your request to delete your account. Before I proceed, please confirm that you would like all your account data removed, including any campaign history. Please note that this action cannot be undone. Once confirmed, I will process the deletion within 5 business days in line with our privacy policy.`,
  },

  // ── Legal & compliance ────────────────────────────────────────────────────
  {
    title: 'Privacy and data request',
    category: 'legal',
    body: `Hi {{name}}, thank you for your data request. Under the Privacy Act 1988 and our privacy policy, you are entitled to access the personal information we hold about you. I have logged your request and will respond with the relevant information within 30 days. If you have any questions in the meantime, please do not hesitate to ask.`,
  },
];

export async function POST(req) {
  const user = await verifyAdmin(req);
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const supabase = getSupabase();

    // Fetch existing titles to avoid duplicates
    const { data: existing } = await supabase
      .from('support_canned_responses')
      .select('title');

    const existingTitles = new Set((existing || []).map((r) => r.title.toLowerCase()));

    const toInsert = DEFAULT_RESPONSES
      .filter((r) => !existingTitles.has(r.title.toLowerCase()))
      .map((r) => ({ ...r, created_by: user.id }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('support_canned_responses').insert(toInsert);
      if (error) {
        console.error('[canned/seed] Insert error:', error.message);
        return Response.json({ ok: false, error: error.message }, { status: 500 });
      }
    }

    return Response.json({ ok: true, inserted: toInsert.length, skipped: DEFAULT_RESPONSES.length - toInsert.length });
  } catch (err) {
    console.error('[canned/seed] Unexpected error:', err);
    return Response.json({ ok: false, error: err.message }, { status: 500 });
  }
}
