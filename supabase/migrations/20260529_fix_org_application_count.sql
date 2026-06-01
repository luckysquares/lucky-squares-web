-- Fix admin_dashboard_metrics to only count pending org applications.
-- Previously counted all applications in the last 30 days regardless of
-- status, so approved and rejected applications inflated the count.

CREATE OR REPLACE FUNCTION public.admin_dashboard_metrics()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE v json;
BEGIN
  SELECT json_build_object(
    'casual_clients',   (SELECT count(*) FROM public.profiles WHERE (is_admin IS NULL OR is_admin = false)),
    'org_clients',      0,
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
