-- ── Error logging ─────────────────────────────────────────────────────────────

create table if not exists public.error_logs (
  id         uuid        primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  level      text        not null default 'error'
               check (level in ('error', 'warn', 'info')),
  source     text        not null default 'server'
               check (source in ('server', 'client', 'database', 'edge')),
  route      text,
  message    text        not null,
  stack      text,
  user_id    uuid        references auth.users(id) on delete set null,
  metadata   jsonb,
  resolved   boolean     not null default false
);

alter table public.error_logs enable row level security;

-- Only service_role can insert (server-side logging only)
create policy "service_role_all" on public.error_logs
  for all using (true)
  with check (true);

-- Indexes for search and filtering
create index if not exists error_logs_created_at_idx on public.error_logs (created_at desc);
create index if not exists error_logs_level_idx      on public.error_logs (level);
create index if not exists error_logs_source_idx     on public.error_logs (source);
create index if not exists error_logs_resolved_idx   on public.error_logs (resolved);
create index if not exists error_logs_user_id_idx    on public.error_logs (user_id);
create index if not exists error_logs_message_fts    on public.error_logs
  using gin (to_tsvector('english', coalesce(message, '') || ' ' || coalesce(route, '')));

-- ── Admin RPC: fetch logs ─────────────────────────────────────────────────────

create or replace function public.admin_get_error_logs(
  p_search   text    default null,
  p_level    text    default null,
  p_source   text    default null,
  p_resolved boolean default null,
  p_days     int     default 30,
  p_limit    int     default 200,
  p_offset   int     default 0
)
returns table (
  id         uuid,
  created_at timestamptz,
  level      text,
  source     text,
  route      text,
  message    text,
  stack      text,
  user_id    uuid,
  metadata   jsonb,
  resolved   boolean
)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;

  return query
  select
    e.id, e.created_at, e.level, e.source, e.route,
    e.message, e.stack, e.user_id, e.metadata, e.resolved
  from public.error_logs e
  where
    (p_days    is null or e.created_at > now() - (p_days || ' days')::interval)
    and (p_level   is null or e.level    = p_level)
    and (p_source  is null or e.source   = p_source)
    and (p_resolved is null or e.resolved = p_resolved)
    and (p_search  is null or (
      to_tsvector('english', coalesce(e.message,'') || ' ' || coalesce(e.route,''))
        @@ plainto_tsquery('english', p_search)
      or e.message ilike '%' || p_search || '%'
      or e.route   ilike '%' || p_search || '%'
    ))
  order by e.created_at desc
  limit  p_limit
  offset p_offset;
end;
$$;

-- ── Admin RPC: mark resolved / unresolved ─────────────────────────────────────

create or replace function public.admin_resolve_error_log(p_id uuid, p_resolved boolean default true)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;
  update public.error_logs set resolved = p_resolved where id = p_id;
end;
$$;

-- ── Admin RPC: summary counts ─────────────────────────────────────────────────

create or replace function public.admin_error_log_summary(p_days int default 7)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_today   int;
  v_week    int;
  v_open    int;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;
  select count(*) into v_today from public.error_logs where created_at > now() - interval '24 hours' and level = 'error';
  select count(*) into v_week  from public.error_logs where created_at > now() - interval '7 days'   and level = 'error';
  -- open count respects the same time window as the log list
  select count(*) into v_open  from public.error_logs
    where resolved = false and level = 'error'
      and created_at > now() - (p_days || ' days')::interval;
  return jsonb_build_object('today', v_today, 'week', v_week, 'open', v_open);
end;
$$;
