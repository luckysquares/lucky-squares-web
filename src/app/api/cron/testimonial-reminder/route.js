/**
 * Cron: runs on the 1st, 2nd and 3rd of each month.
 * Sends a draw reminder email to the admin on the first business day.
 * Secured by CRON_SECRET header (set in Vercel environment variables).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CRON_SECRET    = process.env.CRON_SECRET;
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL || 'jwstott@me.com';

function isFirstBusinessDayOfMonth(date) {
  const d   = new Date(date);
  const dom = d.getDate();
  const dow = d.getDay(); // 0=Sun, 6=Sat

  // Must be a weekday
  if (dow === 0 || dow === 6) return false;
  // Can only be first business day if on day 1, 2, or 3
  if (dom > 3) return false;
  // Check no earlier weekday exists this month
  for (let i = 1; i < dom; i++) {
    const prev = new Date(d.getFullYear(), d.getMonth(), i).getDay();
    if (prev !== 0 && prev !== 6) return false;
  }
  return true;
}

function prevMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(yyyyMM) {
  const [y, m] = yyyyMM.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });
}

export async function GET(req) {
  // Verify cron secret
  const auth = req.headers.get('authorization');
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const now = new Date();

  // Only proceed on the first business day of the month
  if (!isFirstBusinessDayOfMonth(now)) {
    return Response.json({ ok: true, skipped: true, reason: 'Not first business day' });
  }

  // Dynamically import admin client (Edge-compatible path)
  const { getAdminClient } = await import('@/lib/supabase/server');
  const db = getAdminClient();

  // Previous month's eligible entries
  const month = prevMonth(now);
  const start = `${month}-01T00:00:00.000Z`;
  const end   = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1)).toISOString();

  const { count } = await db
    .from('testimonials')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('approved_at', start)
    .lt('approved_at', end);

  if (!count || count === 0) {
    return Response.json({ ok: true, skipped: true, reason: 'No entries for previous month' });
  }

  // Check draw not already run
  const { data: existing } = await db
    .from('testimonial_draws')
    .select('id')
    .eq('draw_month', month)
    .maybeSingle();

  if (existing) {
    return Response.json({ ok: true, skipped: true, reason: 'Draw already run' });
  }

  // Send reminder email
  if (RESEND_API_KEY) {
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    'Lucky Squares <hello@luckysquares.com.au>',
        to:      ADMIN_EMAIL,
        subject: `Reminder: Testimonial Prize Draw — ${monthLabel(month)}`,
        text:    `Hi Jamie,\n\nThis is your monthly reminder to run the Lucky Squares Testimonial Prize Draw for ${monthLabel(month)}.\n\nThere ${count === 1 ? 'is' : 'are'} ${count} approved testimonial${count !== 1 ? 's' : ''} eligible for this month's draw.\n\nRun the draw here:\nhttps://luckysquares.com.au/admin/testimonials\n\nCheers,\nThe Lucky Squares team\nhello@luckysquares.com.au`,
      }),
    });
  }

  return Response.json({ ok: true, month, entry_count: count });
}
