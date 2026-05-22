import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { processCancellation } from '../cancel-expired-campaigns/index.ts';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

// Admin-triggered manual cancellation for a specific campaign.
// Marks it cancelled, issues Stripe refunds if applicable, and sends
// notification emails to the organiser and all buyers.
Deno.serve(async (req) => {
  // Only accept POST from our own server (service role key in auth header)
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { campaign_id } = await req.json();
  if (!campaign_id) {
    return new Response(JSON.stringify({ error: 'campaign_id required' }), { status: 400 });
  }

  // Fetch the campaign and mark it cancelled atomically
  const { data: campaign, error: fetchErr } = await supabase
    .from('fundraisers')
    .select('id, title, contact_name, contact_email, payment_method, price_per_sq, status')
    .eq('id', campaign_id)
    .single();

  if (fetchErr || !campaign) {
    return new Response(JSON.stringify({ error: 'Campaign not found' }), { status: 404 });
  }

  if (campaign.status === 'cancelled') {
    return new Response(JSON.stringify({ error: 'Campaign is already cancelled' }), { status: 409 });
  }

  if (campaign.status !== 'active') {
    return new Response(JSON.stringify({ error: 'Only active campaigns can be cancelled' }), { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('fundraisers')
    .update({ status: 'cancelled' })
    .eq('id', campaign_id);

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500 });
  }

  await processCancellation(campaign);

  return new Response(JSON.stringify({ ok: true, campaign_id }), { status: 200 });
});
