-- Welcome sequence tracking + org monthly summary infrastructure
-- Wires up the 8 untriggered emails:
--   welcome_day3_no_campaign, welcome_day7_no_campaign, re_engagement (daily cron)
--   org_monthly_summary (monthly cron)
--   first_campaign_tips (draw-notification triggers this after first draw)

-- ── Bitmask column on profiles ────────────────────────────────────────────────
-- Tracks which welcome sequence emails this user has already received.
--   bit 0 (1) = day3 sent
--   bit 1 (2) = day7 sent
--   bit 2 (4) = re_engagement sent
alter table public.profiles
  add column if not exists welcome_emails_sent integer not null default 0;

-- ── batch_welcome_day3 ───────────────────────────────────────────────────────
-- Returns users who signed up 2-4 days ago, have not yet launched a campaign,
-- and have not yet received the day-3 email. Atomically marks them to prevent
-- double-sending if the cron runs more than once per 2-day window.
create or replace function public.batch_welcome_day3()
returns table(user_id uuid, email text, first_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with to_mark as (
    select p.id
    from   public.profiles p
    join   auth.users u on u.id = p.id
    where  p.created_at >= now() - interval '4 days'
      and  p.created_at <  now() - interval '2 days'
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

revoke execute on function public.batch_welcome_day3() from public, anon, authenticated;
grant  execute on function public.batch_welcome_day3() to service_role;

-- ── batch_welcome_day7 ───────────────────────────────────────────────────────
create or replace function public.batch_welcome_day7()
returns table(user_id uuid, email text, first_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with to_mark as (
    select p.id
    from   public.profiles p
    join   auth.users u on u.id = p.id
    where  p.created_at >= now() - interval '8 days'
      and  p.created_at <  now() - interval '6 days'
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
    coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'there')
  from   marked m
  join   public.profiles p on p.id = m.id
  join   auth.users u      on u.id = m.id;
end;
$$;

revoke execute on function public.batch_welcome_day7() from public, anon, authenticated;
grant  execute on function public.batch_welcome_day7() to service_role;

-- ── batch_re_engagement ──────────────────────────────────────────────────────
-- Users who signed up 30+ days ago, never launched a campaign, haven't had
-- the re-engagement email yet.
create or replace function public.batch_re_engagement()
returns table(user_id uuid, email text, first_name text, org_name text)
language plpgsql security definer set search_path = public as $$
begin
  return query
  with to_mark as (
    select p.id
    from   public.profiles p
    join   auth.users u on u.id = p.id
    where  p.created_at < now() - interval '30 days'
      and  (p.welcome_emails_sent & 4) = 0
      and  u.email_confirmed_at is not null
      and  not exists (
             select 1 from public.fundraisers f where f.owner_id = p.id
           )
  ),
  marked as (
    update public.profiles
    set    welcome_emails_sent = welcome_emails_sent | 4
    where  id in (select id from to_mark)
    returning id
  )
  select
    m.id,
    u.email::text,
    coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'there'),
    coalesce(nullif(p.organisation, ''), 'your organisation')::text
  from   marked m
  join   public.profiles p on p.id = m.id
  join   auth.users u      on u.id = m.id;
end;
$$;

revoke execute on function public.batch_re_engagement() from public, anon, authenticated;
grant  execute on function public.batch_re_engagement() to service_role;

-- ── get_org_monthly_summary ──────────────────────────────────────────────────
-- Returns one row per org-plan user who had any activity in the given month
-- (campaigns launched or currently active). Called on the 1st of each month
-- for the previous month.
create or replace function public.get_org_monthly_summary(p_year int, p_month int)
returns table(
  user_id               uuid,
  email                 text,
  first_name            text,
  org_name              text,
  campaign_count        bigint,
  total_squares_sold    bigint,
  total_raised_cents    bigint,
  draws_completed       bigint,
  active_campaign_count bigint
)
language plpgsql security definer set search_path = public as $$
declare
  v_start  timestamptz := make_timestamptz(p_year, p_month, 1, 0, 0, 0, 'UTC');
  v_end    timestamptz := v_start + interval '1 month';
begin
  return query
  with fundraiser_stats as (
    select
      f.owner_id,
      count(distinct f.id) filter (
        where f.launched_at >= v_start and f.launched_at < v_end
      ) as month_campaigns,
      coalesce(sum(sq.sold_cnt) filter (
        where f.launched_at >= v_start and f.launched_at < v_end
      ), 0) as month_squares,
      coalesce(sum(sq.sold_cnt * round(f.price_per_sq::numeric * 100)) filter (
        where f.launched_at >= v_start and f.launched_at < v_end
      ), 0) as month_cents,
      count(distinct f.id) filter (
        where f.status = 'drawn'
          and f.launched_at >= v_start and f.launched_at < v_end
      ) as month_draws,
      count(distinct f.id) filter (where f.status = 'active') as active_count
    from public.fundraisers f
    left join lateral (
      select count(*) filter (where s.paid = true) as sold_cnt
      from   public.squares s
      where  s.fundraiser_id = f.id
    ) sq on true
    group by f.owner_id
  )
  select
    p.id,
    u.email::text,
    coalesce(nullif(split_part(p.full_name, ' ', 1), ''), 'there'),
    coalesce(nullif(p.organisation, ''), 'your organisation')::text,
    coalesce(fs.month_campaigns, 0),
    coalesce(fs.month_squares,   0),
    coalesce(fs.month_cents,     0),
    coalesce(fs.month_draws,     0),
    coalesce(fs.active_count,    0)
  from   public.profiles p
  join   auth.users u on u.id = p.id
  left   join fundraiser_stats fs on fs.owner_id = p.id
  where  p.plan = 'org'
    and  u.email is not null
    and  (
      coalesce(fs.month_campaigns, 0) > 0
      or coalesce(fs.month_squares, 0) > 0
      or coalesce(fs.active_count,  0) > 0
    );
end;
$$;

revoke execute on function public.get_org_monthly_summary(int, int) from public, anon, authenticated;
grant  execute on function public.get_org_monthly_summary(int, int) to service_role;

-- ── pg_cron: daily welcome sequence at 09:00 AEST (23:00 UTC) ───────────────
select cron.schedule(
  'welcome-sequence',
  '0 23 * * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_functions_url') || '/welcome-sequence',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);

-- ── pg_cron: monthly org summary on 1st at 10:00 AEST (00:00 UTC) ───────────
select cron.schedule(
  'org-monthly-summary',
  '0 0 1 * *',
  $$
  select net.http_post(
    url     := current_setting('app.supabase_functions_url') || '/org-monthly-summary',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{}'::jsonb
  );
  $$
);
