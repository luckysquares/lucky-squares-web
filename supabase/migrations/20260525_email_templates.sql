-- ── Editable email templates ─────────────────────────────────────────────────
-- Only stores overrides. If no row exists for a given key the Edge Function
-- falls back to the hardcoded template in _shared/templates.ts.

create table if not exists public.email_templates (
  key        text        primary key,
  subject    text        not null,
  body       text        not null,
  updated_at timestamptz not null default now(),
  updated_by uuid        references auth.users(id) on delete set null
);

alter table public.email_templates enable row level security;

-- Service role (Edge Function + admin API) can do everything.
create policy "service_role_all" on public.email_templates
  for all using (true) with check (true);

-- ── Admin RPCs ─────────────────────────────────────────────────────────────

create or replace function public.admin_get_email_template(p_key text)
returns table (key text, subject text, body text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;
  return query select t.key, t.subject, t.body, t.updated_at
               from public.email_templates t where t.key = p_key;
end;
$$;

create or replace function public.admin_list_email_templates()
returns table (key text, updated_at timestamptz)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;
  return query select t.key, t.updated_at from public.email_templates t order by t.key;
end;
$$;

create or replace function public.admin_upsert_email_template(
  p_key     text,
  p_subject text,
  p_body    text
)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;
  insert into public.email_templates (key, subject, body, updated_at, updated_by)
  values (p_key, p_subject, p_body, now(), auth.uid())
  on conflict (key) do update
    set subject    = excluded.subject,
        body       = excluded.body,
        updated_at = now(),
        updated_by = auth.uid();
end;
$$;

create or replace function public.admin_delete_email_template(p_key text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;
  delete from public.email_templates where key = p_key;
end;
$$;
