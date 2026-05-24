import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';
import { checkRateLimit, getClientIp } from '@/lib/rateLimit';

const SUPPORT_FROM  = 'support@luckysquares.com.au';
const INTERNAL_TO   = 'jamie@luckysquares.com.au';

function safe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function customerAutoReplyHtml(name, ticketRef, subject) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1209">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="text-align:center;padding-bottom:28px">
          <span style="font-size:28px">🍀</span>
          <div style="font-size:18px;font-weight:900;color:#1A1209;letter-spacing:-0.5px;margin-top:4px">Lucky Squares</div>
          <div style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase">Australia — Support</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:36px 40px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
          <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#1A1209">Hi ${safe(name.split(' ')[0])},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#4A3728">
            Thanks for reaching out. We have received your support request and our team will get back to you within one business day.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;border-radius:10px;margin:20px 0">
            <tr><td style="padding:16px 20px">
              <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#9C8060;text-transform:uppercase;letter-spacing:1.2px">Your ticket reference</p>
              <p style="margin:0;font-size:20px;font-weight:900;color:#7C3AED;font-family:monospace;letter-spacing:1px">${safe(ticketRef)}</p>
            </td></tr>
          </table>
          <p style="margin:16px 0 0;font-size:14px;line-height:1.7;color:#4A3728">
            Please keep your ticket reference handy. If you reply to this email, your message will be added to your existing support ticket automatically.
          </p>
          <p style="margin:20px 0 0;font-size:13px;color:#9C8060">Lucky Squares Australia Support Team</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function internalNotificationHtml(name, email, category, subject, message, ticketRef) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1209">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="text-align:center;padding-bottom:28px">
          <span style="font-size:28px">🍀</span>
          <div style="font-size:18px;font-weight:900;color:#1A1209;letter-spacing:-0.5px;margin-top:4px">Lucky Squares</div>
          <div style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase">New Support Ticket</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:36px 40px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
          <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#1A1209">New support ticket — ${safe(ticketRef)}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.7;color:#4A3728">
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700;width:110px">Ticket</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700;color:#7C3AED">${safe(ticketRef)}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700">Name</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0">${safe(name)}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700">Email</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0"><a href="mailto:${safe(email)}" style="color:#1A7A55">${safe(email)}</a></td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700">Category</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0">${safe(category)}</td></tr>
            <tr><td style="padding:8px 0;border-bottom:1px solid #F0EAE0;font-weight:700">Subject</td><td style="padding:8px 0;border-bottom:1px solid #F0EAE0">${safe(subject)}</td></tr>
            <tr><td style="padding:16px 0 8px;font-weight:700;vertical-align:top">Message</td><td style="padding:16px 0 8px;white-space:pre-wrap">${safe(message)}</td></tr>
          </table>
          <div style="margin-top:24px">
            <a href="https://luckysquares.com.au/admin/support" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:700;font-size:14px">View in admin portal</a>
          </div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendEmail({ from, to, replyTo, subject, html, text }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    console.log(`[contact] RESEND_API_KEY not set — skipping email to ${to}`);
    return true;
  }
  const payload = { from, to, subject, html, text };
  if (replyTo) payload.reply_to = replyTo;

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[contact] Resend error (${res.status}): ${err}`);
    return false;
  }
  return true;
}

export async function POST(req) {
  // Rate limit: 5 submissions per IP per hour.
  // Each submission creates a DB ticket and sends two Resend emails, so abuse
  // would exhaust the email sending quota and flood the admin inbox.
  const ip = getClientIp(req);
  const { allowed } = checkRateLimit(`contact:${ip}`, {
    limit:    5,
    windowMs: 60 * 60 * 1000, // 1 hour
  });
  if (!allowed) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 },
    );
  }

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

  const CAT_MAP = {
    'general enquiry':                  'general',
    'technical support':                'technical',
    'billing':                          'billing',
    'privacy enquiry':                  'general',
    'compliance and permit questions':  'general',
    'media and partnerships':           'general',
    'other':                            'general',
    'campaign_help':                    'campaign_help',
    'abuse':                            'abuse',
  };
  const cat     = CAT_MAP[category?.trim().toLowerCase()] ?? 'general';
  const subject = `${category?.trim() || 'General enquiry'} from ${name.trim()}`;

  // Create ticket in Supabase
  let ticketRef = 'TK-XXXX';
  let ticketId  = null;

  try {
    const supabase = getSupabase();

    const { data: ticket, error: ticketErr } = await supabase
      .from('support_tickets')
      .insert({
        contact_name:  name.trim(),
        contact_email: email.trim(),
        subject,
        category:      cat,
        ticket_ref:    '', // trigger will set this
      })
      .select('id, ticket_ref')
      .single();

    if (ticketErr) {
      console.error('[contact] ticket insert error:', ticketErr.message);
    } else {
      ticketRef = ticket.ticket_ref;
      ticketId  = ticket.id;

      // Insert the initial message
      await supabase.from('support_messages').insert({
        ticket_id:   ticketId,
        body:        message.trim(),
        is_internal: false,
        sender_type: 'customer',
        sender_name:  name.trim(),
        sender_email: email.trim(),
      });
    }
  } catch (err) {
    console.error('[contact] Supabase error:', err.message);
  }

  // Send auto-reply to customer
  await sendEmail({
    from:    SUPPORT_FROM,
    to:      email.trim(),
    replyTo: ticketId ? `support+${ticketId}@reply.luckysquares.com.au` : SUPPORT_FROM,
    subject: `Your message has been received [${ticketRef}]`,
    html:    customerAutoReplyHtml(name.trim(), ticketRef, subject),
    text:    `Hi ${name.trim().split(' ')[0]},\n\nThanks for reaching out. We have received your support request (${ticketRef}) and our team will get back to you within one business day.\n\nPlease keep your ticket reference handy: ${ticketRef}\n\nLucky Squares Australia Support Team`,
  });

  // Send internal notification
  await sendEmail({
    from:    SUPPORT_FROM,
    to:      INTERNAL_TO,
    subject: `New support ticket ${ticketRef}: ${subject}`,
    html:    internalNotificationHtml(name.trim(), email.trim(), cat, subject, message.trim(), ticketRef),
    text:    `New support ticket ${ticketRef}\n\nName: ${name}\nEmail: ${email}\nCategory: ${cat}\nSubject: ${subject}\n\n${message}`,
  });

  return NextResponse.json({ ok: true, ticket_ref: ticketRef });
}
