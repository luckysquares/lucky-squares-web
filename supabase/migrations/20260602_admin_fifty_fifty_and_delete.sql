-- Admin RPC to list all 50/50 campaigns with sold count
CREATE OR REPLACE FUNCTION public.admin_get_fifty_fifty_campaigns()
RETURNS TABLE(id uuid, title text, owner_id uuid, status text, ticket_price numeric, max_tickets integer, sold_count bigint, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  RETURN QUERY
  SELECT
    c.id, c.title, c.owner_id, c.status, c.ticket_price, c.max_tickets,
    COALESCE(COUNT(t.id), 0)::bigint AS sold_count,
    c.created_at
  FROM public.fifty_fifty_campaigns c
  LEFT JOIN public.fifty_fifty_tickets t ON t.campaign_id = c.id
  GROUP BY c.id
  ORDER BY c.created_at DESC;
END;
$$;
