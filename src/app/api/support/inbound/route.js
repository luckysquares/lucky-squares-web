import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

const INTERNAL_TO  = 'jamie@luckysquares.com.au';
const SUPPORT_FROM = 'hello@luckysquares.com.au';

// Parse ticket ID from address like: support+{ticketId}@reply.luckysquares.com.au
// Also accepts root domain: support+{ticketId}@luckysquares.com.au
function parseTicketId(toAddresses) {
  if (!toAddresses) return null;
  const addresses = Array.isArray(toAddresses) ? toAddresses : [toAddresses];
  for (const addr of addresses) {
    const match = addr.match(/support\+([a-f0-9-]{36})@(?:reply\.)?luckysquares\.com\.au/i);
    if (match) return match[1];
  }
  return null;
}

// Fetch the full email body from Resend (webhook payload only contains metadata)
async function fetchEmailBody(emailId, apiKey) {
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${emailId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function POST(req) {
  // ── Signature verification (FIND-009) ────────────────────────────────────
  // Resend signs webhooks using Svix. Reject any request that can't be verified.
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[inbound] RESEND_WEBHOOK_SECRET not set — rejecting request');
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const rawBody = await req.text();
  const svixHeaders = {
    'svix-id':        req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  };

  try {
    new Webhook(secret).verify(rawBody, svixHeaders);
  } catch (err) {
    console.warn('[inbound] Signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Only handle email.received events
  if (event.type !== 'email.received') {
    return NextResponse.json({ ok: true });
  }

  try {
    // Resend inbound webhook payload:
    // { type, created_at, data: { email_id, from, to, subject, text, html, headers, attachments } }
    const {
      email_id,
      from:    fromField,
      to:      toField,
      subject: emailSubject,
      text:    payloadText,
      html:    payloadHtml,
    } = event.data ?? {};

    const ticketId  = parseTicketId(toField);
    const supabase  = getSupabase();
    const resendKey = process.env.RESEND_API_KEY;

    // No ticket ID — direct email to hello@ or jamie@.
    if (!ticketId) {
      const fromMatch2   = (fromField ?? '').match(/^(.+?)\s*<([^>]+)>/);
      const senderName2  = fromMatch2 ? fromMatch2[1].trim() : 'Unknown';
      const senderEmail2 = fromMatch2 ? fromMatch2[2].trim() : (fromField ?? '').trim().toLowerCase();

      // Email addressed to jamie@ — forward to personal inbox via Resend (iCloud trusts Resend outbound)
      // Skip internal system emails (support notifications sent by us) to avoid duplicates
      const isInternal = (fromField ?? '').toLowerCase().includes('luckysquares.com.au');
      const toAddresses2 = Array.isArray(toField) ? toField : [toField ?? ''];
      const isJamie = toAddresses2.some((a) => a.toLowerCase().includes('jamie@luckysquares'));
      if (isJamie && !isInternal && resendKey) {
        const rawBody = (payloadText || (payloadHtml ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()).trim();
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:     SUPPORT_FROM,
            to:       INTERNAL_TO,
            reply_to: fromField ?? undefined,
            subject:  `Fwd: ${emailSubject ?? '(no subject)'}`,
            text:     `From: ${fromField}\n\n${rawBody}`,
            html:     payloadHtml ? `<p><strong>From:</strong> ${fromField}</p><hr>${payloadHtml}` : undefined,
          }),
        });
        return NextResponse.json({ ok: true });
      }

      if (!senderEmail2) {
        console.warn('[inbound] No ticket ID and no sender — ignoring');
        return NextResponse.json({ ok: true });
      }

      const rawText2  = (payloadText || (payloadHtml ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .split('\n').filter((l) => !l.trim().startsWith('>')).join('\n').trim();
      const subject2  = (emailSubject ?? '(no subject)').replace(/^(Re:\s*)+/i, '').trim();

      // Insert ticket — no message column; trigger auto-sets ticket_ref
      const { data: newTicket, error: ticketErr } = await supabase
        .from('support_tickets')
        .insert({
          contact_name:  senderName2,
          contact_email: senderEmail2,
          category:      'general',
          subject:       subject2,
          ticket_ref:    '',
          status:        'open',
        })
        .select('id, ticket_ref')
        .single();

      if (ticketErr) {
        console.error('[inbound] Ticket insert error:', ticketErr.message);
        return NextResponse.json({ ok: true });
      }

      // Insert the message body into support_messages
      await supabase.from('support_messages').insert({
        ticket_id:    newTicket.id,
        body:         rawText2 || '(no body)',
        is_internal:  false,
        sender_type:  'customer',
        sender_name:  senderName2,
        sender_email: senderEmail2,
      });

      const ticketRef2 = newTicket.ticket_ref;

      if (resendKey) {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from:    SUPPORT_FROM,
            to:      INTERNAL_TO,
            subject: `New ticket ${ticketRef2} from ${senderName2}`,
            text:    `New ticket ${ticketRef2}\n\nFrom: ${senderName2} <${senderEmail2}>\nSubject: ${subject2}\n\n${rawText2}\n\nView: https://luckysquares.com.au/admin/support`,
            html:    `<p><strong>New ticket ${ticketRef2}</strong></p><p>From: ${senderName2} &lt;${senderEmail2}&gt;</p><blockquote style="border-left:3px solid #E5E0D5;padding-left:16px;color:#4A3728">${rawText2.replace(/\n/g, '<br>')}</blockquote><p><a href="https://luckysquares.com.au/admin/support">View in admin portal</a></p>`,
          }),
        });
      }

      return NextResponse.json({ ok: true });
    }

    // Use body from webhook payload directly. Fall back to API fetch only if both are missing
    // (older Resend webhook versions may not include body in payload).
    let text = payloadText ?? '';
    let html = payloadHtml ?? '';

    if (!text && !html && email_id && resendKey) {
      console.log('[inbound] Body not in payload — fetching from Resend API');
      const emailDetail = await fetchEmailBody(email_id, resendKey);
      text = emailDetail?.text ?? '';
      html = emailDetail?.html ?? '';
    }

    // Fetch ticket
    const { data: ticket, error: tErr } = await supabase
      .from('support_tickets')
      .select('id, ticket_ref, subject, status, contact_name, contact_email')
      .eq('id', ticketId)
      .single();

    if (tErr || !ticket) {
      console.warn('[inbound] Ticket not found for ID:', ticketId);
      return NextResponse.json({ ok: true });
    }

    // Extract sender name from From field (e.g. "Jane Smith <jane@example.com>")
    const fromMatch   = (fromField ?? '').match(/^(.+?)\s*<([^>]+)>/);
    const senderName  = fromMatch ? fromMatch[1].trim() : ticket.contact_name;
    const senderEmail = fromMatch ? fromMatch[2].trim() : (fromField ?? ticket.contact_email);

    // Prefer plain text; fall back to stripped HTML. Strip quoted reply history.
    const rawText   = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanBody = rawText
      .split('\n')
      .filter((line) => !line.trim().startsWith('>'))
      .join('\n')
      .trim();

    if (!cleanBody) {
      console.warn('[inbound] Empty body after cleaning — email not logged. email_id:', email_id, 'subject:', emailSubject);
      return NextResponse.json({ ok: true });
    }

    // Append message to ticket
    await supabase.from('support_messages').insert({
      ticket_id:    ticketId,
      body:         cleanBody,
      is_internal:  false,
      sender_type:  'customer',
      sender_name:  senderName,
      sender_email: senderEmail,
    });

    // Customer replied — move ticket back to open so it gets attention
    if (ticket.status === 'waiting_customer' || ticket.status === 'in_progress') {
      await supabase
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', ticketId);
    }

    // Notify Jamie internally
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    SUPPORT_FROM,
          to:      INTERNAL_TO,
          subject: `Customer replied to ${ticket.ticket_ref}: ${ticket.subject}`,
          text:    `Customer replied to ${ticket.ticket_ref}\n\nFrom: ${senderName} <${senderEmail}>\n\n${cleanBody}\n\nView ticket: https://luckysquares.com.au/admin/support`,
          html:    `<p><strong>Customer replied to ${ticket.ticket_ref}</strong></p><p>From: ${senderName} &lt;${senderEmail}&gt;</p><blockquote style="border-left:3px solid #E5E0D5;padding-left:16px;color:#4A3728">${cleanBody.replace(/\n/g, '<br>')}</blockquote><p><a href="https://luckysquares.com.au/admin/support">View ticket in admin portal</a></p>`,
        }),
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[inbound] Error:', err.message);
    return NextResponse.json({ ok: true }); // Always 200 so Resend doesn't retry
  }
}
