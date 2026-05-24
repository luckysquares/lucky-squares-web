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
    .select('is_admin')
    .eq('id', user.id)
    .single();
  return profile?.is_admin ? user : null;
}

function safe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function satisfactionEmailHtml(name, ticketRef, subject, ticketId) {
  const base = process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au';
  const positiveUrl = `${base}/api/support/satisfaction?ticket=${ticketId}&rating=positive`;
  const negativeUrl = `${base}/api/support/satisfaction?ticket=${ticketId}&rating=negative`;

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
          <div style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase">Australia: Support</div>
        </td></tr>
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:36px 40px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
          <p style="margin:0 0 20px;font-size:16px;font-weight:700;color:#1A1209">Hi ${safe(name.split(' ')[0])},</p>
          <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#4A3728">
            We have resolved your Lucky Squares support request (${safe(ticketRef)}: ${safe(subject)}). We hope we were able to help.
          </p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.8;color:#4A3728">
            How did we do? Your feedback helps us improve our support.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px">
            <tr>
              <td style="padding-right:12px">
                <a href="${positiveUrl}" style="display:inline-block;background:#16A34A;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px">👍 Good support</a>
              </td>
              <td>
                <a href="${negativeUrl}" style="display:inline-block;background:#DC2626;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:15px">👎 Needs improvement</a>
              </td>
            </tr>
          </table>
          <p style="margin:0;font-size:13px;color:#9C8060;text-align:center">
            If you need further help, feel free to submit a new support request at <a href="https://luckysquares.com.au/contact" style="color:#7C3AED">luckysquares.com.au/contact</a>
          </p>
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
  const supabase = getSupabase();

  const { data: ticket, error: tErr } = await supabase
    .from('support_tickets')
    .select('id, ticket_ref, subject, contact_email, contact_name, status')
    .eq('id', id)
    .single();

  if (tErr) return NextResponse.json({ error: 'Ticket not found.' }, { status: 404 });

  const { data, error } = await supabase
    .from('support_tickets')
    .update({ status: 'closed', closed_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, ticket_ref, status, closed_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send satisfaction survey
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    SUPPORT_FROM,
        to:      ticket.contact_email,
        subject: `We've resolved your Lucky Squares support request [${ticket.ticket_ref}]`,
        html:    satisfactionEmailHtml(ticket.contact_name, ticket.ticket_ref, ticket.subject, id),
        text:    `Hi ${ticket.contact_name.split(' ')[0]},\n\nWe've resolved your support request (${ticket.ticket_ref}).\n\nHow did we do?\nGood: ${process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au'}/api/support/satisfaction?ticket=${id}&rating=positive\nNeeds improvement: ${process.env.NEXT_PUBLIC_APP_URL || 'https://luckysquares.com.au'}/api/support/satisfaction?ticket=${id}&rating=negative\n\nLucky Squares Australia Support Team`,
      }),
    });
  }

  return NextResponse.json({ ticket: data });
}
