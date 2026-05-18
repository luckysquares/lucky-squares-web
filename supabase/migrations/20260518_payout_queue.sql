-- ── Payout queue ────────────────────────────────────────────────────────────
-- Records every completed draw for admin tracking.
-- Stripe/online campaigns need active payout processing by Lucky Squares.
-- Bank/in-person campaigns are informational (organiser collects directly).

create table if not exists public.payout_queue (
  id                uuid primary key default gen_random_uuid(),
  fundraiser_id     uuid not null references public.fundraisers(id),
  organiser_id      uuid references auth.users(id),
  campaign_title    text,
  org_name          text,
  contact_name      text,
  contact_email     text,
  payment_method    text,
  grid_size         integer,
  price_per_sq      numeric,
  sold_count        integer,
  funds_raised      numeric,
  payout_bank_name  text,
  payout_bsb        text,
  payout_account    text,
  status            text not null default 'pending',  -- 'pending' | 'processed'
  drawn_at          timestamptz not null default now(),
  processed_at      timestamptz,
  notes             text
);

alter table public.payout_queue enable row level security;

create policy "admin_payout_queue_all" on public.payout_queue
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );

-- ── Trigger: auto-populate payout_queue when a draw completes ───────────────

create or replace function public.queue_payout_after_draw()
returns trigger language plpgsql security definer as $$
declare
  v_sold integer;
begin
  if new.status = 'drawn' and (old.status is distinct from 'drawn') then
    select count(*)::integer into v_sold
    from public.squares
    where fundraiser_id = new.id and status = 'sold';

    insert into public.payout_queue (
      fundraiser_id, organiser_id, campaign_title, org_name,
      contact_name, contact_email, payment_method,
      grid_size, price_per_sq, sold_count, funds_raised,
      payout_bsb, payout_account, payout_bank_name
    ) values (
      new.id, new.user_id, new.title, new.org,
      new.contact_name, new.contact_email, new.payment_method,
      new.grid_size, new.price_per_sq, v_sold,
      v_sold * new.price_per_sq,
      new.bank_bsb, new.bank_account, new.bank_account_name
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_queue_payout on public.fundraisers;
create trigger trigger_queue_payout
  after update on public.fundraisers
  for each row execute function public.queue_payout_after_draw();

-- ── Admin RPCs ───────────────────────────────────────────────────────────────

create or replace function public.admin_get_payout_queue(p_status text default 'pending')
returns table (
  id               uuid,
  fundraiser_id    uuid,
  campaign_title   text,
  org_name         text,
  contact_name     text,
  contact_email    text,
  payment_method   text,
  sold_count       integer,
  funds_raised     numeric,
  drawn_at         timestamptz,
  payout_bank_name text,
  payout_bsb       text,
  payout_account   text,
  status           text,
  notes            text
) language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorised';
  end if;

  return query
  select
    pq.id, pq.fundraiser_id, pq.campaign_title, pq.org_name,
    pq.contact_name, pq.contact_email, pq.payment_method,
    pq.sold_count, pq.funds_raised, pq.drawn_at,
    pq.payout_bank_name, pq.payout_bsb, pq.payout_account,
    pq.status, pq.notes
  from public.payout_queue pq
  where (p_status = 'all' or pq.status = p_status)
  order by pq.drawn_at desc;
end;
$$;

create or replace function public.admin_mark_payout_processed(
  p_id    uuid,
  p_notes text default null
) returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorised';
  end if;

  update public.payout_queue
  set status       = 'processed',
      processed_at = now(),
      notes        = coalesce(p_notes, notes)
  where id = p_id;
end;
$$;
