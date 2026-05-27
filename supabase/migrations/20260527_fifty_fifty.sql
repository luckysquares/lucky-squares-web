-- ── 50/50 Raffle: campaigns ───────────────────────────────────────────────────
-- Intentionally separate from the fundraisers/squares tables so the two
-- products are completely independent and cannot affect each other.

create table if not exists public.fifty_fifty_campaigns (
  id                uuid primary key default gen_random_uuid(),
  owner_id          uuid not null references public.profiles(id) on delete cascade,
  title             text not null,
  description       text,
  emoji             text not null default '🎟️',
  ticket_price      numeric(10,2) not null check (ticket_price > 0),
  status            text not null default 'active'
                      check (status in ('active', 'drawn', 'cancelled')),
  winner_ticket_num int,
  payment_method    text not null default 'stripe'
                      check (payment_method in ('stripe', 'bank', 'bank_inperson')),
  stripe_account_id text,              -- Stripe Connect account (same flow as fundraisers)
  launched_at       timestamptz not null default now(),
  drawn_at          timestamptz,
  created_at        timestamptz not null default now()
);

-- ── 50/50 Raffle: tickets ──────────────────────────────────────────────────────
-- Each row is a purchase. ticket_numbers is an array of sequential ints
-- (e.g. [1, 2, 3] if a buyer bought 3 tickets). Numbers are assigned at
-- purchase time: next_ticket_num is tracked on the campaign row.

alter table public.fifty_fifty_campaigns
  add column if not exists next_ticket_num int not null default 1;

create table if not exists public.fifty_fifty_tickets (
  id                        uuid primary key default gen_random_uuid(),
  campaign_id               uuid not null references public.fifty_fifty_campaigns(id) on delete cascade,
  ticket_numbers            int[] not null,
  buyer_name                text not null,
  buyer_email               text not null,
  buyer_phone               text,
  quantity                  int not null generated always as (array_length(ticket_numbers, 1)) stored,
  amount_paid               numeric(10,2) not null,
  payment_method            text not null default 'stripe',
  payment_status            text not null default 'pending'
                              check (payment_status in ('pending', 'paid', 'refunded')),
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now()
);

-- ── RLS ───────────────────────────────────────────────────────────────────────

alter table public.fifty_fifty_campaigns enable row level security;
alter table public.fifty_fifty_tickets    enable row level security;

-- Organiser can manage their own campaigns
create policy "Owner manages 50/50 campaigns"
  on public.fifty_fifty_campaigns for all
  using (auth.uid() = owner_id);

-- Org members can manage campaigns under their org owner
create policy "Org members manage 50/50 campaigns"
  on public.fifty_fifty_campaigns for all
  using (
    exists (
      select 1 from public.org_members
      where org_user_id = owner_id
        and member_user_id = auth.uid()
    )
  );

-- Anyone can read active campaign info (needed for the public buy page)
create policy "Public can read active 50/50 campaigns"
  on public.fifty_fifty_campaigns for select
  using (status = 'active');

-- Owner and org members can read all tickets for their campaign
create policy "Owner reads 50/50 tickets"
  on public.fifty_fifty_tickets for select
  using (
    exists (
      select 1 from public.fifty_fifty_campaigns c
      where c.id = campaign_id
        and (
          c.owner_id = auth.uid()
          or exists (
            select 1 from public.org_members om
            where om.org_user_id = c.owner_id
              and om.member_user_id = auth.uid()
          )
        )
    )
  );

-- Buyer can read their own tickets by email (used on the participant dashboard)
create policy "Buyer reads own 50/50 tickets"
  on public.fifty_fifty_tickets for select
  using (lower(buyer_email) = lower(current_setting('app.current_buyer_email', true)));

-- Service role writes tickets (via API route, bypasses RLS)
-- No anon insert policy — ticket purchases go through a Next.js API route
-- using the admin client, same pattern as square purchases.

-- ── RPCs ──────────────────────────────────────────────────────────────────────

-- Returns all 50/50 campaigns owned by (or shared with) the current user
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

-- Assigns sequential ticket numbers and records a purchase (called from API route via service role)
create or replace function public.reserve_fifty_fifty_tickets(
  p_campaign_id uuid,
  p_quantity    int,
  p_buyer_name  text,
  p_buyer_email text,
  p_buyer_phone text,
  p_amount_paid numeric,
  p_payment_method text,
  p_stripe_payment_intent_id text default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_start    int;
  v_numbers  int[];
  v_ticket   fifty_fifty_tickets%rowtype;
begin
  -- Lock the campaign row and grab the next ticket number
  select next_ticket_num into v_start
  from fifty_fifty_campaigns
  where id = p_campaign_id and status = 'active'
  for update;

  if not found then
    return jsonb_build_object('error', 'Campaign not found or not active');
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

-- Records the draw result (organiser only)
create or replace function public.record_fifty_fifty_draw(
  p_campaign_id     uuid,
  p_winner_ticket   int
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_owner_id uuid;
begin
  select owner_id into v_owner_id
  from fifty_fifty_campaigns
  where id = p_campaign_id;

  if v_owner_id is null then
    return jsonb_build_object('error', 'Campaign not found');
  end if;

  if v_owner_id != auth.uid() and not exists (
    select 1 from org_members
    where org_user_id = v_owner_id and member_user_id = auth.uid()
  ) then
    return jsonb_build_object('error', 'Not authorised');
  end if;

  -- Verify the winning ticket actually exists and is paid
  if not exists (
    select 1 from fifty_fifty_tickets
    where campaign_id = p_campaign_id
      and payment_status = 'paid'
      and p_winner_ticket = any(ticket_numbers)
  ) then
    return jsonb_build_object('error', 'Winning ticket not found in paid tickets');
  end if;

  update fifty_fifty_campaigns
  set status = 'drawn', winner_ticket_num = p_winner_ticket, drawn_at = now()
  where id = p_campaign_id;

  return jsonb_build_object('ok', true);
end;
$$;

-- Public campaign lookup (for the buyer purchase page)
create or replace function public.get_fifty_fifty_campaign(p_campaign_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_row fifty_fifty_campaigns%rowtype;
  v_tickets_sold bigint;
begin
  select * into v_row from fifty_fifty_campaigns where id = p_campaign_id;
  if not found then return jsonb_build_object('error', 'Not found'); end if;

  select coalesce(sum(array_length(ticket_numbers, 1)), 0)
  into v_tickets_sold
  from fifty_fifty_tickets
  where campaign_id = p_campaign_id and payment_status = 'paid';

  return jsonb_build_object(
    'id',            v_row.id,
    'title',         v_row.title,
    'description',   v_row.description,
    'emoji',         v_row.emoji,
    'ticket_price',  v_row.ticket_price,
    'status',        v_row.status,
    'payment_method',v_row.payment_method,
    'tickets_sold',  v_tickets_sold,
    'jackpot',       round(v_tickets_sold * v_row.ticket_price * 0.5, 2),
    'winner_ticket_num', v_row.winner_ticket_num
  );
end;
$$;

grant execute on function public.get_fifty_fifty_campaign(uuid)          to anon, authenticated;
grant execute on function public.get_my_fifty_fifty_campaigns()          to authenticated;
grant execute on function public.reserve_fifty_fifty_tickets(uuid,int,text,text,text,numeric,text,text) to authenticated;
grant execute on function public.record_fifty_fifty_draw(uuid,int)       to authenticated;
