-- Add slug to admin_get_fundraisers and get_org_campaigns so that
-- admin and org pages can construct human-readable campaign URLs.

-- ── admin_get_fundraisers ─────────────────────────────────────────────────────

drop function if exists public.admin_get_fundraisers();
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
  winner_square_nums integer[],
  description     text,
  image_url       text,
  slug            text
) language plpgsql security definer as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorized';
  end if;
  return query
  select
    f.id, f.title, f.org, f.contact_name, f.contact_email, f.contact_phone,
    f.status, f.grid_size, f.price_per_sq, f.payment_method,
    f.launched_at, f.created_at, f.owner_id,
    coalesce(s.sold_count, 0)::bigint,
    f.emoji, f.draw_type, f.draw_date, f.winner_square_nums,
    f.description, f.image_url, f.slug
  from public.fundraisers f
  left join public.fundraiser_stats s on s.fundraiser_id = f.id
  order by f.created_at desc;
end;
$$;

-- ── get_org_campaigns ─────────────────────────────────────────────────────────

drop function if exists public.get_org_campaigns();
create or replace function public.get_org_campaigns()
returns table (
  id             uuid,
  title          text,
  org            text,
  status         text,
  grid_size      integer,
  price_per_sq   numeric,
  sold_count     bigint,
  launched_at    timestamptz,
  draw_date      date,
  owner_id       uuid,
  owner_name     text,
  payment_method text,
  emoji          text,
  slug           text
)
language plpgsql security definer set search_path = public as $$
declare
  v_org_user_id uuid;
begin
  v_org_user_id := get_my_org_user_id();
  if v_org_user_id is null then
    raise exception 'Not an org member';
  end if;

  return query
  select
    f.id,
    f.title,
    f.org,
    f.status,
    f.grid_size,
    f.price_per_sq,
    count(s.id) filter (where s.paid = true) as sold_count,
    f.launched_at,
    f.draw_date,
    f.owner_id,
    p.full_name as owner_name,
    f.payment_method,
    f.emoji,
    f.slug
  from public.fundraisers f
  join public.org_members om on om.org_id = f.org_id
  left join public.squares s on s.fundraiser_id = f.id
  left join public.profiles p on p.id = f.owner_id
  where om.user_id = v_org_user_id
  group by f.id, p.full_name
  order by f.created_at desc;
end;
$$;
