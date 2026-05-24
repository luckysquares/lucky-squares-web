import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

const INTERNAL_TO  = 'jamie@luckysquares.com.au';
const SUPPORT_FROM = 'support@luckysquares.com.au';

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
    // Resend webhook payload: { type, created_at, data: { email_id, from, to, subject, ... } }
    const { email_id, from: fromField, to: toField } = event.data ?? {};

    const ticketId = parseTicketId(toField);
    if (!ticketId) {
      console.warn('[inbound] Could not parse ticket ID from:', toField);
      return NextResponse.json({ ok: true }); // Accept but ignore
    }

    const supabase   = getSupabase();
    const resendKey  = process.env.RESEND_API_KEY;

    // Fetch full email content (text/html not included in webhook payload)
    const emailDetail = resendKey ? await fetchEmailBody(email_id, resendKey) : null;
    const text = emailDetail?.text ?? '';
    const html = emailDetail?.html ?? '';

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
