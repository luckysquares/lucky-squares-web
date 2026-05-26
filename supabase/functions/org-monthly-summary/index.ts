/**
 * Org Monthly Summary Edge Function
 * Triggered on the 1st of each month by pg_cron at 10:00 AEST (00:00 UTC).
 *
 * Queries stats for all org-plan users for the previous calendar month and
 * sends each a personalised summary email.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const TX_EMAIL_URL = `${SUPABASE_URL}/functions/v1/transactional-email`;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\.00$/, '');
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Calculate the previous calendar month
  const now   = new Date();
  let year    = now.getUTCFullYear();
  let month   = now.getUTCMonth(); // 0-based; this IS the previous month when run on the 1st
  if (month === 0) { month = 12; year--; }

  const monthName = `${MONTH_NAMES[month - 1]} ${year}`;

  const { data: rows, error } = await supabase.rpc('get_org_monthly_summary', {
    p_year:  year,
    p_month: month,
  });

  if (error) {
    console.error('[org-monthly-summary] RPC error:', error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
  }

  let sent = 0;
  for (const row of rows ?? []) {
    const res = await fetch(TX_EMAIL_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        type: 'org_monthly_summary',
        to:   row.email,
        data: {
          first_name:           row.first_name,
          org_name:             row.org_name,
          month_name:           monthName,
          campaign_count:       Number(row.campaign_count),
          total_squares_sold:   Number(row.total_squares_sold),
          total_raised:         formatDollars(Number(row.total_raised_cents)),
          draws_completed:      Number(row.draws_completed),
          active_campaign_count: Number(row.active_campaign_count),
        },
      }),
    });

    if (!res.ok) {
      console.error(`[org-monthly-summary] Failed to send to ${row.email}: ${res.status}`);
    } else {
      sent++;
    }
  }

  console.log(`[org-monthly-summary] ${monthName}: sent ${sent} of ${(rows ?? []).length}`);
  return new Response(JSON.stringify({ ok: true, month: monthName, sent }), { status: 200 });
});
