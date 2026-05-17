-- ── Admin portal ────────────────────────────────────────────────────────────

-- 1. Admin flag on profiles
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- 2. Sponsored squares
alter table public.squares
  add column if not exists is_sponsored boolean not null default false;

-- 3. RPC: fetch all fundraisers for admin (bypasses RLS)
create or replace function public.admin_get_fundraisers()
returns table (
  id              uuid,
  title           text,
  org             text,
  contact_name    text,
  contact_email   text,
  contact_phone   text,
  status          text,
  grid_size       integer,
  price_per_sq    numeric,
  payment_method  text,
  launched_at     timestamptz,
  created_at      timestamptz,
  owner_id        uuid,
  sold_count      bigint,
  emoji           text,
  draw_type       text,
  draw_date       timestamptz,
  winner_square_nums integer[]
) language plpgsql security definer as $$
begin
  return query
  select
    f.id, f.title, f.org, f.contact_name, f.contact_email, f.contact_phone,
    f.status, f.grid_size, f.price_per_sq, f.payment_method,
    f.launched_at, f.created_at, f.owner_id,
    coalesce(s.sold_count, 0)::bigint,
    f.emoji, f.draw_type, f.draw_date, f.winner_square_nums
  from public.fundraisers f
  left join public.fundraiser_stats s on s.fundraiser_id = f.id
  order by f.created_at desc;
end;
$$;

-- 4. RPC: fetch all profiles for admin
create or replace function public.admin_get_profiles()
returns table (
  id          uuid,
  email       text,
  full_name   text,
  plan        text,
  is_admin    boolean,
  created_at  timestamptz
) language plpgsql security definer as $$
begin
  return query
  select
    p.id,
    u.email,
    p.full_name,
    p.plan,
    p.is_admin,
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
end;
$$;

-- 5. RPC: fetch all org applications for admin
create or replace function public.admin_get_org_applications()
returns table (
  id            uuid,
  org_name      text,
  abn           text,
  org_type      text,
  street        text,
  suburb        text,
  state         text,
  postcode      text,
  contact_name  text,
  email         text,
  phone         text,
  status        text,
  created_at    timestamptz
) language plpgsql security definer as $$
begin
  return query
  select
    a.id, a.org_name, a.abn, a.org_type,
    a.street, a.suburb, a.state, a.postcode,
    a.contact_name, a.email, a.phone,
    a.status, a.created_at
  from public.org_applications a
  order by a.created_at desc;
end;
$$;

-- 6. RPC: admin update fundraiser fields
create or replace function public.admin_update_fundraiser(
  p_id          uuid,
  p_title       text,
  p_org         text,
  p_contact_name  text,
  p_contact_email text,
  p_contact_phone text,
  p_description text
) returns void language plpgsql security definer as $$
begin
  update public.fundraisers set
    title         = p_title,
    org           = p_org,
    contact_name  = p_contact_name,
    contact_email = p_contact_email,
    contact_phone = p_contact_phone,
    description   = p_description
  where id = p_id;
end;
$$;

-- 7. RPC: admin update buyer details on a square
create or replace function public.admin_update_buyer(
  p_fundraiser_id uuid,
  p_square_number integer,
  p_buyer_name    text,
  p_buyer_email   text,
  p_buyer_phone   text
) returns void language plpgsql security definer as $$
begin
  update public.squares set
    owner       = p_buyer_name,
    buyer_email = p_buyer_email,
    buyer_phone = p_buyer_phone
  where fundraiser_id = p_fundraiser_id
    and number = p_square_number;
end;
$$;

-- 8. RPC: admin gift a sponsored square
create or replace function public.admin_gift_square(
  p_fundraiser_id uuid,
  p_square_number integer
) returns void language plpgsql security definer as $$
begin
  update public.squares set
    status       = 'sold',
    is_sponsored = true,
    owner        = 'LuckySquares Australia',
    paid         = true
  where fundraiser_id = p_fundraiser_id
    and number = p_square_number
    and status = 'available';
end;
$$;

-- 9. RPC: admin financial dashboard metrics
create or replace function public.admin_dashboard_metrics()
returns json language plpgsql security definer as $$
declare
  v json;
begin
  select json_build_object(
    'casual_clients',   (select count(*) from public.profiles where plan = 'casual'),
    'org_clients',      (select count(*) from public.profiles where plan = 'org'),
    'live_campaigns',   (select count(*) from public.fundraisers where status = 'active'),
    'drawn_campaigns',  (select count(*) from public.fundraisers where status = 'drawn'),
    'draft_campaigns',  (select count(*) from public.fundraisers where status = 'draft'),
    'total_fees',       (select count(*) * 19 from public.fundraisers where status in ('active','drawn')),
    'total_raised',     (
      select coalesce(sum(s.sold_count * f.price_per_sq), 0)
      from public.fundraisers f
      join public.fundraiser_stats s on s.fundraiser_id = f.id
      where f.status = 'drawn'
    ),
    'total_prizes',     (
      select coalesce(sum(
        case when p.donated then 0
          else coalesce(regexp_replace(p.value, '[^0-9.]', '', 'g')::numeric, 0)
        end
      ), 0)
      from public.prizes p
      join public.fundraisers f on f.id = p.fundraiser_id
      where f.status = 'drawn'
    ),
    'new_org_applications', (
      select count(*) from public.org_applications
      where created_at > now() - interval '30 days'
    ),
    'campaigns_expiring_soon', (
      select count(*) from public.fundraisers
      where status = 'active'
        and launched_at is not null
        and launched_at < now() - interval '21 days'
    )
  ) into v;
  return v;
end;
$$;

-- 10. RPC: get all coupons for admin
create or replace function public.admin_get_coupons()
returns table (
  id             uuid,
  code           text,
  description    text,
  discount_type  text,
  discount_value numeric,
  max_uses       integer,
  uses_count     integer,
  expires_at     timestamptz,
  active         boolean,
  created_at     timestamptz
) language plpgsql security definer as $$
begin
  return query select * from public.coupons order by created_at desc;
end;
$$;

-- 11. RPC: create a coupon
create or replace function public.admin_create_coupon(
  p_code          text,
  p_description   text,
  p_discount_type text,
  p_discount_value numeric,
  p_max_uses      integer,
  p_expires_at    timestamptz
) returns uuid language plpgsql security definer as $$
declare v_id uuid;
begin
  insert into public.coupons (code, description, discount_type, discount_value, max_uses, expires_at)
  values (upper(trim(p_code)), p_description, p_discount_type, p_discount_value, p_max_uses, p_expires_at)
  returning id into v_id;
  return v_id;
end;
$$;

-- 12. RPC: deactivate a coupon
create or replace function public.admin_deactivate_coupon(p_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.coupons set active = false where id = p_id;
end;
$$;

-- To make a user an admin, run:
-- update public.profiles set is_admin = true where id = '<user-uuid>';
