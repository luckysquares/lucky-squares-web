-- Fix get_my_org_user_id to recognise approved org owners on the casual plan.
-- Previously only checked plan = 'org', but org approval now sets plan = 'casual'
-- and the annual membership upgrade sets it to 'org'. Without this fix, approved
-- orgs on the casual plan got null from this function, causing get_org_stats to
-- raise 'Not an org member' and the org dashboard to hang silently on loading.

CREATE OR REPLACE FUNCTION public.get_my_org_user_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_id uuid;
BEGIN
  -- Org owner: on the annual plan
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND plan = 'org') THEN
    RETURN auth.uid();
  END IF;
  -- Org owner: approved application but not yet on annual plan (casual plan)
  IF EXISTS (SELECT 1 FROM public.org_applications WHERE user_id = auth.uid() AND status = 'approved') THEN
    RETURN auth.uid();
  END IF;
  -- Org member (contributor added by an org admin)
  SELECT org_user_id INTO v_id
  FROM   public.org_members
  WHERE  member_user_id = auth.uid()
  LIMIT  1;
  RETURN v_id;
END;
$function$;
