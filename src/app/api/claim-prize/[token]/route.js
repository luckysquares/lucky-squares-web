import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const SUPABASE_FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`
  : null;

async function sendTransactionalEmail(type, to, data) {
  if (!SUPABASE_FUNCTIONS_URL) return;
  try {
    await fetch(SUPABASE_FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ type, to, data }),
    });
  } catch (err) {
    console.error(`[claim-prize] Failed to send ${type} email:`, err.message);
  }
}

// BSB validation: 6 digits, with or without a dash in the middle (e.g., 062-000 or 062000)
function isValidBsb(bsb) {
  return /^\d{3}-?\d{3}$/.test(bsb.trim());
}

function normaliseBsb(bsb) {
  const digits = bsb.replace(/\D/g, '');
  return `${digits.slice(0, 3)}-${digits.slice(3)}`;
}

// ── GET: fetch safe claim details for the claim page ─────────────────────────
export async function GET(req, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });

  const db = getSupabase();
  const { data: claim, error } = await db
    .from('prize_claims')
    .select('status, buyer_name, place, prize_description, campaign_title, org_name, contact_email')
    .eq('token', token)
    .single();

  if (error || !claim) {
    return NextResponse.json({ error: 'Claim not found' }, { status: 404 });
  }

  // Return safe fields only — bank details are never exposed via GET.
  return NextResponse.json({
    status:            claim.status,
    buyer_name:        claim.buyer_name,
    place:             claim.place,
    prize_description: claim.prize_description,
    campaign_title:    claim.campaign_title,
    org_name:          claim.org_name,
    contact_email:     claim.contact_email,
  });
}

// ── POST: submit bank details ─────────────────────────────────────────────────
export async function POST(req, { params }) {
  const { token } = await params;
  if (!token) return NextResponse.json({ error: 'Invalid link' }, { status: 400 });

  // Rate limit: 5 attempts per IP per 15 minutes to deter enumeration.
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`claim-prize:${ip}`, {
    limit:    5,
    windowMs: 15 * 60 * 1000,
  });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429 },
    );
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const { account_name, bsb, account_number } = body;

  // Validate inputs
  if (!account_name?.trim()) {
    return NextResponse.json({ error: 'Account holder name is required.' }, { status: 400 });
  }
  if (!bsb?.trim() || !isValidBsb(bsb)) {
    return NextResponse.json({ error: 'Please enter a valid BSB (e.g., 062-000).' }, { status: 400 });
  }
  if (!account_number?.trim() || !/^\d{4,10}$/.test(account_number.trim())) {
    return NextResponse.json({ error: 'Please enter a valid account number (4 to 10 digits).' }, { status: 400 });
  }

  const db = getSupabase();

  // Fetch the claim — check it exists and is still pending.
  const { data: claim, error: fetchError } = await db
    .from('prize_claims')
    .select('id, status, buyer_name, buyer_email, place, prize_description, campaign_title, org_name, contact_email, fundraiser_id')
    .eq('token', token)
    .single();

  if (fetchError || !claim) {
    return NextResponse.json({ error: 'Claim not found.' }, { status: 404 });
  }
  if (claim.status !== 'pending') {
    return NextResponse.json(
      { error: 'These bank details have already been submitted. Contact the organiser if you need to make a change.' },
      { status: 409 },
    );
  }

  const normBsb      = normaliseBsb(bsb);
  const claimedAt    = new Date();
  const purgeAt      = new Date(claimedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Save bank details and mark as claimed.
  const { error: updateError } = await db
    .from('prize_claims')
    .update({
      bank_account_name: account_name.trim(),
      bank_bsb:          normBsb,
      bank_account:      account_number.trim(),
      status:            'claimed',
      claimed_at:        claimedAt.toISOString(),
      purge_at:          purgeAt.toISOString(),
    })
    .eq('id', claim.id)
    .eq('status', 'pending');  // guard against a concurrent submission

  if (updateError) {
    console.error('[claim-prize] Update failed:', updateError.message);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }

  // Fetch organiser contact details to notify them.
  const { data: fundraiser } = await db
    .from('fundraisers')
    .select('contact_name, contact_email')
    .eq('id', claim.fundraiser_id)
    .single();

  const organiserFirstName = (fundraiser?.contact_name ?? 'there').split(' ')[0];
  const organiserEmail     = fundraiser?.contact_email ?? claim.contact_email;

  // Email organiser with bank details.
  if (organiserEmail) {
    await sendTransactionalEmail('organizer_prize_claim', organiserEmail, {
      organiser_first_name: organiserFirstName,
      campaign_title:       claim.campaign_title,
      winner_name:          claim.buyer_name,
      winner_email:         claim.buyer_email,
      prize_place:          claim.place,
      prize_description:    claim.prize_description,
      bank_account_name:    account_name.trim(),
      bank_bsb:             normBsb,
      bank_account:         account_number.trim(),
    });
  }

  // Email winner confirmation.
  await sendTransactionalEmail('winner_claim_confirmation', claim.buyer_email, {
    buyer_name:        claim.buyer_name,
    campaign_title:    claim.campaign_title,
    org_name:          claim.org_name,
    prize_description: claim.prize_description,
    contact_email:     claim.contact_email,
  });

  return NextResponse.json({ ok: true });
}
