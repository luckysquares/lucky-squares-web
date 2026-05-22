import { NextResponse } from 'next/server';
import { getAdminClient as getSupabase } from '@/lib/supabase/server';

const INTERNAL_TO  = 'jamie@luckysquares.com.au';
const SUPPORT_FROM = 'support@luckysquares.com.au';

// Parse ticket ID from address like: support+{ticketId}@reply.luckysquares.com.au
function parseTicketId(toAddress) {
  if (!toAddress) return null;
  // Handle array or comma-separated
  const addresses = Array.isArray(toAddress) ? toAddress : [toAddress];
  for (const addr of addresses) {
    const match = addr.match(/support\+([a-f0-9-]{36})@reply\.luckysquares\.com\.au/i);
    if (match) return match[1];
  }
  return null;
}

export async function POST(req) {
  try {
    const body = await req.json();

    const toField   = body.to || body.To || '';
    const fromField = body.from || body.From || '';
    const text      = body.text || body.Text || body.plain || '';
    const html      = body.html || body.Html || '';

    // Try to parse ticket ID from the to field
    const toAddresses = typeof toField === 'string'
      ? toField.split(',').map((a) => a.trim())
      : Array.isArray(toField) ? toField : [];

    const ticketId = parseTicketId(toAddresses);

    if (!ticketId) {
      console.warn('[inbound] Could not parse ticket ID from:', toField);
      return NextResponse.json({ ok: true }); // Accept but ignore
    }

    const supabase = getSupabase();

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

    // Extract sender name from From field
    const fromMatch  = fromField.match(/^(.+?)\s*<([^>]+)>/);
    const senderName  = fromMatch ? fromMatch[1].trim() : ticket.contact_name;
    const senderEmail = fromMatch ? fromMatch[2].trim() : ticket.contact_email;

    // Use plain text; strip quoted history (lines starting with >)
    const rawText   = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const cleanBody = rawText
      .split('\n')
      .filter((line) => !line.trim().startsWith('>'))
      .join('\n')
      .trim();

    if (!cleanBody) {
      return NextResponse.json({ ok: true });
    }

    // Append message
    await supabase.from('support_messages').insert({
      ticket_id:   ticketId,
      body:        cleanBody,
      is_internal: false,
      sender_type: 'customer',
      sender_name:  senderName,
      sender_email: senderEmail,
    });

    // Update ticket status: customer replied so it needs attention
    if (ticket.status === 'waiting_customer' || ticket.status === 'in_progress') {
      await supabase
        .from('support_tickets')
        .update({ status: 'open' })
        .eq('id', ticketId);
    }

    // Notify internally
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
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
    return NextResponse.json({ ok: true }); // Always 200 to Resend
  }
}
