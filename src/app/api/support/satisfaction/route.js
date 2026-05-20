import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get('ticket');
  const rating   = searchParams.get('rating');

  const validRatings = ['positive', 'negative'];
  if (!ticketId || !validRatings.includes(rating)) {
    return new Response(thankYouPage('Invalid request', false), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }

  try {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('support_tickets')
      .update({ satisfaction: rating })
      .eq('id', ticketId);

    if (error) {
      console.error('[satisfaction] DB error:', error.message);
      return new Response(thankYouPage('Something went wrong. Thank you for trying.', false), {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }

    const positive  = rating === 'positive';
    const message   = positive
      ? "Thanks for the kind words! We're glad we could help."
      : "Thanks for the feedback. We'll use it to improve our support.";

    return new Response(thankYouPage(message, positive), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    return new Response(thankYouPage('Something went wrong.', false), {
      status: 500,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  }
}

function thankYouPage(message, positive) {
  const emoji  = positive ? '👍' : '💙';
  const colour = positive ? '#16A34A' : '#7C3AED';
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Feedback received — Lucky Squares Australia</title>
</head>
<body style="margin:0;padding:0;background:#F5F3EE;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#1A1209;min-height:100vh;display:flex;align-items:center;justify-content:center">
  <div style="text-align:center;max-width:480px;padding:40px 24px">
    <div style="font-size:64px;margin-bottom:20px">${emoji}</div>
    <div style="font-size:28px;font-weight:900;margin-bottom:8px">🍀 Lucky Squares</div>
    <div style="font-size:11px;font-weight:700;color:#9C8060;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:32px">Australia</div>
    <div style="background:#fff;border-radius:16px;padding:36px;border:1.5px solid #E5E0D5;box-shadow:0 2px 12px rgba(61,46,26,0.07)">
      <p style="font-size:18px;font-weight:700;color:${colour};margin:0 0 12px">Feedback received</p>
      <p style="font-size:15px;line-height:1.8;color:#4A3728;margin:0 0 24px">${message}</p>
      <a href="https://luckysquares.com.au" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;font-size:14px">Back to Lucky Squares</a>
    </div>
  </div>
</body>
</html>`;
}
