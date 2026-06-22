-- Reschedule square-sold-digest from 10:00 UTC (7:30pm ACST) to 14:30 UTC,
-- which is midnight ACST (UTC+9:30).
--
-- Caveat: pg_cron runs on a fixed UTC time and has no DST awareness. South
-- Australia observes ACDT (UTC+10:30) during daylight saving (Oct-Apr), so
-- during that period this job will fire at 1:00am ACDT instead of midnight.
-- There is no way to express "always midnight local time" in pg_cron without
-- a second seasonal migration — flag if that 1-hour drift matters.

select cron.unschedule('square-sold-digest');

select cron.schedule(
  'square-sold-digest',
  '30 14 * * *',
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
