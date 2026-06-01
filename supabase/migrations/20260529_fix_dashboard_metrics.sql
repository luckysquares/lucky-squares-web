-- Fix admin_dashboard_metrics:
-- 1. org_clients: was hardcoded to 0 — now counts profiles on annual 'org' plan
-- 2. new_org_approvals: new field — org applications approved in the last 30 days
-- 3. new_org_applications: already fixed to only count pending (status not in approved/rejected)

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE v json;
BEGIN
  SELECT json_build_object(
    'casual_clients',   (SELECT count(*) FROM public.profiles WHERE (is_admin IS NULL OR is_admin = false) AND (plan IS NULL OR plan NOT IN ('org'))),
    'org_clients',      (SELECT count(*) FROM public.profiles WHERE plan = 'org'),
    'new_org_approvals',(SELECT count(*) FROM public.org_applications WHERE status = 'approved' AND created_at > now() - interval '30 days'),
    'live_campaigns',   (SELECT count(*) FROM public.fundraisers WHERE status = 'active'),
    'drawn_campaigns',  (SELECT count(*) FROM public.fundraisers WHERE status = 'drawn'),
    'draft_campaigns',  (SELECT count(*) FROM public.fundraisers WHERE status = 'draft'),
    'total_fees',       (SELECT count(*) * 19 FROM public.fundraisers WHERE status IN ('active','drawn')),
    'total_raised',     (
      SELECT coalesce(sum(s.sold_count * f.price_per_sq), 0)
      FROM public.fundraisers f
      JOIN public.fundraiser_stats s ON s.fundraiser_id = f.id
      WHERE f.status = 'drawn'
    ),
    'total_prizes',     (
      SELECT coalesce(sum(
        CASE WHEN p.donated THEN 0
          ELSE coalesce(regexp_replace(p.value, '[^0-9.]', '', 'g')::numeric, 0)
        END
      ), 0)
      FROM public.prizes p
      JOIN public.fundraisers f ON f.id = p.fundraiser_id
      WHERE f.status = 'drawn'
    ),
    'new_org_applications', (
      SELECT count(*) FROM public.org_applications
      WHERE created_at > now() - interval '30 days'
        AND status NOT IN ('approved', 'rejected')
    ),
    'campaigns_expiring_soon', (
      SELECT count(*) FROM public.fundraisers
      WHERE status = 'active'
        AND launched_at IS NOT NULL
        AND launched_at < now() - interval '21 days'
    )
  ) INTO v;
  RETURN v;
END;
$function$;
