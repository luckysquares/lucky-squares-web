-- Returns the org admin's own organisation details (name, abn, org_type)
-- so the campaign wizard can pre-fill step 1 for returning org-plan users.

CREATE OR REPLACE FUNCTION public.get_my_org_details()
RETURNS TABLE(name text, abn text, org_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT o.name, o.abn, o.org_type
  FROM public.organisations o
  WHERE o.owner_id = auth.uid()
  LIMIT 1;
END;
$$;
