-- ── Coupon codes ────────────────────────────────────────────────────────────

create table if not exists public.coupons (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,          -- always stored uppercase
  description    text,                          -- internal note (e.g. "Sunbury Primary free launch")
  discount_type  text not null check (discount_type in ('percent', 'fixed')),
  discount_value numeric(10,2) not null check (discount_value > 0),
  max_uses       integer,                       -- null = unlimited
  uses_count     integer not null default 0,
  expires_at     timestamptz,                   -- null = never expires
  active         boolean not null default true,
  created_at     timestamptz not null default now()
);

-- Normalise codes to uppercase on insert/update
create or replace function public.normalise_coupon_code()
returns trigger language plpgsql as $$
begin
  new.code := upper(trim(new.code));
  return new;
end;
$$;

drop trigger if exists trg_normalise_coupon_code on public.coupons;
create trigger trg_normalise_coupon_code
  before insert or update on public.coupons
  for each row execute function public.normalise_coupon_code();

-- RLS: clients cannot read the coupons table directly
alter table public.coupons enable row level security;

-- Validate a coupon code — returns discount details if valid, error message if not.
-- security definer so anonymous users can call it without reading the table.
create or replace function public.validate_coupon(p_code text)
returns table (valid boolean, discount_type text, discount_value numeric, message text)
language plpgsql security definer as $$
declare
  v record;
begin
  select * into v
  from public.coupons
  where code = upper(trim(p_code))
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses);

  if not found then
    return query select false, null::text, null::numeric, 'Invalid or expired coupon code.'::text;
  else
    return query select true, v.discount_type, v.discount_value, null::text;
  end if;
end;
$$;

-- Redeem a coupon — increments uses_count atomically.
-- Called at launch time after validation passes.
create or replace function public.redeem_coupon(p_code text)
returns void language plpgsql security definer as $$
begin
  update public.coupons
  set uses_count = uses_count + 1
  where code = upper(trim(p_code))
    and active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or uses_count < max_uses);
end;
$$;

-- ── Example: insert a 100% off coupon for a specific org ────────────────────
-- insert into public.coupons (code, description, discount_type, discount_value, max_uses)
-- values ('SUNBURY2026', 'Sunbury Primary free launch', 'percent', 100, 1);

-- ── Example: insert a $19 off (fully free) single-use coupon ────────────────
-- insert into public.coupons (code, description, discount_type, discount_value, max_uses)
-- values ('FRIEND2026', 'Friends and family promo', 'fixed', 19, 5);
