-- ─────────────────────────────────────────────────────────────────────────────
-- Org annual membership (2026-05-29)
-- Adds subscription tracking to profiles and updates get_org_stats to
-- include plan and membership expiry for the org dashboard.
-- ─────────────────────────────────────────────────────────────────────────────

-- New columns on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id   text,
  ADD COLUMN IF NOT EXISTS org_subscription_id  text,
  ADD COLUMN IF NOT EXISTS org_member_until     timestamptz;

-- Update get_org_stats to include plan + membership info so the org
-- dashboard can show membership status without an extra fetch.
CREATE OR REPLACE FUNCTION public.get_org_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_user_id    uuid;
  v_campaigns      integer;
  v_active         integer;
  v_drawn          integer;
  v_gross_cents    bigint;
  v_members        integer;
  v_org_name       text;
  v_plan           text;
  v_member_until   timestamptz;
BEGIN
  v_org_user_id := get_my_org_user_id();
  IF v_org_user_id IS NULL THEN
    RAISE EXCEPTION 'Not an org member';
  END IF;

  SELECT organisation, plan, org_member_until
  INTO   v_org_name, v_plan, v_member_until
  FROM   public.profiles
  WHERE  id = v_org_user_id;

  SELECT
    COUNT(*)                                   FILTER (WHERE f.status IN ('active','drawn')),
    COUNT(*)                                   FILTER (WHERE f.status = 'active'),
    COUNT(*)                                   FILTER (WHERE f.status = 'drawn'),
    COALESCE(SUM(
      CASE WHEN s.paid THEN ROUND(f.price_per_sq::numeric * 100) ELSE 0 END
    ), 0)
  INTO v_campaigns, v_active, v_drawn, v_gross_cents
  FROM public.fundraisers f
  LEFT JOIN public.squares s ON s.fundraiser_id = f.id
  WHERE
    f.owner_id = v_org_user_id
    OR f.owner_id IN (
      SELECT member_user_id FROM public.org_members WHERE org_user_id = v_org_user_id
    );

  SELECT COUNT(*) INTO v_members FROM public.org_members WHERE org_user_id = v_org_user_id;

  RETURN jsonb_build_object(
    'org_name',       v_org_name,
    'plan',           v_plan,
    'org_member_until', v_member_until,
    'campaigns',      v_campaigns,
    'active',         v_active,
    'drawn',          v_drawn,
    'gross_cents',    v_gross_cents,
    'members',        v_members
  );
END;
$$;
