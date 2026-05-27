-- Create org_applications table (was referenced in functions but never created)
create table if not exists public.org_applications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  org_name     text not null,
  abn          text not null,
  org_type     text,
  street       text,
  suburb       text,
  state        text,
  postcode     text,
  contact_name text,
  email        text not null,
  phone        text,
  status       text not null default 'pending',
  created_at   timestamptz not null default now()
);

-- RLS: only service_role can read/write (admin API routes use service role client)
alter table public.org_applications enable row level security;

-- Utility RPCs used by the org-signup page to check for duplicates
create or replace function public.org_abn_exists(p_abn text)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.org_applications
    where abn = p_abn and status != 'rejected'
  );
$$;

create or replace function public.org_email_exists(p_email text)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.org_applications
    where lower(email) = lower(p_email) and status != 'rejected'
  );
$$;

grant execute on function public.org_abn_exists(text)   to anon, authenticated;
grant execute on function public.org_email_exists(text) to anon, authenticated;
