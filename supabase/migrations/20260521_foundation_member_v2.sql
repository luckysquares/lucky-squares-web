-- ── Foundation Member v2 ──────────────────────────────────────────────────────
-- Replaces the profile-creation trigger with a post-draw check inside record_draw.
-- A "completed campaign" = organiser successfully runs a draw (record_draw called).
-- First 100 distinct organisers to complete a campaign become Foundation Members.
--
-- Also:
--   - Adds is_beta_tester boolean to profiles
--   - Updates record_draw to accept p_winner_square_nums int[] (matching frontend)
--   - Adds get_founding_member_count() and show_first_campaign_free() RPCs
--   - Updates admin_get_profiles to include is_beta_tester

-- ── Beta Tester flag ──────────────────────────────────────────────────────────

alter table profiles add column if not exists is_beta_tester boolean not null default false;

-- ── Remove old profile-creation trigger ───────────────────────────────────────
-- The old trigger incorrectly assigned founding member status on signup,
-- not on campaign completion. Remove it.

drop trigger if exists assign_founding_member on profiles;
drop function if exists maybe_assign_founding_member();

-- ── Update record_draw to use array winners + Foundation Member check ─────────
-- This replaces the version in 20260518_org_members.sql.
-- p_winner_square_nums is what LiveGrid.js already sends.

create or replace function public.record_draw(
  p_fundraiser_id      uuid,
  p_winner_square_nums int[]
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_owner_id        uuid;
  v_founding_count  int;
begin
  select owner_id into v_owner_id
  from fundraisers
  where id = p_fundraiser_id;

  -- Auth check: must be owner or org contributor
  if v_owner_id != auth.uid() and not exists (
    select 1 from org_members
    where org_user_id = v_owner_id and member_user_id = auth.uid()
  ) then
    raise exception 'not authorised';
  end if;

  -- Mark fundraiser as drawn
  update fundraisers
    set status             = 'drawn',
        winner_square_nums = p_winner_square_nums,
        -- keep old singular column for backward compat
        winner_square_num  = p_winner_square_nums[1]
    where id = p_fundraiser_id;

  -- Foundation Member check: first 100 organisers to complete a draw
  select count(*) into v_founding_count
  from profiles
  where is_founding_member = true;

  if v_founding_count < 100 then
    update profiles
      set is_founding_member = true
      where id = v_owner_id
        and is_founding_member = false; -- idempotent
  end if;
end;
$$;

-- ── Founding Member count RPCs ────────────────────────────────────────────────

-- Returns the current number of Foundation Members (public, used for UI flags)
create or replace function public.get_founding_member_count()
returns int
language sql security definer set search_path = public as $$
  select count(*)::int from profiles where is_founding_member = true;
$$;

-- Returns true if the site should show "first campaign free" language.
-- Becomes false once 95 Foundation Members have been assigned.
create or replace function public.show_first_campaign_free()
returns boolean
language sql security definer set search_path = public as $$
  select (select count(*) from profiles where is_founding_member = true) < 95;
$$;

-- ── Free first campaign: check at launch time ─────────────────────────────────
-- Returns true if the calling user qualifies for a free first campaign:
-- they have never launched a live fundraiser before, AND there are < 100
-- Foundation Members already assigned.
create or replace function public.qualifies_for_free_first_campaign()
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_prior_live_count int;
  v_founding_count   int;
begin
  select count(*) into v_prior_live_count
  from fundraisers
  where owner_id = auth.uid()
    and status in ('active', 'closed', 'drawn');

  select count(*) into v_founding_count
  from profiles
  where is_founding_member = true;

  -- Qualifies if: no prior live campaigns AND fewer than 100 founding members
  return (v_prior_live_count = 0 and v_founding_count < 100);
end;
$$;

-- ── Admin: toggle beta tester ─────────────────────────────────────────────────

create or replace function public.admin_set_beta_tester(p_user_id uuid, p_value boolean)
returns void language sql security definer as $$
  update profiles set is_beta_tester = p_value where id = p_user_id;
$$;

-- ── Update admin_get_profiles to include is_beta_tester ───────────────────────

-- language sql avoids the plpgsql RETURNS TABLE variable-scoping bug
-- where output column names (id, email, etc.) become local variables that
-- conflict with identically-named table columns, causing "column reference
-- is ambiguous" errors at runtime even when fully qualified with a table alias.
create or replace function public.admin_get_profiles()
returns table (
  id                 uuid,
  email              text,
  full_name          text,
  plan               text,
  is_admin           boolean,
  is_founding_member boolean,
  is_beta_tester     boolean,
  suspended          boolean,
  suspension_reason  text,
  suspended_at       timestamptz,
  created_at         timestamptz
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
    p.created_at
  from public.profiles p
  join auth.users u on u.id = p.id
  order by p.created_at desc;
$$;
