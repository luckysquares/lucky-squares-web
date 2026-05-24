-- ── Mariposa chat logging ────────────────────────────────────────────────────

create table if not exists public.mariposa_chats (
  id            uuid        primary key default gen_random_uuid(),
  session_id    uuid        not null,
  fundraiser_id uuid        references public.fundraisers(id) on delete set null,
  role          text        not null check (role in ('user', 'assistant')),
  content       text        not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_mariposa_chats_session    on public.mariposa_chats (session_id, created_at);
create index if not exists idx_mariposa_chats_created_at on public.mariposa_chats (created_at);
create index if not exists idx_mariposa_chats_fundraiser on public.mariposa_chats (fundraiser_id) where fundraiser_id is not null;

-- Row-level security
alter table public.mariposa_chats enable row level security;

-- Admins can read all rows via the authenticated browser client
create policy "admin_select_mariposa_chats" on public.mariposa_chats
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and is_admin = true
    )
  );

-- No public/participant access — inserts go through the service role key in the API route

-- ── 90-day retention purge ────────────────────────────────────────────────────

create or replace function public.purge_old_mariposa_chats()
returns integer language plpgsql security definer as $$
declare
  deleted_count integer;
begin
  delete from public.mariposa_chats
  where created_at < now() - interval '90 days';
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Schedule daily purge at 3am AEST (17:00 UTC).
-- Requires pg_cron. Run in Supabase SQL editor if not already scheduled:
--
-- select cron.schedule(
--   'purge-mariposa-chats',
--   '0 17 * * *',
--   $$select public.purge_old_mariposa_chats()$$
-- );
