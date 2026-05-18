create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  email       text not null,
  coupon_code text,
  sent_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

alter table public.invites enable row level security;

create or replace function public.admin_get_invites()
returns table (
  id          uuid,
  name        text,
  email       text,
  coupon_code text,
  sent_at     timestamptz
) language plpgsql security definer as $$
begin
  return query
  select i.id, i.name, i.email, i.coupon_code, i.sent_at
  from public.invites i
  order by i.sent_at desc;
end;
$$;

create or replace function public.admin_record_invite(
  p_name        text,
  p_email       text,
  p_coupon_code text
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  insert into public.invites (name, email, coupon_code)
  values (p_name, p_email, p_coupon_code)
  returning id into v_id;
  return v_id;
end;
$$;
