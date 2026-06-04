import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

export async function POST(req) {
  if (!await verifyAdmin(req)) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const { id, type } = await req.json();
  if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const db = getAdminClient();

  try {
    if (type === 'fifty_fifty') {
      // fifty_fifty_tickets cascades automatically
      const { error } = await db.from('fifty_fifty_campaigns').delete().eq('id', id);
      if (error) throw error;
    } else {
      // Delete blocking tables first (payout_queue and prize_claims have NO ACTION)
      await db.from('payout_queue').delete().eq('fundraiser_id', id);
      await db.from('prize_claims').delete().eq('fundraiser_id', id);
      // squares, prizes, campaign_reports cascade automatically
      const { error } = await db.from('fundraisers').delete().eq('id', id);
      if (error) throw error;
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error('admin delete campaign error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
