-- Marketing CRM tables
-- Contacts, activity log, campaigns, and content calendar.

create table if not exists public.marketing_contacts (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  organisation       text,
  role               text,
  email              text,
  phone              text,
  type               text,
  status             text not null default 'To contact',
  last_contact_date  date,
  next_action        text,
  next_action_date   date,
  notes              text,
  created_at         timestamptz not null default now()
);

create table if not exists public.marketing_contact_logs (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.marketing_contacts(id) on delete cascade,
  entry       text not null,
  entry_type  text,
  logged_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create table if not exists public.marketing_campaigns (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  channel              text,
  status               text not null default 'Planned',
  start_date           date,
  end_date             date,
  budget_aud           numeric(10,2),
  spend_aud            numeric(10,2),
  signups_attributed   integer,
  result_notes         text,
  created_at           timestamptz not null default now()
);

create table if not exists public.marketing_content (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  channel         text,
  status          text not null default 'Draft',
  scheduled_date  date,
  content         text,
  notes           text,
  created_at      timestamptz not null default now()
);

-- Admin-only: no direct access for anon/authenticated users
alter table public.marketing_contacts    enable row level security;
alter table public.marketing_contact_logs enable row level security;
alter table public.marketing_campaigns   enable row level security;
alter table public.marketing_content     enable row level security;

create policy "admin only" on public.marketing_contacts    using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "admin only" on public.marketing_contact_logs using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "admin only" on public.marketing_campaigns   using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
create policy "admin only" on public.marketing_content     using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
