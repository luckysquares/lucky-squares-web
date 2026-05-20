import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const FROM_EMAIL  = 'jamie@luckysquares.com.au';
const JAMIE_EMAIL = 'jamie@luckysquares.com.au';

const COUPON_TYPES = {
  free: {
    label:          'Free first campaign',
    discount_type:  'percent',
    discount_value: 100,
  },
  halfprice: {
    label:          'Half price first campaign',
    discount_type:  'percent',
    discount_value: 50,
  },
};

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'INVITE-';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key);
}

async function createCoupon(supabase, couponType) {
  const def = COUPON_TYPES[couponType];
  if (!def) return null;

  const code      = generateCode();
  const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(); // 60 days

  const { error } = await supabase.from('coupons').insert({
    code,
    description:    `${def.label} — personal invite`,
    discount_type:  def.discount_type,
    discount_value: def.discount_value,
    max_uses:       1,
    expires_at:     expiresAt,
  });

  if (error) {
    console.error('[invites] coupon insert error:', error.message);
    return null;
  }
  return { code, label: def.label };
}

function inviteHtml(name, couponCode, couponLabel) {
  const safe = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const couponBlock = couponCode ? `
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#F0FBF4;border:1.5px solid #A8DFBF;border-radius:12px;margin:24px 0">
        <tr><td style="padding:20px 24px">
          <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#1A7A55;text-transform:uppercase;letter-spacing:1.2px">Your exclusive offer</p>
          <p style="margin:0 0 10px;font-size:15px;font-weight:700;color:#1A1209">${safe(couponLabel)}</p>
          <p style="margin:0 0 4px;font-size:12px;color:#6B7280">Use this code at checkout:</p>
          <div style="display:inline-block;background:#fff;border:2px dashed #1A7A55;border-radius:8px;padding:8px 20px;font-family:monospace;font-size:18px;font-weight:900;color:#1A7A55;letter-spacing:2px">${safe(couponCode)}</div>
        </td></tr>
      </table>
    </td></tr>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1209">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="text-align:center;padding-bottom:28px">
          <span style="font-size:36px">🍀</span>
          <div style="font-size:20px;font-weight:900;color:#1A1209;letter-spacing:-0.5px;margin-top:6px">LuckySquares</div>
          <div style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase">Australia</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:40px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
          <p style="margin:0 0 20px;font-size:16px;line-height:1.7;color:#1A1209">Hi ${safe(name.split(' ')[0])},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#4A3728">
            I wanted to personally reach out and invite you to try LuckySquares Australia. I built it to make Lucky Squares fundraisers genuinely easy to run, and I think you will love it.
          </p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#4A3728">
            You can set up a fundraiser in minutes, share a link with your community, and watch the squares fill up in real time. The platform handles payments, the draw, and winner notifications automatically.
          </p>
          ${couponBlock}
          <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#4A3728">
            When you are ready to get started, head to the website and create your organiser account. If you have any questions at all, just reply to this email and I will get back to you personally.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px">
            <tr><td style="background:#1A7A55;border-radius:10px;padding:14px 32px">
              <a href="https://luckysquares.com.au" style="color:#fff;text-decoration:none;font-size:15px;font-weight:700">Get started at luckysquares.com.au</a>
            </td></tr>
          </table>
          <p style="margin:0 0 4px;font-size:15px;line-height:1.8;color:#4A3728">Best,</p>
          <p style="margin:0;font-size:15px;font-weight:700;color:#1A1209">Jamie</p>
          <p style="margin:4px 0 0;font-size:13px;color:#9C8060">Founder, LuckySquares Australia</p>
        </td></tr>
        <tr><td style="padding:24px 0;text-align:center">
          <p style="font-size:11px;color:#9C8060;margin:0">You are receiving this because someone thought you might find it useful.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function GET() {
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc('admin_get_invites');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();

    // ── Resend an existing invite ─────────────────────────────────────────────
    if (body.resend) {
      const { name, email, coupon_code } = body;
      if (!name?.trim() || !email?.trim()) {
        return NextResponse.json({ error: 'Name and email required.' }, { status: 400 });
      }

      const resendKey = process.env.RESEND_API_KEY;
      let couponLabel = null;
      if (coupon_code) {
        const supabase = getSupabase();
        const { data: coupon } = await supabase.from('coupons').select('description').eq('code', coupon_code).single();
        couponLabel = coupon?.description ?? null;
      }

      const subject = `An invitation from Jamie at LuckySquares Australia`;
      const html    = inviteHtml(name.trim(), coupon_code ?? null, couponLabel);
      const text    = `Hi ${name.trim().split(' ')[0]},\n\nI wanted to personally invite you to try LuckySquares Australia. Head to https://luckysquares.com.au to get started.\n\n${coupon_code ? `Your coupon code: ${coupon_code}\n\n` : ''}Best,\nJamie\nFounder, LuckySquares Australia`;

      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_EMAIL, to: email.trim(), reply_to: JAMIE_EMAIL, subject, html, text }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(`[invites] Resend error for ${email} (${res.status}): ${errText}`);
          return NextResponse.json({ error: `Send failed (${res.status})` }, { status: 502 });
        }
      }

      return NextResponse.json({ ok: true });
    }

    // ── Send new invites ──────────────────────────────────────────────────────
    const { invites } = body;
    if (!Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json({ error: 'No invites provided.' }, { status: 400 });
    }

    const resendKey = process.env.RESEND_API_KEY;
    const supabase  = getSupabase();
    const results   = [];

    for (const inv of invites) {
      const { name, email, coupon_type } = inv;
      if (!name?.trim() || !email?.trim()) {
        results.push({ email, ok: false, error: 'Name and email required.' });
        continue;
      }

      // Auto-generate a unique coupon if a type was chosen
      let couponCode  = null;
      let couponLabel = null;
      if (coupon_type && COUPON_TYPES[coupon_type]) {
        const coupon = await createCoupon(supabase, coupon_type);
        couponCode  = coupon?.code  ?? null;
        couponLabel = coupon?.label ?? null;
      }

      const subject = `An invitation from Jamie at LuckySquares Australia`;
      const html    = inviteHtml(name.trim(), couponCode, couponLabel);
      const text    = `Hi ${name.trim().split(' ')[0]},\n\nI wanted to personally invite you to try LuckySquares Australia. Head to https://luckysquares.com.au to get started.\n\n${couponCode ? `Your coupon code: ${couponCode}\n\n` : ''}Best,\nJamie\nFounder, LuckySquares Australia`;

      if (resendKey) {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM_EMAIL, to: email.trim(), reply_to: JAMIE_EMAIL, subject, html, text }),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error(`[invites] Resend error for ${email} (${res.status}): ${errText}`);
          results.push({ email, ok: false, error: `Send failed (${res.status})` });
          continue;
        }
      } else {
        console.log(`[invites] RESEND_API_KEY not set — logging invite for ${email}`, { couponCode });
      }

      const { error: dbErr } = await supabase.rpc('admin_record_invite', {
        p_name:        name.trim(),
        p_email:       email.trim(),
        p_coupon_code: couponCode,
      });
      if (dbErr) console.error(`[invites] DB record error for ${email}: ${dbErr.message}`);

      results.push({ email, ok: true });
    }

    const failed = results.filter((r) => !r.ok);
    return NextResponse.json({ results, failed_count: failed.length });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
