-- Add description and image_url to admin_get_fundraisers
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
  image_url       text
) language plpgsql security definer as $$
begin
  return query
  select
    f.id, f.title, f.org, f.contact_name, f.contact_email, f.contact_phone,
    f.status, f.grid_size, f.price_per_sq, f.payment_method,
    f.launched_at, f.created_at, f.owner_id,
    coalesce(s.sold_count, 0)::bigint,
    f.emoji, f.draw_type, f.draw_date, f.winner_square_nums,
    f.description, f.image_url
  from public.fundraisers f
  left join public.fundraiser_stats s on s.fundraiser_id = f.id
  order by f.created_at desc;
end;
$$;

-- Add image_url to admin_update_fundraiser
create or replace function public.admin_update_fundraiser(
  p_id            uuid,
  p_title         text,
  p_org           text,
  p_contact_name  text,
  p_contact_email text,
  p_contact_phone text,
  p_description   text,
  p_image_url     text default null
) returns void language plpgsql security definer as $$
begin
  update public.fundraisers set
    title         = p_title,
    org           = p_org,
    contact_name  = p_contact_name,
    contact_email = p_contact_email,
    contact_phone = p_contact_phone,
    description   = p_description,
    image_url     = coalesce(p_image_url, image_url)
  where id = p_id;
end;
$$;
