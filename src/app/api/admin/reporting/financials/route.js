import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

// ── Auth ──────────────────────────────────────────────────────────────────────

async function verifyAdmin(req) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return false;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin === true;
}

const PLATFORM_FEE = 19_00; // $19.00 in cents per launched campaign

export async function GET(req) {
  if (!await verifyAdmin(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getSupabase();

  // All non-draft fundraisers with the financial fields we need
  const { data: fundraisers, error: frErr } = await supabase
    .from('fundraisers')
    .select('id, title, org, status, price_per_sq, grid_size, launched_at, prize_reserve_cents, stripe_account_id, payment_method')
    .in('status', ['active', 'drawn', 'cancelled'])
    .order('launched_at', { ascending: false });

  if (frErr) return NextResponse.json({ error: frErr.message }, { status: 500 });

  // Paid square counts per fundraiser — counting rows is cheaper than summing
  const { data: paidSquares } = await supabase
    .from('squares')
    .select('fundraiser_id')
    .eq('paid', true);

  const soldBy = {};
  for (const sq of paidSquares ?? []) {
    soldBy[sq.fundraiser_id] = (soldBy[sq.fundraiser_id] || 0) + 1;
  }

  const campaigns = (fundraisers ?? []).map((f) => {
    const sold           = soldBy[f.id] || 0;
    const priceCents     = Math.round(parseFloat(f.price_per_sq || 0) * 100);
    const grossCents     = sold * priceCents;
    const feeCents       = ['active', 'drawn'].includes(f.status) ? PLATFORM_FEE : 0;
    const reserveCents   = f.prize_reserve_cents || 0;
    // Estimate: everything collected above the prize reserve has been (or will be) transferred.
    // Actual truth lives in Stripe transfer records; this is a platform-side estimate.
    const transferCents  = Math.max(0, grossCents - reserveCents);
    const outstanding    = f.status === 'active' ? reserveCents : 0; // reserve released at draw

    return {
      id:            f.id,
      title:         f.title,
      org:           f.org,
      status:        f.status,
      paymentMethod: f.payment_method,
      launchedAt:    f.launched_at,
      gridSize:      f.grid_size,
      priceCents,
      sold,
      grossCents,
      feeCents,
      reserveCents,
      transferCents,
      outstanding,
      hasStripe:     !!f.stripe_account_id,
    };
  });

  // Platform-level totals
  const sum = (key) => campaigns.reduce((s, c) => s + c[key], 0);

  return NextResponse.json({
    campaigns,
    summary: {
      totalGrossCents:    sum('grossCents'),
      totalFeesCents:     sum('feeCents'),
      totalReserveCents:  sum('reserveCents'),
      totalTransferCents: sum('transferCents'),
      totalOutstanding:   sum('outstanding'),
      launched:  campaigns.filter((c) => ['active', 'drawn'].includes(c.status)).length,
      active:    campaigns.filter((c) => c.status === 'active').length,
      drawn:     campaigns.filter((c) => c.status === 'drawn').length,
    },
  });
}
