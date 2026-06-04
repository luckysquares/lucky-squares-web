import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

export async function PATCH(req, { params }) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { action, display_name, quote } = await req.json();

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const db = getAdminClient();
  const update = {
    status: action === 'approve' ? 'approved' : 'rejected',
    ...(action === 'approve' && { approved_at: new Date().toISOString() }),
    ...(display_name !== undefined && { display_name }),
    ...(quote !== undefined && { quote }),
  };

  const { error } = await db.from('testimonials').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
