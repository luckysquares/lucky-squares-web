-- ── Referral program ─────────────────────────────────────────────────────────

-- 1. Add referral_code column to profiles
alter table public.profiles
  add column if not exists referral_code text unique;

-- 2. Function to generate a unique 6-char alphanumeric code
create or replace function public.generate_referral_code()
returns text language plpgsql as $$
declare
  v_code   text;
  v_exists boolean;
begin
  loop
    v_code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));
    select exists(select 1 from public.profiles where referral_code = v_code) into v_exists;
    exit when not v_exists;
  end loop;
  return v_code;
end;
$$;

-- 3. Auto-assign referral code on profile creation
create or replace function public.assign_referral_code()
returns trigger language plpgsql as $$
begin
  if new.referral_code is null then
    new.referral_code := public.generate_referral_code();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_assign_referral_code on public.profiles;
create trigger trg_assign_referral_code
  before insert on public.profiles
  for each row execute function public.assign_referral_code();

-- 4. Backfill existing profiles
update public.profiles
set referral_code = public.generate_referral_code()
where referral_code is null;

-- 5. Referrals table
create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id),
  referred_id uuid not null references public.profiles(id),
  status      text not null default 'pending' check (status in ('pending', 'rewarded')),
  reward_code text,
  created_at  timestamptz not null default now(),
  rewarded_at timestamptz,
  unique (referred_id)
);

alter table public.referrals enable row level security;

-- 6. RPC: record a referral after new user signup
create or replace function public.apply_referral(p_code text)
returns void language plpgsql security definer as $$
declare
  v_referrer_id uuid;
begin
  if auth.uid() is null then return; end if;
  if p_code is null or trim(p_code) = '' then return; end if;

  select id into v_referrer_id
  from public.profiles
  where referral_code = upper(trim(p_code))
    and id != auth.uid();

  if v_referrer_id is null then return; end if;

  insert into public.referrals (referrer_id, referred_id)
  values (v_referrer_id, auth.uid())
  on conflict (referred_id) do nothing;
end;
$$;

-- 7. RPC: check if referred user has launched first campaign; issue reward if so
create or replace function public.check_referral_reward(p_user_id uuid)
returns table (referrer_email text, coupon_code text)
language plpgsql security definer as $$
declare
  v_referral       record;
  v_campaign_count int;
  v_coupon         text;
  v_referrer_email text;
begin
  select r.* into v_referral
  from public.referrals r
  where r.referred_id = p_user_id
    and r.status = 'pending';

  if not found then return; end if;

  select count(*) into v_campaign_count
  from public.fundraisers
  where owner_id = p_user_id
    and status = 'active';

  if v_campaign_count != 1 then return; end if;

  v_coupon := 'REFER' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  insert into public.coupons (code, description, discount_type, discount_value, max_uses)
  values (v_coupon, 'Referral reward - free campaign', 'percent', 100, 1);

  select p.email into v_referrer_email
  from public.profiles p
  where p.id = v_referral.referrer_id;

  update public.referrals
  set status = 'rewarded', reward_code = v_coupon, rewarded_at = now()
  where id = v_referral.id;

  return query select v_referrer_email, v_coupon;
end;
$$;

-- 8. RPC: get current user's referral code and counts
create or replace function public.get_my_referral_info()
returns table (referral_code text, pending_count int, rewarded_count int)
language plpgsql security definer as $$
begin
  return query
  select
    p.referral_code,
    (select count(*)::int from public.referrals r where r.referrer_id = auth.uid() and r.status = 'pending'),
    (select count(*)::int from public.referrals r where r.referrer_id = auth.uid() and r.status = 'rewarded')
  from public.profiles p
  where p.id = auth.uid();
end;
$$;
