create table if not exists public.email_opt_outs (
  email        text primary key,
  token        uuid not null default gen_random_uuid(),
  opted_out    boolean not null default false,
  opted_out_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.email_opt_outs enable row level security;

-- No direct client access — all reads/writes go through security definer functions
create policy "no direct access" on public.email_opt_outs
  as restrictive for all using (false);

-- Get or create an unsubscribe token for an email address
create or replace function public.get_unsubscribe_token(p_email text)
returns uuid language plpgsql security definer as $$
declare
  v_token uuid;
begin
  insert into public.email_opt_outs (email)
  values (p_email)
  on conflict (email) do nothing;
  select token into v_token from public.email_opt_outs where email = p_email;
  return v_token;
end;
$$;

-- Mark an email as opted out using its token; returns the email address
create or replace function public.unsubscribe_by_token(p_token uuid)
returns text language plpgsql security definer as $$
declare
  v_email text;
begin
  update public.email_opt_outs
  set opted_out = true, opted_out_at = now()
  where token = p_token
  returning email into v_email;
  return v_email;
end;
$$;

-- Check whether an email is opted out
create or replace function public.is_email_opted_out(p_email text)
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from public.email_opt_outs
    where email = p_email and opted_out = true
  );
end;
$$;
