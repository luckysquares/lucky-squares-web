-- ── Organiser suspension ────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists suspended        boolean not null default false,
  add column if not exists suspension_reason text,
  add column if not exists suspended_at     timestamptz,
  add column if not exists suspended_by     uuid references auth.users(id);

-- ── Prevent suspended users from launching campaigns ────────────────────────

create or replace function public.check_not_suspended()
returns trigger language plpgsql security definer as $$
begin
  if exists (
    select 1 from public.profiles
    where id = auth.uid() and suspended = true
  ) then
    raise exception 'Your account has been suspended. Please contact support@luckysquares.com.au.';
  end if;
  return new;
end;
$$;

-- Fire on INSERT of a new fundraiser with status 'active' (launch attempt)
drop trigger if exists trigger_check_suspended_launch on public.fundraisers;
create trigger trigger_check_suspended_launch
  before insert on public.fundraisers
  for each row
  when (new.status = 'active')
  execute function public.check_not_suspended();

-- ── Update admin_get_profiles to include suspension fields ───────────────────

create or replace function public.admin_get_profiles()
returns table (
  id               uuid,
  email            text,
  full_name        text,
  plan             text,
  is_admin         boolean,
  suspended        boolean,
  suspension_reason text,
  suspended_at     timestamptz,
  created_at       timestamptz
) language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorised';
  end if;

  return query
  select
    p.id,
    u.email,
    p.full_name,
    p.plan,
    p.is_admin,
    p.suspended,
    p.suspension_reason,
    p.suspended_at,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- ── Admin RPCs to suspend and unsuspend ─────────────────────────────────────

create or replace function public.admin_suspend_user(
  p_user_id uuid,
  p_reason  text
) returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorised';
  end if;

  update public.profiles
  set
    suspended         = true,
    suspension_reason = p_reason,
    suspended_at      = now(),
    suspended_by      = auth.uid()
  where id = p_user_id;
end;
$$;

create or replace function public.admin_unsuspend_user(
  p_user_id uuid
) returns void language plpgsql security definer as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorised';
  end if;

  update public.profiles
  set
    suspended         = false,
    suspension_reason = null,
    suspended_at      = null,
    suspended_by      = null
  where id = p_user_id;
end;
$$;

-- ── RPC for user to check their own suspension status ───────────────────────

create or replace function public.get_my_suspension_status()
returns table (suspended boolean, suspension_reason text)
language plpgsql security definer as $$
begin
  return query
  select p.suspended, p.suspension_reason
  from public.profiles p
  where p.id = auth.uid();
end;
$$;
