-- Welcome sequence v2
-- Adds day-5 coupon email, shifts day-3 → day-9, day-7 → day-21.
-- Adds welcome_coupon_code column to profiles so day-21 can reference the day-5 coupon.

alter table public.profiles
  add column if not exists welcome_coupon_code text;

-- ── batch_welcome_day5 ───────────────────────────────────────────────────────
-- Users who signed up 4-6 days ago, haven't launched a campaign, haven't
-- received the day-5 coupon email. Bit 3 (8).
create or replace function public.batch_welcome_day5()
returns table(user_id uuid, email text, first_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with to_mark as (
    select p.id
    from   public.profiles p
    join   auth.users u on u.id = p.id
    where  p.created_at >= now() - interval '6 days'
      and  p.created_at <  now() - interval '4 days'
      and  (p.welcome_emails_sent & 8) = 0
      and  u.email_confirmed_at is not null
      and  not exists (
             select 1 from public.fundraisers f where f.owner_id = p.id
           )
  ),
  marked as (
    update public.profiles
    set    welcome_emails_sent = welcome_emails_sent | 8
    where  id in (select id from to_mark)
    returning id
  )
  select
    m.id,
    u.email::text,
    coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'there')
  from   marked m
  join   public.profiles p on p.id = m.id
  join   auth.users u      on u.id = m.id;
end;
$$;

revoke execute on function public.batch_welcome_day5() from public, anon, authenticated;
grant  execute on function public.batch_welcome_day5() to service_role;

-- ── batch_welcome_day9 ───────────────────────────────────────────────────────
-- Was batch_welcome_day3 — now fires at day 9 (8-10 day window). Bit 0 (1).
create or replace function public.batch_welcome_day9()
returns table(user_id uuid, email text, first_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with to_mark as (
    select p.id
    from   public.profiles p
    join   auth.users u on u.id = p.id
    where  p.created_at >= now() - interval '10 days'
      and  p.created_at <  now() - interval '8 days'
      and  (p.welcome_emails_sent & 1) = 0
      and  u.email_confirmed_at is not null
      and  not exists (
             select 1 from public.fundraisers f where f.owner_id = p.id
           )
  ),
  marked as (
    update public.profiles
    set    welcome_emails_sent = welcome_emails_sent | 1
    where  id in (select id from to_mark)
    returning id
  )
  select
    m.id,
    u.email::text,
    coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'there')
  from   marked m
  join   public.profiles p on p.id = m.id
  join   auth.users u      on u.id = m.id;
end;
$$;

revoke execute on function public.batch_welcome_day9() from public, anon, authenticated;
grant  execute on function public.batch_welcome_day9() to service_role;

-- ── batch_welcome_day21 ──────────────────────────────────────────────────────
-- Was batch_welcome_day7 — now fires at day 21 (20-22 day window). Bit 1 (2).
-- Returns welcome_coupon_code so the edge function can include it in the email.
create or replace function public.batch_welcome_day21()
returns table(user_id uuid, email text, first_name text, coupon_code text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with to_mark as (
    select p.id
    from   public.profiles p
    join   auth.users u on u.id = p.id
    where  p.created_at >= now() - interval '22 days'
      and  p.created_at <  now() - interval '20 days'
      and  (p.welcome_emails_sent & 2) = 0
      and  u.email_confirmed_at is not null
      and  not exists (
             select 1 from public.fundraisers f where f.owner_id = p.id
           )
  ),
  marked as (
    update public.profiles
    set    welcome_emails_sent = welcome_emails_sent | 2
    where  id in (select id from to_mark)
    returning id
  )
  select
    m.id,
    u.email::text,
    coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'there'),
    p.welcome_coupon_code
  from   marked m
  join   public.profiles p on p.id = m.id
  join   auth.users u      on u.id = m.id;
end;
$$;

revoke execute on function public.batch_welcome_day21() from public, anon, authenticated;
grant  execute on function public.batch_welcome_day21() to service_role;

-- ── set_welcome_coupon_code ──────────────────────────────────────────────────
-- Called by the edge function after generating a coupon for a user so the
-- day-21 email can reference the same code.
create or replace function public.set_welcome_coupon_code(p_user_id uuid, p_code text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set    welcome_coupon_code = p_code
  where  id = p_user_id;
end;
$$;

revoke execute on function public.set_welcome_coupon_code(uuid, text) from public, anon, authenticated;
grant  execute on function public.set_welcome_coupon_code(uuid, text) to service_role;
