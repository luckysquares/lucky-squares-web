-- ─────────────────────────────────────────────────────────────────────────────
-- Server-side business rule enforcement (2026-05-29)
-- 1. fundraisers: trial plan users cannot exceed 3 campaigns
-- 2. prizes: total prize value cannot exceed state legal caps
-- ─────────────────────────────────────────────────────────────────────────────


-- ── 1. Trial plan campaign limit ─────────────────────────────────────────────
-- The client enforces a cap of 3 campaigns for trial-plan users, but nothing
-- at the database level prevents a direct API call from bypassing this.
-- A RESTRICTIVE policy ANDs with all permissive policies, so it can only
-- tighten access — it cannot grant anything new.
--
-- Logic:
--   - If the user is NOT on the trial plan → allow (no limit for other plans)
--   - If the user IS on trial → allow only if they have fewer than 3 campaigns
--   - IS DISTINCT FROM handles null plan values (treated as non-trial → allowed)

CREATE POLICY "Enforce trial plan campaign limit"
  ON public.fundraisers
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (
    (SELECT p.plan FROM public.profiles p WHERE p.id = auth.uid())
      IS DISTINCT FROM 'trial'
    OR
    (SELECT COUNT(*) FROM public.fundraisers f WHERE f.owner_id = auth.uid()) < 3
  );


-- ── 2. State prize cap enforcement ───────────────────────────────────────────
-- Australian state lottery laws impose different prize value caps. The wizard
-- validates these client-side, but nothing prevents a direct API call from
-- inserting prizes that exceed the cap.
--
-- This trigger fires AFTER each prize row is inserted or updated, sums all
-- non-donated prize values for the fundraiser (including the current row),
-- and raises an exception if the total exceeds the state cap.
--
-- Prize value is stored as free text (e.g. "$500 cash", "Restaurant voucher").
-- Values are parsed the same way as the client: strip non-numeric characters,
-- cast to numeric, default to 0 for unparseable strings (donated/in-kind).
--
-- State caps (matching client STATE_PRIZE_CAPS):
--   QLD: $2,000  |  ACT/NT/SA/TAS/VIC: $5,000  |  WA: $10,000  |  NSW: $25,000
--
-- The check is skipped for service-role / admin operations (auth.uid() is null).

CREATE OR REPLACE FUNCTION public.check_state_prize_cap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_state text;
  v_cap   numeric;
  v_total numeric;
BEGIN
  -- Skip for service-role and internal operations (no user session)
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Fetch the fundraiser's state
  SELECT f.state INTO v_state
  FROM public.fundraisers f
  WHERE f.id = NEW.fundraiser_id;

  -- Map state to legal cap (default 5000 for any unrecognised/null state)
  v_cap := CASE v_state
    WHEN 'NSW' THEN 25000
    WHEN 'WA'  THEN 10000
    WHEN 'QLD' THEN 2000
    ELSE 5000
  END;

  -- Sum all non-donated prize values for this fundraiser.
  -- For AFTER INSERT/UPDATE the current row is already in the table,
  -- so this total correctly includes the row that just changed.
  -- Parse prize value the same way the client does:
  --   strip everything except digits and '.', cast to numeric, default 0.
  SELECT COALESCE(SUM(
    CASE WHEN p.donated THEN 0
         ELSE COALESCE(
           CAST(
             NULLIF(regexp_replace(COALESCE(p.value, ''), '[^0-9.]', '', 'g'), '')
           AS numeric),
           0
         )
    END
  ), 0)
  INTO v_total
  FROM public.prizes p
  WHERE p.fundraiser_id = NEW.fundraiser_id;

  IF v_total > v_cap THEN
    RAISE EXCEPTION
      'Total prize value ($%) exceeds the % state cap of $%. Reduce prizes or obtain a lottery licence.',
      round(v_total)::text,
      COALESCE(v_state, 'default'),
      v_cap::text;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_state_prize_cap
  AFTER INSERT OR UPDATE ON public.prizes
  FOR EACH ROW EXECUTE FUNCTION public.check_state_prize_cap();
