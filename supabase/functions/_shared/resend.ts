export const FROM_EMAIL    = 'no-reply@luckysquares.com.au';
export const SUPPORT_EMAIL = 'support@luckysquares.com.au';
export const ADMIN_EMAIL   = 'jwstott@me.com';

export interface EmailPayload {
  to:       string;
  subject:  string;
  text:     string;
  reply_to?: string;
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
      text:     payload.text,
      reply_to: payload.reply_to ?? SUPPORT_EMAIL,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error(`[email] Resend error (${res.status}): ${err}`);
  }
}
