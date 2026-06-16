-- Link marketing_contacts to registered users and auto-log admin actions.

-- 1. Add user_id to marketing_contacts
alter table public.marketing_contacts
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create unique index if not exists marketing_contacts_user_id_idx
  on public.marketing_contacts(user_id) where user_id is not null;

-- 2. Update admin_get_profiles to include the contact id so the UI can link to the activity log
drop function if exists public.admin_get_profiles();
create function public.admin_get_profiles()
returns table (
  id                    uuid,
  email                 text,
  full_name             text,
  plan                  text,
  is_admin              boolean,
  is_founding_member    boolean,
  is_beta_tester        boolean,
  suspended             boolean,
  suspension_reason     text,
  suspended_at          timestamptz,
  created_at            timestamptz,
  email_opted_out       boolean,
  marketing_contact_id  uuid
) language sql security definer set search_path = public as $$
  select
    p.id,
    u.email,
    p.full_name,
    p.plan,
    p.is_admin,
    p.is_founding_member,
    p.is_beta_tester,
    p.suspended,
    p.suspension_reason,
    p.suspended_at,
    p.created_at,
    coalesce(o.opted_out, false)  as email_opted_out,
    mc.id                         as marketing_contact_id
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.email_opt_outs o on o.email = u.email
  left join public.marketing_contacts mc on mc.user_id = p.id
  order by p.created_at desc;
$$;

-- 3. Function to get or create a marketing contact for a registered user,
--    used by admin action routes to ensure a contact exists before logging.
create or replace function public.get_or_create_marketing_contact(
  p_user_id uuid,
  p_email   text,
  p_name    text default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_contact_id uuid;
begin
  -- Try to find existing contact by user_id
  select id into v_contact_id from public.marketing_contacts where user_id = p_user_id;
  if v_contact_id is not null then return v_contact_id; end if;

  -- Try to find by email and link
  select id into v_contact_id from public.marketing_contacts where email = p_email limit 1;
  if v_contact_id is not null then
    update public.marketing_contacts set user_id = p_user_id where id = v_contact_id;
    return v_contact_id;
  end if;

  -- Create new contact
  insert into public.marketing_contacts (user_id, name, email, status)
  values (p_user_id, coalesce(p_name, split_part(p_email, '@', 1)), p_email, 'Converted')
  returning id into v_contact_id;

  return v_contact_id;
end;
$$;

revoke execute on function public.get_or_create_marketing_contact(uuid, text, text) from public, anon, authenticated;
grant  execute on function public.get_or_create_marketing_contact(uuid, text, text) to service_role;

-- 4. Trigger to auto-create a marketing contact when a user signs up
create or replace function public.trg_create_marketing_contact()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_email text;
begin
  select email into v_email from auth.users where id = new.id;
  if v_email is null then return new; end if;

  -- Link or create contact (ignore errors — non-critical)
  begin
    perform public.get_or_create_marketing_contact(new.id, v_email, new.full_name);
  exception when others then
    -- silent
  end;

  return new;
end;
$$;

drop trigger if exists trg_create_marketing_contact on public.profiles;
create trigger trg_create_marketing_contact
  after insert on public.profiles
  for each row execute function public.trg_create_marketing_contact();
