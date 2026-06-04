/**
 * Inbound email webhook — receives replies forwarded by Resend.
 *
 * Setup required in Resend dashboard:
 *   Email → Domains → luckysquares.com.au → Inbound routing
 *   Route: hello@luckysquares.com.au → POST https://luckysquares.com.au/api/inbound-email
 *
 * This creates a support ticket (or adds a message to an existing one)
 * whenever someone replies to an email sent from hello@luckysquares.com.au.
 */

import { getAdminClient } from '@/lib/supabase/server';

function extractReplyBody(text) {
  if (!text) return '';
  // Strip quoted reply text (lines starting with >) and trailing signatures
  const lines = text.split('\n');
  const replyLines = [];
  for (const line of lines) {
    if (line.startsWith('>')) break;          // quoted reply starts
    if (line.match(/^On .+ wrote:$/)) break;  // Outlook/Gmail quote header
    replyLines.push(line);
  }
  return replyLines.join('\n').trim();
}

export async function POST(req) {
  try {
    const body = await req.json();

    const from    = body.from    || body.sender    || '';
    const subject = body.subject || '(no subject)';
    const text    = body.text    || body.plain_body || '';
    const html    = body.html    || body.html_body  || '';

    if (!from) return new Response('Missing from', { status: 400 });

    // Extract name and email from "Name <email>" format
    const fromMatch = from.match(/^(.+?)\s*<(.+?)>$/) || ['', '', from];
    const fromName  = fromMatch[1]?.trim() || 'Unknown';
    const fromEmail = (fromMatch[2] || from).trim().toLowerCase();

    // Check if this is a reply to an existing ticket
    // (ticket ref looks like [#LS-XXXX] in subject)
    const ticketRefMatch = subject.match(/\[#(LS-[A-Z0-9]+)\]/);
    const db = getAdminClient();

    const messageBody = extractReplyBody(text) || text.slice(0, 2000);

    if (ticketRefMatch) {
      // Add as a reply to existing ticket
      const ticketRef = ticketRefMatch[1];
      const { data: ticket } = await db
        .from('support_tickets')
        .select('id')
        .eq('ticket_ref', ticketRef)
        .single();

      if (ticket) {
        await db.from('support_messages').insert({
          ticket_id:  ticket.id,
          sender:     'customer',
          body:       messageBody,
          created_at: new Date().toISOString(),
        });
        return new Response('ok', { status: 200 });
      }
    }

    // Create a new support ticket from the inbound email
    const ticketRef = `LS-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    await db.from('support_tickets').insert({
      ticket_ref:  ticketRef,
      name:        fromName,
      email:       fromEmail,
      category:    'Email reply',
      subject:     subject.replace(/^(Re:\s*)+/i, '').trim(),
      message:     messageBody,
      status:      'open',
      created_at:  new Date().toISOString(),
    });

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[inbound-email]', err);
    return new Response('error', { status: 500 });
  }
}
