-- Add optional max_tickets cap to 50/50 campaigns.
-- NULL means unlimited (default). When set, ticket purchases are blocked
-- once the limit is reached and the buy page shows a sold-out state.

alter table public.fifty_fifty_campaigns
  add column if not exists max_tickets int check (max_tickets is null or max_tickets > 0);

-- ── Update reserve_fifty_fifty_tickets to enforce the cap ─────────────────────

create or replace function public.reserve_fifty_fifty_tickets(
  p_campaign_id               uuid,
  p_quantity                  int,
  p_buyer_name                text,
  p_buyer_email               text,
  p_buyer_phone               text,
  p_amount_paid               numeric,
  p_payment_method            text,
  p_stripe_payment_intent_id  text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_start    int;
  v_max      int;
  v_numbers  int[];
  v_ticket   fifty_fifty_tickets%rowtype;
begin
  -- Lock the campaign row and grab the next ticket number + max cap
  select next_ticket_num, max_tickets
  into v_start, v_max
  from fifty_fifty_campaigns
  where id = p_campaign_id and status = 'active'
  for update;

  if not found then
    return jsonb_build_object('error', 'Campaign not found or not active');
  end if;

  -- Enforce max_tickets cap if set
  if v_max is not null and (v_start - 1 + p_quantity) > v_max then
    return jsonb_build_object('error', 'Not enough tickets remaining');
  end if;

  -- Build the array of sequential ticket numbers
  select array_agg(s) into v_numbers
  from generate_series(v_start, v_start + p_quantity - 1) s;

  -- Advance the counter
  update fifty_fifty_campaigns
  set next_ticket_num = v_start + p_quantity
  where id = p_campaign_id;

  -- Insert the ticket record
  insert into fifty_fifty_tickets (
    campaign_id, ticket_numbers, buyer_name, buyer_email, buyer_phone,
    amount_paid, payment_method, payment_status, stripe_payment_intent_id
  )
  values (
    p_campaign_id, v_numbers, p_buyer_name, p_buyer_email, p_buyer_phone,
    p_amount_paid, p_payment_method,
    case when p_payment_method = 'stripe' then 'pending' else 'paid' end,
    p_stripe_payment_intent_id
  )
  returning * into v_ticket;

  return jsonb_build_object('ok', true, 'ticket_id', v_ticket.id, 'ticket_numbers', v_numbers);
end;
$$;

-- ── Update get_fifty_fifty_campaign to expose max_tickets / tickets_remaining ─

create or replace function public.get_fifty_fifty_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row          fifty_fifty_campaigns%rowtype;
  v_tickets_sold bigint;
  v_remaining    int;
begin
  select * into v_row from fifty_fifty_campaigns where id = p_campaign_id;
  if not found then return jsonb_build_object('error', 'Not found'); end if;

  select coalesce(sum(array_length(ticket_numbers, 1)), 0)
  into v_tickets_sold
  from fifty_fifty_tickets
  where campaign_id = p_campaign_id and payment_status = 'paid';

  -- tickets_remaining: null when there is no cap, otherwise max_tickets - sold
  if v_row.max_tickets is not null then
    v_remaining := greatest(0, v_row.max_tickets - v_tickets_sold::int);
  else
    v_remaining := null;
  end if;

  return jsonb_build_object(
    'id',                 v_row.id,
    'title',              v_row.title,
    'description',        v_row.description,
    'emoji',              v_row.emoji,
    'ticket_price',       v_row.ticket_price,
    'status',             v_row.status,
    'payment_method',     v_row.payment_method,
    'tickets_sold',       v_tickets_sold,
    'jackpot',            round(v_tickets_sold * v_row.ticket_price * 0.5, 2),
    'winner_ticket_num',  v_row.winner_ticket_num,
    'max_tickets',        v_row.max_tickets,
    'tickets_remaining',  v_remaining
  );
end;
$$;

-- ── Update get_my_fifty_fifty_campaigns to expose max_tickets ─────────────────

create or replace function public.get_my_fifty_fifty_campaigns()
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id',               c.id,
        'title',            c.title,
        'description',      c.description,
        'emoji',            c.emoji,
        'ticket_price',     c.ticket_price,
        'status',           c.status,
        'winner_ticket_num',c.winner_ticket_num,
        'payment_method',   c.payment_method,
        'stripe_account_id',c.stripe_account_id,
        'launched_at',      c.launched_at,
        'drawn_at',         c.drawn_at,
        'max_tickets',      c.max_tickets,
        'tickets_sold',     coalesce((
          select sum(array_length(t.ticket_numbers, 1))
          from fifty_fifty_tickets t
          where t.campaign_id = c.id and t.payment_status = 'paid'
        ), 0),
        'jackpot',          round(
          coalesce((
            select sum(array_length(t.ticket_numbers, 1))
            from fifty_fifty_tickets t
            where t.campaign_id = c.id and t.payment_status = 'paid'
          ), 0) * c.ticket_price * 0.5,
          2
        )
      )
      order by c.launched_at desc
    )
    from fifty_fifty_campaigns c
    where c.owner_id = auth.uid()
      or exists (
        select 1 from org_members om
        where om.org_user_id = c.owner_id
          and om.member_user_id = auth.uid()
      )
  ), '[]'::jsonb);
end;
$$;
