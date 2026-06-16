/**
 * Welcome Sequence Edge Function
 * Triggered daily by pg_cron at 09:00 AEST (23:00 UTC).
 *
 * Sends drip emails to organisers who signed up but haven't launched:
 *   - welcome_day5_coupon       (day 4-6 after signup)  — includes a free campaign coupon
 *   - welcome_day9_no_campaign  (day 8-10 after signup) — success story
 *   - welcome_day21_no_campaign (day 20-22 after signup) — last check-in, coupon reminder
 *   - re_engagement             (30+ days after signup)
 *
 * Each batch RPC atomically marks users so they never receive the same
 * email twice, even if the cron fires more than once in a window.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TX_EMAIL_URL = `${SUPABASE_URL}/functions/v1/transactional-email`;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const COUPON_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateCouponCode(): string {
  let code = 'WELCOME-';
  for (let i = 0; i < 6; i++) {
    code += COUPON_CHARS[Math.floor(Math.random() * COUPON_CHARS.length)];
  }
  return code;
}

async function createWelcomeCoupon(userId: string): Promise<string | null> {
  const code      = generateCouponCode();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days

  const { error: insertErr } = await supabase.from('coupons').insert({
    code,
    description:    'Welcome — free first campaign',
    discount_type:  'percent',
    discount_value: 100,
    max_uses:       1,
    expires_at:     expiresAt,
  });

  if (insertErr) {
    console.error(`[welcome-sequence] coupon insert error for ${userId}:`, insertErr.message);
    return null;
  }

  // Store on profile so the day-21 email can reference the same code
  const { error: updateErr } = await supabase.rpc('set_welcome_coupon_code', {
    p_user_id: userId,
    p_code:    code,
  });

  if (updateErr) {
    console.error(`[welcome-sequence] set_welcome_coupon_code error for ${userId}:`, updateErr.message);
  }

  return code;
}

async function sendEmail(type: string, to: string, data: Record<string, unknown>) {
  const res = await fetch(TX_EMAIL_URL, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ type, to, data }),
  });
  if (!res.ok) {
    console.error(`[welcome-sequence] Failed to send ${type} to ${to}: ${res.status}`);
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const results = { day5: 0, day9: 0, day21: 0, re_engagement: 0, errors: 0 };

  // ── Day-5 batch (coupon) ─────────────────────────────────────────────────────
  const { data: day5Users, error: day5Err } = await supabase.rpc('batch_welcome_day5');
  if (day5Err) {
    console.error('[welcome-sequence] batch_welcome_day5 error:', day5Err.message);
    results.errors++;
  } else {
    for (const u of day5Users ?? []) {
      const couponCode = await createWelcomeCoupon(u.user_id);
      if (couponCode) {
        await sendEmail('welcome_day5_coupon', u.email, {
          first_name:  u.first_name,
          coupon_code: couponCode,
        });
        results.day5++;
      } else {
        results.errors++;
      }
    }
  }

  // ── Day-9 batch ──────────────────────────────────────────────────────────────
  const { data: day9Users, error: day9Err } = await supabase.rpc('batch_welcome_day9');
  if (day9Err) {
    console.error('[welcome-sequence] batch_welcome_day9 error:', day9Err.message);
    results.errors++;
  } else {
    for (const u of day9Users ?? []) {
      await sendEmail('welcome_day9_no_campaign', u.email, { first_name: u.first_name });
      results.day9++;
    }
  }

  // ── Day-21 batch ─────────────────────────────────────────────────────────────
  const { data: day21Users, error: day21Err } = await supabase.rpc('batch_welcome_day21');
  if (day21Err) {
    console.error('[welcome-sequence] batch_welcome_day21 error:', day21Err.message);
    results.errors++;
  } else {
    for (const u of day21Users ?? []) {
      await sendEmail('welcome_day21_no_campaign', u.email, {
        first_name:  u.first_name,
        coupon_code: u.coupon_code ?? undefined,
      });
      results.day21++;
    }
  }

  // ── Re-engagement batch ──────────────────────────────────────────────────────
  const { data: reUsers, error: reErr } = await supabase.rpc('batch_re_engagement');
  if (reErr) {
    console.error('[welcome-sequence] batch_re_engagement error:', reErr.message);
    results.errors++;
  } else {
    for (const u of reUsers ?? []) {
      await sendEmail('re_engagement', u.email, {
        first_name: u.first_name,
        org_name:   u.org_name,
      });
      results.re_engagement++;
    }
  }

  console.log('[welcome-sequence] Done:', results);
  return new Response(JSON.stringify({ ok: true, ...results }), { status: 200 });
});
