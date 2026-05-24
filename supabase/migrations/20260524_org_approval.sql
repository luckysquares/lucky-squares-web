-- ── Org application approval/rejection ───────────────────────────────────────

-- Approve an org application: set status, upgrade profile plan
create or replace function public.admin_approve_org_application(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user_id     uuid;
  v_contact_name text;
  v_email        text;
  v_org_name     text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;

  select user_id, contact_name, email, org_name
  into   v_user_id, v_contact_name, v_email, v_org_name
  from   public.org_applications
  where  id = p_id;

  if not found then
    raise exception 'Application not found';
  end if;

  update public.org_applications set status = 'approved' where id = p_id;

  -- Upgrade the user's plan to 'org'
  if v_user_id is not null then
    update public.profiles set plan = 'org' where id = v_user_id;
  end if;

  return jsonb_build_object(
    'ok',           true,
    'contact_name', v_contact_name,
    'email',        v_email,
    'org_name',     v_org_name
  );
end;
$$;

revoke execute on function public.admin_approve_org_application(uuid) from public, anon, authenticated;
grant  execute on function public.admin_approve_org_application(uuid) to service_role;

-- Reject an org application
create or replace function public.admin_reject_org_application(p_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_contact_name text;
  v_email        text;
  v_org_name     text;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorised';
  end if;

  select contact_name, email, org_name
  into   v_contact_name, v_email, v_org_name
  from   public.org_applications
  where  id = p_id;

  if not found then
    raise exception 'Application not found';
  end if;

  update public.org_applications set status = 'rejected' where id = p_id;

  return jsonb_build_object(
    'ok',           true,
    'contact_name', v_contact_name,
    'email',        v_email,
    'org_name',     v_org_name
  );
end;
$$;

revoke execute on function public.admin_reject_org_application(uuid) from public, anon, authenticated;
grant  execute on function public.admin_reject_org_application(uuid) to service_role;

-- ── Org portal RPCs ────────────────────────────────────────────────────────────

-- Determine the org_user_id for the current user:
-- If they ARE the org owner, return auth.uid().
-- If they are a member, return the org owner's user id.
-- Returns null if not part of any org.
create or replace function public.get_my_org_user_id()
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  -- Check if current user is an org owner
  if exists (select 1 from public.profiles where id = auth.uid() and plan = 'org') then
    return auth.uid();
  end if;
  -- Check if current user is an org member
  select org_user_id into v_id
  from   public.org_members
  where  member_user_id = auth.uid()
  limit  1;
  return v_id;
end;
$$;

-- All campaigns for the org (owner + all contributors)
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
  emoji          text
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
    f.emoji
  from public.fundraisers f
  join public.profiles p on p.id = f.owner_id
  left join public.squares s on s.fundraiser_id = f.id
  where
    f.owner_id = v_org_user_id
    or f.owner_id in (
      select member_user_id from public.org_members where org_user_id = v_org_user_id
    )
  group by f.id, p.full_name
  order by f.created_at desc;
end;
$$;

-- Org-level stats for the dashboard
create or replace function public.get_org_stats()
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_org_user_id    uuid;
  v_campaigns      integer;
  v_active         integer;
  v_drawn          integer;
  v_gross_cents    bigint;
  v_members        integer;
  v_org_name       text;
begin
  v_org_user_id := get_my_org_user_id();
  if v_org_user_id is null then
    raise exception 'Not an org member';
  end if;

  select organisation into v_org_name from public.profiles where id = v_org_user_id;

  select
    count(*)                                   filter (where f.status in ('active','drawn')),
    count(*)                                   filter (where f.status = 'active'),
    count(*)                                   filter (where f.status = 'drawn'),
    coalesce(sum(
      case when s.paid then round(f.price_per_sq::numeric * 100) else 0 end
    ), 0)
  into v_campaigns, v_active, v_drawn, v_gross_cents
  from public.fundraisers f
  left join public.squares s on s.fundraiser_id = f.id
  where
    f.owner_id = v_org_user_id
    or f.owner_id in (
      select member_user_id from public.org_members where org_user_id = v_org_user_id
    );

  select count(*) into v_members from public.org_members where org_user_id = v_org_user_id;

  return jsonb_build_object(
    'org_name',    v_org_name,
    'campaigns',   v_campaigns,
    'active',      v_active,
    'drawn',       v_drawn,
    'gross_cents', v_gross_cents,
    'members',     v_members
  );
end;
$$;
