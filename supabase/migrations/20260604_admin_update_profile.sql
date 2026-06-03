-- Create admin_update_profile RPC — was missing, causing silent save failures
-- in the admin users edit modal when changing plan or name.

CREATE OR REPLACE FUNCTION public.admin_update_profile(
  p_id        uuid,
  p_full_name text,
  p_plan      text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  UPDATE public.profiles
  SET full_name = p_full_name, plan = p_plan
  WHERE id = p_id;
END;
$$;
