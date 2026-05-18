import { NextResponse } from 'next/server';

const SUPPORT_EMAIL = 'support@luckysquares.com.au';
const FROM_EMAIL    = 'onboarding@resend.dev';

function toHtml(name, email, category, message) {
  const safe = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1209">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="text-align:center;padding-bottom:28px">
          <span style="font-size:28px">🍀</span>
          <div style="font-size:18px;font-weight:900;color:#1A1209;letter-spacing:-0.5px;margin-top:4px">LuckySquares</div>
          <div style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase">Australia — Contact Form</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:36px 40px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
          <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#1A1209">New contact form submission</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;color:#4A3728">
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700;width:110px">Name</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0">${safe(name)}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700">Email</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0"><a href="mailto:${safe(email)}" style="color:#1A7A55">${safe(email)}</a></td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700">Category</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0">${safe(category)}</td></tr>
            <tr><td style="padding:16px 0 8px;font-weight:700;vertical-align:top">Message</td><td style="padding:16px 0 8px;white-space:pre-wrap">${safe(message)}</td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:13px;color:#9C8060">Reply directly to this email to respond to ${safe(name)}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req) {
  const { name, email, category, message } = await req.json();

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Name, email and message are required.' }, { status: 400 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
  }
  if (message.trim().length < 10) {
    return NextResponse.json({ error: 'Message is too short.' }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log('[contact] RESEND_API_KEY not set — logging only');
    console.log({ name, email, category, message });
    return NextResponse.json({ ok: true });
  }

  const subject = `[Contact] ${category || 'General enquiry'} — ${name}`;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      to:       SUPPORT_EMAIL,
      reply_to: email,
      subject,
      html:     toHtml(name, email, category || 'General enquiry', message),
      text:     `Name: ${name}\nEmail: ${email}\nCategory: ${category || 'General enquiry'}\n\n${message}`,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[contact] Resend error (${res.status}): ${err}`);
    return NextResponse.json({ error: 'Failed to send message. Please try again or email us directly.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
