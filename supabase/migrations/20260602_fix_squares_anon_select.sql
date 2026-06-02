-- Restore table-level SELECT on squares for the anon role.
--
-- The column-level grant approach (migration 20260529_security_hardening.sql)
-- broke PostgREST: revoking table-level SELECT prevents PostgREST from
-- enumerating columns for select=*, causing the LiveGrid to receive empty
-- rows and rendering all squares as available regardless of their actual status.
--
-- PII protection is now enforced at the application layer instead:
-- LiveGrid.js explicitly requests only non-PII columns
-- (number, status, reserved_until, is_sponsored, buyer_name, paid).
-- Buyer email, phone, and payment_intent_id are never fetched in public queries.
-- Authenticated owner queries are separately protected by RLS owner_id checks.

GRANT SELECT ON public.squares TO anon;
