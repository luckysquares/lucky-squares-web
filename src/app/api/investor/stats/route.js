import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const cookieStore = await cookies();
  if (cookieStore.get('investor_session')?.value !== 'granted') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const db = getAdminClient();

    // Read directly from squares table for accurate sold count
    const [
      { count: campaigns },
      { count: totalSold },
      { data: fundraisers },
      { count: orgClients },
    ] = await Promise.all([
      db.from('fundraisers').select('*', { count: 'exact', head: true }).in('status', ['active', 'drawn']),
      db.from('squares').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      db.from('fundraisers').select('price_per_sq, id').in('status', ['active', 'drawn']),
      db.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'org'),
    ]);

    // Calculate total raised: sum sold squares × price per sq for each fundraiser
    let totalRaised = 0;
    if (fundraisers?.length) {
      const { data: soldByFundraiser } = await db
        .from('squares')
        .select('fundraiser_id')
        .eq('status', 'sold')
        .in('fundraiser_id', fundraisers.map((f) => f.id));

      const countByFundraiser = {};
      for (const s of soldByFundraiser ?? []) {
        countByFundraiser[s.fundraiser_id] = (countByFundraiser[s.fundraiser_id] || 0) + 1;
      }
      totalRaised = fundraisers.reduce((sum, f) => {
        return sum + (countByFundraiser[f.id] || 0) * parseFloat(f.price_per_sq || 0);
      }, 0);
    }

    return NextResponse.json({
      campaigns:   campaigns ?? 0,
      totalSold:   totalSold ?? 0,
      totalRaised,
      orgClients:  orgClients ?? 0,
    });
  } catch (err) {
    console.error('[investor/stats]', err);
    return NextResponse.json({ campaigns: 0, totalSold: 0, totalRaised: 0, orgClients: 0 });
  }
}
