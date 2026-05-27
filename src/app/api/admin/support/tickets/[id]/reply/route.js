import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

const SUPPORT_FROM = 'support@luckysquares.com.au';

async function verifyAdmin(req) {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) return null;
  const token = auth.slice(7);
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, full_name')
    .eq('id', user.id)
    .single();
  return profile?.is_admin ? { ...user, full_name: profile.full_name } : null;
}

function safe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function replyEmailHtml(ticketRef, subject, replyBody, history) {
  const historyHtml = history.length > 0 ? `
    <tr><td style="padding-top:24px">
      <div style="border-top:2px solid #E5E0D5;padding-top:20px;margin-top:4px">
        <p style="font-size:11px;font-weight:700;color:#9C8060;text-transform:uppercase;letter-spacing:1.2px;margin:0 0 12px">Previous messages</p>
        ${history.map((m) => `
          <div style="margin-bottom:16px">
            <p style="margin:0 0 4px;font-size:11px;color:#9C8060">${safe(m.sender_name || m.sender_type)} — ${new Date(m.created_at).toLocaleString('en-AU')}</p>
            <p style="margin:0;font-size:13px;color:#4A3728;line-height:1.6;white-space:pre-wrap">${safe(m.body)}</p>
          </div>
        `).join('')}
      </div>
    </td></tr>` : '';

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
          <div style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase">Australia — Support [${safe(ticketRef)}]</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:36px 40px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
          <p style="margin:0 0 20px;font-size:14px;color:#9C8060">Re: ${safe(subject)} [${safe(ticketRef)}]</p>
          <div style="font-size:15px;line-height:1.8;color:#1A1209;white-space:pre-wrap">${safe(replyBody)}</div>
          <p style="margin:24px 0 0;font-size:13px;color:#9C8060">Lucky Squares Australia Support Team<br>You can reply directly to this email to continue the conversation.</p>
          ${historyHtml}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(req, { params }) {
  const adminUser = await verifyAdmin(req);
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const { body, is_internal } = await req.json();

  if (!body?.trim()) {
    return NextResponse.json({ error: 'Reply body is required.' }, { status: 400 });
  }

  const supabase = getSupabase();

  // Fetch ticket
  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select('id, ticket_ref, subject, contact_email, contact_name, status')
    .eq('id', id)
    .single();

  if (tErr) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });

  // Insert message
  const { data: msg, error: mErr } = await supabase
    .from('support_messages')
    .insert({
      ticket_id:   id,
      body:        body.trim(),
      is_internal: !!is_internal,
      sender_type: 'admin',
      sender_name: adminUser.full_name || adminUser.email,
      sender_email: adminUser.email,
    })
    .select()
    .single();

  if (mErr) return NextResponse.json({ error: mErr.message }, { status: 500 });

  // Update ticket status if currently open
  if (!is_internal && ticket.status === 'open') {
    await supabase
      .from('support_tickets')
      .update({ status: 'in_progress' })
      .eq('id', id);
  }

  // Send email to customer if not internal
  if (!is_internal) {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      // Fetch conversation history for the email
      const { data: history } = await supabase
        .from('support_messages')
        .select('body, sender_type, sender_name, created_at')
        .eq('ticket_id', id)
        .eq('is_internal', false)
        .neq('id', msg.id)
        .order('created_at', { ascending: true });

      const replyTo = `support+${id}@reply.luckysquares.com.au`;

      const emailRes = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:     SUPPORT_FROM,
          to:       ticket.contact_email,
          reply_to: replyTo,
          subject:  `Re: ${ticket.subject} [${ticket.ticket_ref}]`,
          html:     replyEmailHtml(ticket.ticket_ref, ticket.subject, body.trim(), history || []),
          text:     `Re: ${ticket.subject} [${ticket.ticket_ref}]\n\n${body.trim()}\n\n---\nLucky Squares Australia Support Team\nReply to this email to continue the conversation.`,
        }),
      });

      if (!emailRes.ok) {
        const errBody = await emailRes.text();
        console.error(`[support-reply] Resend error ${emailRes.status} for ${ticket.ticket_ref}:`, errBody);
        return NextResponse.json({ message: msg, email_warning: `Email delivery failed (${emailRes.status}). The reply was saved but the customer was NOT notified. Check Vercel logs.` });
      }
    } else {
      console.warn('[support-reply] RESEND_API_KEY not set — reply saved but email NOT sent for', ticket.ticket_ref);
    }
  }

  return NextResponse.json({ message: msg });
}
