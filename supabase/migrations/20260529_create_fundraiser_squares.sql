-- Recreate create_fundraiser_squares which was missing from the Sydney migration.
-- This function creates the initial grid of available squares for a new fundraiser.
-- It is called by handleSaveDraft in FundraiseApp.js after inserting the fundraiser row.
-- Idempotent: skips if squares already exist for the fundraiser.

CREATE OR REPLACE FUNCTION public.create_fundraiser_squares(
  p_fundraiser_id uuid,
  p_grid_size     integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Skip if squares already exist for this fundraiser
  IF EXISTS (SELECT 1 FROM public.squares WHERE fundraiser_id = p_fundraiser_id LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.squares (fundraiser_id, number, status)
  SELECT p_fundraiser_id, n, 'available'
  FROM generate_series(1, p_grid_size) AS n;
END;
$$;
