-- Remove RESTRICTIVE policies added in 20260529_server_side_validation.sql.
-- These duplicated enforcement already provided by existing BEFORE INSERT triggers:
--   trg_enforce_campaign_limit   — enforces per-plan active campaign limits
--   trigger_check_suspended_launch — blocks suspended users from creating campaigns
-- The duplicate policies were causing 500 errors on fundraiser INSERT.

DROP POLICY IF EXISTS "Enforce trial plan campaign limit" ON public.fundraisers;
DROP POLICY IF EXISTS "Suspended users cannot create fundraisers" ON public.fundraisers;
