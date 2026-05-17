-- ── Campaign expiry: launched_at column + cancelled status ──────────────────

-- 1. Add launched_at to fundraisers
alter table public.fundraisers
  add column if not exists launched_at timestamptz;

-- Backfill existing active/drawn campaigns (approximate — use created_at)
update public.fundraisers
set launched_at = created_at
where status in ('active', 'drawn') and launched_at is null;

-- 2. Trigger: auto-set launched_at when status changes to active
create or replace function public.set_launched_at()
returns trigger language plpgsql as $$
begin
  if new.status = 'active' and (old.status is distinct from 'active') and new.launched_at is null then
    new.launched_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_set_launched_at on public.fundraisers;
create trigger trg_set_launched_at
  before update on public.fundraisers
  for each row execute function public.set_launched_at();

-- 3. Function called by the cron Edge Function to cancel an expired campaign
--    Returns the cancelled fundraiser row so the Edge Function can process refunds.
create or replace function public.cancel_expired_campaigns()
returns table (
  id            uuid,
  title         text,
  contact_email text,
  payment_method text,
  launched_at   timestamptz
) language plpgsql security definer as $$
begin
  return query
  update public.fundraisers f
  set status = 'cancelled'
  where f.status = 'active'
    and f.launched_at < now() - interval '30 days'
    and (
      -- below break-even: sold revenue < non-donated prize cost
      (
        select coalesce(sum(case when p.donated then 0 else
          coalesce(regexp_replace(p.value, '[^0-9.]', '', 'g')::numeric, 0)
        end), 0)
        from public.prizes p
        where p.fundraiser_id = f.id
      ) > (
        select coalesce(s.sold_count, 0) * f.price_per_sq
        from public.fundraiser_stats s
        where s.fundraiser_id = f.id
      )
    )
  returning f.id, f.title, f.contact_email, f.payment_method, f.launched_at;
end;
$$;

-- 4. Enable pg_cron extension (run once as superuser in Supabase SQL editor)
-- create extension if not exists pg_cron;

-- 5. Schedule daily check at 2am AEST (16:00 UTC)
--    Run this in the Supabase SQL editor after enabling pg_cron:
-- select cron.schedule(
--   'cancel-expired-campaigns',
--   '0 16 * * *',
--   $$select net.http_post(
--     url := 'https://<your-project-ref>.supabase.co/functions/v1/cancel-expired-campaigns',
--     headers := '{"Authorization": "Bearer <your-service-role-key>"}'::jsonb,
--     body := '{}'::jsonb
--   )$$
-- );
