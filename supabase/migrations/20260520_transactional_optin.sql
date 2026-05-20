-- Allow opted-out users to re-subscribe to transactional emails only

alter table public.email_opt_outs
  add column if not exists transactional_ok boolean not null default false;

-- Re-subscribe an email address for transactional emails only
create or replace function public.opt_in_transactional(p_email text)
returns void language plpgsql security definer as $$
begin
  insert into public.email_opt_outs (email, transactional_ok)
  values (lower(trim(p_email)), true)
  on conflict (email) do update
    set transactional_ok = true;
end;
$$;

-- Replace is_email_opted_out to understand transactional vs marketing context.
-- p_is_transactional = true  → only blocked if opted_out AND user hasn't re-opted in for transactional
-- p_is_transactional = false → blocked if opted_out, regardless of transactional_ok
drop function if exists public.is_email_opted_out(text);

create function public.is_email_opted_out(
  p_email          text,
  p_is_transactional boolean default false
)
returns boolean language plpgsql security definer as $$
begin
  return exists (
    select 1 from public.email_opt_outs
    where email = lower(trim(p_email))
      and opted_out = true
      and (not p_is_transactional or not transactional_ok)
  );
end;
$$;
