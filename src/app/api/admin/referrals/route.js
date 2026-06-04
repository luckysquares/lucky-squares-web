import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

// Flag referrals where both accounts were created within this many hours of each other
const SUSPICIOUS_HOURS = 24;

export async function GET(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const db = getAdminClient();

    // Fetch referrals with referrer and referred profile data
    const { data: referrals, error } = await db
      .from('referrals')
      .select(`
        id,
        status,
        reward_code,
        created_at,
        rewarded_at,
        referrer_id,
        referred_id
      `)
      .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    if (!referrals?.length) return NextResponse.json({ referrals: [] });

    // Fetch all involved user IDs from auth.users via admin API
    const allIds = [...new Set(referrals.flatMap((r) => [r.referrer_id, r.referred_id]))];

    const { data: { users }, error: usersError } = await db.auth.admin.listUsers({ perPage: 1000 });
    if (usersError) return NextResponse.json({ error: usersError.message }, { status: 500 });

    const userMap = {};
    for (const u of users ?? []) {
      userMap[u.id] = { email: u.email, created_at: u.created_at };
    }

    // Build response with suspicious flag
    const enriched = referrals.map((r) => {
      const referrer = userMap[r.referrer_id] ?? {};
      const referred = userMap[r.referred_id] ?? {};

      const referrerCreated = referrer.created_at ? new Date(referrer.created_at) : null;
      const referredCreated = referred.created_at ? new Date(referred.created_at) : null;

      let hoursBetween = null;
      let suspicious   = false;

      if (referrerCreated && referredCreated) {
        hoursBetween = Math.abs(referredCreated - referrerCreated) / 3_600_000;
        suspicious   = hoursBetween < SUSPICIOUS_HOURS;
      }

      return {
        id:               r.id,
        status:           r.status,
        reward_code:      r.reward_code,
        created_at:       r.created_at,
        rewarded_at:      r.rewarded_at,
        referrer_id:      r.referrer_id,
        referrer_email:   referrer.email ?? '(unknown)',
        referrer_joined:  referrer.created_at ?? null,
        referred_id:      r.referred_id,
        referred_email:   referred.email ?? '(unknown)',
        referred_joined:  referred.created_at ?? null,
        hours_between:    hoursBetween !== null ? Math.round(hoursBetween * 10) / 10 : null,
        suspicious,
      };
    });

    return NextResponse.json({ referrals: enriched });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
