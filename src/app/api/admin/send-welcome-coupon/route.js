import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

const COUPON_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCouponCode() {
  let code = 'WELCOME-';
  for (let i = 0; i < 6; i++) code += COUPON_CHARS[Math.floor(Math.random() * COUPON_CHARS.length)];
  return code;
}

export async function POST(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { user_id, email, first_name } = await req.json();
  if (!email?.trim()) return NextResponse.json({ error: 'email is required' }, { status: 400 });

  const db          = getAdminClient();
  const code        = generateCouponCode();
  const expiresAt   = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const txEmailUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/transactional-email`
    : null;

  const { error: couponErr } = await db.from('coupons').insert({
    code,
    description:    'Welcome — free first campaign (manual)',
    discount_type:  'percent',
    discount_value: 100,
    max_uses:       1,
    expires_at:     expiresAt,
  });

  if (couponErr) {
    console.error('[send-welcome-coupon] coupon insert error:', couponErr.message);
    return NextResponse.json({ error: 'Failed to create coupon' }, { status: 500 });
  }

  // Store on profile if user_id provided
  if (user_id) {
    await db.rpc('set_welcome_coupon_code', { p_user_id: user_id, p_code: code });
  }

  if (txEmailUrl) {
    const res = await fetch(txEmailUrl, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        type: 'welcome_coupon_manual',
        to:   email.trim(),
        data: { first_name: (first_name || email.split('@')[0]).split(' ')[0], coupon_code: code },
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[send-welcome-coupon] email send failed:', res.status, body);
      return NextResponse.json({ error: `Coupon created but email failed (${res.status}): ${body}` }, { status: 502 });
    }
  }

  return NextResponse.json({ ok: true, coupon_code: code });
}
