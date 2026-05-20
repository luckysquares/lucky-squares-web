-- De-identification of buyer records after 12 months of inactivity
-- Legal requirement: per Evyenia Walton, Lynch Meyer (2026-05-19)
-- Scrubs PII (name, email, phone) from squares on completed campaigns
-- where the square has not been updated in 12+ months.
-- Aggregate metrics (square number, paid status, amount) are preserved.

create or replace function public.deidentify_stale_buyer_records()
returns integer
language plpgsql
security definer
as $$
declare
  v_count integer;
begin
  update public.squares s
  set
    owner       = '[removed]',
    buyer_email = null,
    buyer_phone = null,
    updated_at  = now()
  from public.fundraisers f
  where s.fundraiser_id = f.id
    and f.status        = 'drawn'
    and s.updated_at    < now() - interval '12 months'
    and (s.owner is not null or s.buyer_email is not null or s.buyer_phone is not null)
    and s.owner        != '[removed]';

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Schedule to run on the 1st of each month at 3am AEST (17:00 UTC previous day)
-- Requires pg_cron extension (enabled by default on Supabase Pro)
select cron.schedule(
  'deidentify-stale-buyer-records',
  '0 17 1 * *',
  $$ select public.deidentify_stale_buyer_records(); $$
);
