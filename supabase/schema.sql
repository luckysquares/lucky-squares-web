-- Run this in the Supabase SQL editor after creating your project.
-- Enable Row Level Security on all tables.

-- ── Profiles (extends auth.users) ────────────────────────────────────────────

create table if not exists profiles (
  id            uuid references auth.users on delete cascade primary key,
  full_name     text,
  organisation  text,
  created_at    timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

-- Auto-create profile row on sign-up
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, organisation)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'organisation'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ── Fundraisers ───────────────────────────────────────────────────────────────

create table if not exists fundraisers (
  id                  uuid default gen_random_uuid() primary key,
  owner_id            uuid references profiles(id) on delete cascade not null,
  title               text not null,
  org                 text not null,
  emoji               text default '🍀',
  description         text,
  thank_you           text,
  grid_size           int not null check (grid_size in (25, 50, 100)),
  price_per_sq        numeric(10,2) not null check (price_per_sq > 0),
  status              text default 'draft' check (status in ('draft', 'active', 'closed', 'drawn')),
  draw_type           text default 'manual' check (draw_type in ('manual', 'auto', 'full')),
  draw_date           timestamptz,
  contact_name        text,
  contact_email       text,
  contact_phone       text,
  payment_method      text default 'inperson' check (payment_method in ('inperson', 'bank', 'bank_inperson', 'stripe')),
  bank_account_name   text,
  bank_bsb            text,
  bank_account        text,
  stripe_account_id   text,
  winner_square_num   int,
  created_at          timestamptz default now()
);

alter table fundraisers enable row level security;

create policy "Owners can manage their fundraisers"
  on fundraisers for all using (auth.uid() = owner_id);

create policy "Anyone can read active or drawn fundraisers"
  on fundraisers for select using (status in ('active', 'drawn'));

-- ── Prizes ────────────────────────────────────────────────────────────────────

create table if not exists prizes (
  id             uuid default gen_random_uuid() primary key,
  fundraiser_id  uuid references fundraisers(id) on delete cascade not null,
  place          text not null,
  description    text,
  value          text,
  donated        boolean default false,
  sort_order     int default 0
);

alter table prizes enable row level security;

create policy "Fundraiser owners can manage prizes"
  on prizes for all
  using (auth.uid() = (select owner_id from fundraisers where id = fundraiser_id));

create policy "Anyone can read prizes for active or drawn fundraisers"
  on prizes for select
  using (exists (
    select 1 from fundraisers
    where id = fundraiser_id and status in ('active', 'drawn')
  ));

-- ── Squares ───────────────────────────────────────────────────────────────────

create table if not exists squares (
  id              uuid default gen_random_uuid() primary key,
  fundraiser_id   uuid references fundraisers(id) on delete cascade not null,
  number          int not null,
  status          text default 'available' check (status in ('available', 'reserved', 'sold')),
  reserved_until  timestamptz,
  buyer_name      text,
  buyer_email     text,
  buyer_phone     text,
  paid            boolean default false,
  created_at      timestamptz default now(),
  unique (fundraiser_id, number)
);

alter table squares enable row level security;

create policy "Fundraiser owners can read all squares"
  on squares for select
  using (auth.uid() = (select owner_id from fundraisers where id = fundraiser_id));

create policy "Anyone can read squares for active or drawn fundraisers"
  on squares for select
  using (exists (
    select 1 from fundraisers
    where id = fundraiser_id and status in ('active', 'drawn')
  ));

create policy "Anyone can reserve available squares"
  on squares for update
  using (status = 'available')
  with check (status = 'reserved');

create policy "Owners can update squares on their fundraisers"
  on squares for update
  using (auth.uid() = (select owner_id from fundraisers where id = fundraiser_id));

-- Reserve a square (also handles expired reservations for that square)
create or replace function reserve_square(
  p_fundraiser_id uuid,
  p_square_number  int
) returns boolean language plpgsql security definer set search_path = public as $$
declare v_updated int;
begin
  update squares
  set status = 'reserved', reserved_until = now() + interval '7 minutes'
  where fundraiser_id = p_fundraiser_id
    and number = p_square_number
    and (status = 'available' or (status = 'reserved' and reserved_until < now()));
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

-- Release a reserved square back to available
create or replace function release_square(
  p_fundraiser_id uuid,
  p_square_number  int
) returns void language plpgsql security definer set search_path = public as $$
begin
  update squares
  set status = 'available', reserved_until = null, buyer_name = null, buyer_email = null, buyer_phone = null
  where fundraiser_id = p_fundraiser_id
    and number = p_square_number
    and status = 'reserved';
end;
$$;

-- Mark reserved squares as sold after checkout
create or replace function claim_squares(
  p_fundraiser_id  uuid,
  p_square_numbers int[],
  p_buyer_name     text,
  p_buyer_email    text,
  p_buyer_phone    text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  update squares
  set status = 'sold', buyer_name = p_buyer_name, buyer_email = p_buyer_email,
      buyer_phone = p_buyer_phone, reserved_until = null, paid = false
  where fundraiser_id = p_fundraiser_id
    and number = any(p_square_numbers);
end;
$$;

-- Record draw result (owner only)
create or replace function record_draw(
  p_fundraiser_id     uuid,
  p_winner_square_num int
) returns void language plpgsql security definer set search_path = public as $$
begin
  if (select owner_id from fundraisers where id = p_fundraiser_id) != auth.uid() then
    raise exception 'not authorised';
  end if;
  update fundraisers
    set status = 'drawn', winner_square_num = p_winner_square_num
    where id = p_fundraiser_id;
end;
$$;

-- Expire stale reservations (call this via a cron job or pg_cron)
create or replace function expire_stale_reservations()
returns void language sql security definer set search_path = public as $$
  update squares
  set status = 'available', reserved_until = null, buyer_name = null, buyer_email = null
  where status = 'reserved' and reserved_until < now();
$$;

-- ── Migrations (run these against an existing database) ──────────────────────
-- 2026-05-16: contact_name, payment method options, donated prizes, buyer phone
--
-- alter table fundraisers
--   add column if not exists contact_name text,
--   add column if not exists contact_email text,
--   add column if not exists contact_phone text;
--
-- alter table fundraisers
--   drop constraint if exists fundraisers_payment_method_check,
--   add constraint fundraisers_payment_method_check
--     check (payment_method in ('inperson', 'bank', 'bank_inperson', 'stripe'));
--
-- alter table prizes
--   add column if not exists donated boolean default false;
--
-- alter table squares
--   add column if not exists buyer_phone text;
--
-- create policy "Owners can update squares on their fundraisers"
--   on squares for update
--   using (auth.uid() = (select owner_id from fundraisers where id = fundraiser_id));

-- ── Helper view: sold count per fundraiser ────────────────────────────────────

create or replace view fundraiser_stats
  with (security_invoker = true)
as
  select
    fundraiser_id,
    count(*) filter (where status = 'sold')     as sold_count,
    count(*) filter (where status = 'reserved') as reserved_count,
    count(*)                                    as total_count
  from squares
  group by fundraiser_id;
