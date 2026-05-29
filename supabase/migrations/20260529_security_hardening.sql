-- ─────────────────────────────────────────────────────────────────────────────
-- Security hardening (2026-05-29)
-- 1. execute_draw: block unauthenticated callers (null auth.uid() bypass)
-- 2. squares: revoke SELECT on PII columns from anon role
-- 3. fundraisers: prevent suspended users from creating new campaigns
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Fix execute_draw null-uid bypass ──────────────────────────────────────
-- Previously: `if v_caller_uid is not null then` skipped the ownership check
-- entirely when called with only the anon key (no user session).
-- Now: an explicit exception is raised if auth.uid() is null.

CREATE OR REPLACE FUNCTION public.execute_draw(
  p_fundraiser_id uuid,
  p_num_winners   integer DEFAULT 1
)
RETURNS TABLE(square_num integer, buyer_name text, buyer_email text, buyer_phone text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
declare
  v_owner_id       uuid;
  v_caller_uid     uuid;
  v_winner_nums    int[];
  v_founding_count int;
begin
  select owner_id into v_owner_id
  from fundraisers
  where id = p_fundraiser_id
    and status = 'active';

  if v_owner_id is null then
    raise exception 'Campaign not found or not active';
  end if;

  v_caller_uid := auth.uid();

  -- Require an authenticated user — null uid means the caller used only the
  -- anon key with no user session, which should never be able to run a draw.
  if v_caller_uid is null then
    raise exception 'not authenticated';
  end if;

  if v_caller_uid != v_owner_id and not exists (
    select 1 from org_members
    where org_user_id   = v_owner_id
      and member_user_id = v_caller_uid
  ) then
    raise exception 'not authorised';
  end if;

  select array_agg(number order by rnd)
  into v_winner_nums
  from (
    select number, random() as rnd
    from squares
    where fundraiser_id = p_fundraiser_id
      and status = 'sold'
    order by 2
    limit p_num_winners
  ) sub;

  if v_winner_nums is null or array_length(v_winner_nums, 1) = 0 then
    raise exception 'No sold squares to draw from';
  end if;

  update fundraisers
  set status             = 'drawn',
      winner_square_nums = v_winner_nums,
      winner_square_num  = v_winner_nums[1],
      drawn_at           = now()
  where id = p_fundraiser_id;

  select count(*) into v_founding_count
  from profiles
  where is_founding_member = true;

  if v_founding_count < 100 then
    update profiles
    set is_founding_member = true
    where id = v_owner_id
      and is_founding_member = false;
  end if;

  return query
  select s.number, s.buyer_name, s.buyer_email, s.buyer_phone
  from squares s
  where s.fundraiser_id = p_fundraiser_id
    and s.number = any(v_winner_nums)
  order by array_position(v_winner_nums, s.number);
end;
$$;


-- ── 2. Remove anon SELECT access to PII columns on squares ───────────────────
-- The public RLS policy allows any user to read rows for active/drawn
-- fundraisers, but RLS is row-level only — it cannot restrict columns.
-- Supabase grants are table-level by default, so we revoke the full table-level
-- SELECT from anon and re-grant only the columns needed for the public grid.
-- The authenticated role (campaign owners) retains full table-level SELECT,
-- filtered by the existing owner/org-member RLS policies.
-- Realtime payloads respect the same column grants, so PII is also excluded there.

REVOKE SELECT ON public.squares FROM anon;

GRANT SELECT (id, fundraiser_id, number, status, reserved_until, is_sponsored, created_at, updated_at)
  ON public.squares TO anon;


-- ── 3. Prevent suspended users from creating fundraisers ─────────────────────
-- Client-side UI shows a suspension banner, but nothing enforces this at the
-- database level. A RESTRICTIVE policy ANDs with existing permissive policies,
-- so it can only tighten access — it cannot grant anything new.
-- Logic: allow insert UNLESS the user has suspended = true in their profile.
-- New users with no profile row yet are unaffected (NOT EXISTS returns true).

CREATE POLICY "Suspended users cannot create fundraisers"
  ON public.fundraisers
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    NOT EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id        = auth.uid()
        AND suspended = true
    )
  );
