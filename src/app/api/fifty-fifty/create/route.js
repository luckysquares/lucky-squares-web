import { getAdminClient } from '@/lib/supabase/server';

export async function POST(req) {
  try {
    // Authenticate the request via bearer token
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '');

    if (!token) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const userRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      },
    });
    if (!userRes.ok) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }
    const user = await userRes.json();
    if (!user?.id) {
      return Response.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await req.json();
    const {
      title,
      emoji,
      description,
      ticket_price,
      payment_method,
      lottery_licence,
      stripe_account_id,
      bank_account_name,
      bank_bsb,
      bank_account,
      state,
      max_tickets,
    } = body;

    // Validate required fields
    if (!title || !title.trim()) {
      return Response.json({ error: 'Title is required' }, { status: 400 });
    }
    const price = parseFloat(ticket_price);
    if (!price || price <= 0) {
      return Response.json({ error: 'A valid ticket price is required' }, { status: 400 });
    }
    const validPaymentMethods = ['stripe', 'bank', 'bank_inperson'];
    if (!validPaymentMethods.includes(payment_method)) {
      return Response.json({ error: 'Invalid payment method' }, { status: 400 });
    }

    const db = getAdminClient();

    const insertRow = {
      owner_id:       user.id,
      title:          title.trim().substring(0, 80),
      emoji:          emoji || '🎟️',
      description:    description ? description.trim().substring(0, 500) : null,
      ticket_price:   price,
      payment_method: payment_method,
      status:         'draft',
      lottery_licence: lottery_licence ? lottery_licence.trim().substring(0, 60) : null,
      state:           state ? state.trim().toUpperCase().substring(0, 3) : null,
      max_tickets:     max_tickets ? parseInt(max_tickets, 10) || null : null,
    };

    if (payment_method === 'stripe' && stripe_account_id) {
      insertRow.stripe_account_id = stripe_account_id;
    }
    if (payment_method !== 'stripe') {
      if (bank_account_name) insertRow.bank_account_name = bank_account_name.trim();
      if (bank_bsb)          insertRow.bank_bsb          = bank_bsb.trim();
      if (bank_account)      insertRow.bank_account      = bank_account.trim();
    }

    const { data: campaign, error: insertError } = await db
      .from('fifty_fifty_campaigns')
      .insert(insertRow)
      .select()
      .single();

    if (insertError || !campaign) {
      console.error('fifty-fifty create error:', insertError);
      return Response.json({ error: 'Failed to create campaign' }, { status: 500 });
    }

    return Response.json({ ok: true, campaign: { id: campaign.id, title: campaign.title, status: campaign.status } });
  } catch (err) {
    console.error('fifty-fifty/create error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
