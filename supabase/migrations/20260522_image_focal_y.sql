-- Add vertical focal point for campaign images (0 = top, 50 = center, 100 = bottom)
alter table public.fundraisers
  add column if not exists image_focal_y smallint not null default 50;

-- Update admin_update_fundraiser to include image_url and image_focal_y
create or replace function public.admin_update_fundraiser(
  p_id            uuid,
  p_title         text,
  p_org           text,
  p_contact_name  text,
  p_contact_email text,
  p_contact_phone text,
  p_description   text,
  p_image_url     text    default null,
  p_image_focal_y smallint default 50
) returns void language plpgsql security definer as $$
begin
  update public.fundraisers set
    title         = p_title,
    org           = p_org,
    contact_name  = p_contact_name,
    contact_email = p_contact_email,
    contact_phone = p_contact_phone,
    description   = p_description,
    image_url     = p_image_url,
    image_focal_y = p_image_focal_y
  where id = p_id;
end;
$$;
