export const FROM_EMAIL    = 'noreply@luckysquares.com.au';
export const SUPPORT_EMAIL = 'support@luckysquares.com.au';
export const ADMIN_EMAIL   = 'jwstott@me.com';

export interface EmailPayload {
  to:              string;
  subject:         string;
  text:            string;
  reply_to?:       string;
  unsubscribe_url?: string;
}

function toHtml(text: string, unsubscribeUrl?: string): string {
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const body = escaped
    // Bold **text**
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Section dividers (─── lines)
    .replace(/^[──]{3,}$/gm, '<hr style="border:none;border-top:1px solid #E5E7EB;margin:20px 0">')
    // Blank lines become paragraph breaks
    .split(/\n\n+/)
    .map((para) => {
      const lines = para.trim();
      if (!lines) return '';
      // Numbered or bulleted lists
      if (/^(\d+\.|[-•])/.test(lines)) {
        const items = lines.split('\n').map((l) =>
          `<li style="margin-bottom:6px">${l.replace(/^(\d+\.|[-•])\s*/, '')}</li>`
        ).join('');
        return `<ul style="padding-left:20px;margin:0 0 16px">${items}</ul>`;
      }
      return `<p style="margin:0 0 16px;line-height:1.7">${lines.replace(/\n/g, '<br>')}</p>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1209">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3EE;padding:40px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">

        <!-- Logo header -->
        <tr><td style="text-align:center;padding-bottom:28px">
          <a href="https://luckysquares.com.au" style="text-decoration:none">
            <span style="font-size:28px">🍀</span>
            <div style="font-size:18px;font-weight:900;color:#1A1209;letter-spacing:-0.5px;margin-top:4px">LuckySquares</div>
            <div style="font-size:11px;font-weight:700;color:#6B7280;letter-spacing:1.5px;text-transform:uppercase">Australia</div>
          </a>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:#FFFFFF;border-radius:16px;padding:36px 40px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
          ${body}
        </td></tr>

        <!-- Footer -->
        <tr><td style="text-align:center;padding-top:24px;font-size:12px;color:#9CA3AF;line-height:1.7">
          LuckySquares Australia &nbsp;|&nbsp;
          <a href="https://luckysquares.com.au" style="color:#9CA3AF">luckysquares.com.au</a><br>
          Questions? Reply to this email or contact
          <a href="mailto:${SUPPORT_EMAIL}" style="color:#9CA3AF">${SUPPORT_EMAIL}</a>
          ${unsubscribeUrl ? `<br><br><a href="${unsubscribeUrl}" style="color:#9CA3AF;font-size:11px">Unsubscribe from these emails</a>` : ''}
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendEmail(payload: EmailPayload): Promise<void> {
  const resendKey = Deno.env.get('RESEND_API_KEY');

  if (!resendKey) {
    console.log(`[email] RESEND_API_KEY not set — console only`);
    console.log(`[email] To: ${payload.to} | Subject: ${payload.subject}`);
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     FROM_EMAIL,
      to:       payload.to,
      subject:  payload.subject,
      text:     payload.text + (payload.unsubscribe_url ? `\n\nUnsubscribe: ${payload.unsubscribe_url}` : ''),
      html:     toHtml(payload.text, payload.unsubscribe_url),
      reply_to: payload.reply_to ?? SUPPORT_EMAIL,
      headers:  payload.unsubscribe_url ? { 'List-Unsubscribe': `<${payload.unsubscribe_url}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } : undefined,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[email] Resend error (${res.status}): ${err}`);
  }
}
