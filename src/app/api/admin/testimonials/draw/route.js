import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/adminAuth';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL     = 'Lucky Squares <hello@luckysquares.com.au>';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL;

// GET — check draw status for a given month
export async function GET(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month'); // YYYY-MM
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 });

  const db = getAdminClient();

  // Check if draw already run
  const { data: existing } = await db
    .from('testimonial_draws')
    .select('*')
    .eq('draw_month', month)
    .maybeSingle();

  // Count eligible entries (approved within this month)
  const start = `${month}-01T00:00:00.000Z`;
  const end   = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1)).toISOString();

  const { count } = await db
    .from('testimonials')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'approved')
    .gte('approved_at', start)
    .lt('approved_at', end);

  return NextResponse.json({ draw: existing ?? null, entry_count: count ?? 0 });
}

// POST — run the draw for a given month
export async function POST(req) {
  if (!await verifyAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { month } = await req.json(); // YYYY-MM
  if (!month) return NextResponse.json({ error: 'month required' }, { status: 400 });

  const db = getAdminClient();

  // Idempotency — don't run twice for same month
  const { data: existing } = await db
    .from('testimonial_draws')
    .select('id')
    .eq('draw_month', month)
    .maybeSingle();

  if (existing) return NextResponse.json({ error: 'Draw already run for this month' }, { status: 409 });

  // Get eligible entries
  const start = `${month}-01T00:00:00.000Z`;
  const end   = new Date(new Date(start).setMonth(new Date(start).getMonth() + 1)).toISOString();

  const { data: entries } = await db
    .from('testimonials')
    .select('id, organiser_name, org_name, contact_email, quote')
    .eq('status', 'approved')
    .gte('approved_at', start)
    .lt('approved_at', end);

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: 'No eligible entries for this month' }, { status: 400 });
  }

  // Pick random winner
  const winner = entries[Math.floor(Math.random() * entries.length)];

  // Format month label
  const monthLabel = new Date(start).toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  // Record the draw
  await db.from('testimonial_draws').insert({
    draw_month:   month,
    winner_id:    winner.id,
    winner_name:  winner.organiser_name,
    winner_email: winner.contact_email,
    winner_org:   winner.org_name,
    entry_count:  entries.length,
    month_label:  monthLabel,
  });

  // Email the winner
  if (winner.contact_email && RESEND_API_KEY) {
    const firstName = (winner.organiser_name || 'there').split(' ')[0];
    await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from:    FROM_EMAIL || 'Lucky Squares <hello@luckysquares.com.au>',
        to:      winner.contact_email,
        subject: `You won the Lucky Squares Testimonial Prize Draw!`,
        text:    `Hi ${firstName},\n\nGreat news — you've won the Lucky Squares Testimonial Prize Draw for ${monthLabel}!\n\nYour testimonial for ${winner.org_name} was randomly selected from all approved entries this month, and you've won a $100 Visa debit gift card.\n\nWe'll be in touch shortly to arrange delivery of your prize.\n\nCongratulations, and thank you for sharing your experience with the Lucky Squares community!\n\nCheers,\nThe Lucky Squares team\nhello@luckysquares.com.au`,
      }),
    });
  }

  return NextResponse.json({
    ok: true,
    winner: {
      name:  winner.organiser_name,
      email: winner.contact_email,
      org:   winner.org_name,
    },
    entry_count: entries.length,
    month_label: monthLabel,
  });
}
