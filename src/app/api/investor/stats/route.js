import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const db = getAdminClient();

    const [
      { count: campaigns },
      { data: squares },
      { data: orgs },
    ] = await Promise.all([
      db.from('fundraisers').select('*', { count: 'exact', head: true }).in('status', ['active', 'drawn']),
      db.from('fundraiser_stats').select('sold_count, fundraiser_id').then(async ({ data }) => {
        const ids = data?.map((s) => s.fundraiser_id) ?? [];
        if (!ids.length) return { data: [] };
        const { data: fs } = await db.from('fundraisers').select('id, price_per_sq').in('id', ids);
        const total = data?.reduce((sum, s) => {
          const f = fs?.find((f) => f.id === s.fundraiser_id);
          return sum + (s.sold_count || 0) * parseFloat(f?.price_per_sq || 0);
        }, 0) ?? 0;
        return { data: { totalSold: data?.reduce((s, r) => s + (r.sold_count || 0), 0) ?? 0, totalRaised: total } };
      }),
      db.from('profiles').select('*', { count: 'exact', head: true }).eq('plan', 'org'),
    ]);

    return NextResponse.json({
      campaigns:    campaigns ?? 0,
      totalSold:    squares?.data?.totalSold ?? 0,
      totalRaised:  squares?.data?.totalRaised ?? 0,
      orgClients:   orgs ?? 0,
    });
  } catch {
    return NextResponse.json({ campaigns: 0, totalSold: 0, totalRaised: 0, orgClients: 0 });
  }
}
