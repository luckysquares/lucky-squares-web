-- ── Founding Member ───────────────────────────────────────────────────────────

alter table profiles add column if not exists is_founding_member boolean not null default false;

-- Auto-assign founding member status on profile creation (first 100)
create or replace function maybe_assign_founding_member()
returns trigger language plpgsql security definer as $$
begin
  if (select count(*) from profiles where is_founding_member = true) < 100 then
    new.is_founding_member := true;
  end if;
  return new;
end;
$$;

drop trigger if exists assign_founding_member on profiles;
create trigger assign_founding_member
  before insert on profiles
  for each row execute procedure maybe_assign_founding_member();

-- Allow public read of profiles (needed for founding member badge on campaign pages)
drop policy if exists "Public can read profiles" on profiles;
create policy "Public can read profiles"
  on profiles for select using (true);

-- Admin RPC: manually toggle founding member for a user
create or replace function admin_set_founding_member(p_user_id uuid, p_value boolean)
returns void language sql security definer as $$
  update profiles set is_founding_member = p_value where id = p_user_id;
$$;

-- Update admin_get_profiles to include founding member status
create or replace function public.admin_get_profiles()
returns table (
  id                uuid,
  email             text,
  full_name         text,
  plan              text,
  is_admin          boolean,
  is_founding_member boolean,
  suspended         boolean,
  suspension_reason text,
  suspended_at      timestamptz,
  created_at        timestamptz
) language plpgsql security definer as $$
begin
  return query
  select
    p.id,
    u.email,
    p.full_name,
    p.plan,
    p.is_admin,
    p.is_founding_member,
    p.suspended,
    p.suspension_reason,
    p.suspended_at,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- ── Waitlist ───────────────────────────────────────────────────────────────────

create table if not exists waitlist (
  id         uuid default gen_random_uuid() primary key,
  email      text not null,
  name       text,
  created_at timestamptz default now(),
  constraint waitlist_email_unique unique (email)
);

alter table waitlist enable row level security;

create policy "Anyone can join waitlist"
  on waitlist for insert with check (true);

-- Admin RPC: get waitlist entries
create or replace function admin_get_waitlist()
returns table (id uuid, email text, name text, created_at timestamptz)
language sql security definer as $$
  select id, email, name, created_at from waitlist order by created_at desc;
$$;
