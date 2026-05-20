-- Tracking columns for daily square-sold digest and no-sales nudge
alter table fundraisers
  add column if not exists last_digest_at timestamptz,
  add column if not exists last_nudge_at  timestamptz;

-- pg_cron: run daily digest at 10:00 UTC (8pm AEST)
select cron.schedule(
  'square-sold-digest',
  '0 10 * * *',
  $$
  select net.http_post(
    url := current_setting('app.supabase_functions_url') || '/square-sold-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  );
  $$
);
