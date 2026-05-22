-- Fix cancel_expired_campaigns to return price_per_sq and contact_name
-- so the edge function can calculate refund amounts and personalise emails.

drop function if exists public.cancel_expired_campaigns();

create or replace function public.cancel_expired_campaigns()
returns table (
  id             uuid,
  title          text,
  contact_name   text,
  contact_email  text,
  payment_method text,
  price_per_sq   numeric,
  launched_at    timestamptz
) language plpgsql security definer as $$
begin
  return query
  update public.fundraisers f
  set status = 'cancelled'
  where f.status = 'active'
    and f.launched_at < now() - interval '30 days'
    and (
      -- below break-even: sold revenue < non-donated prize cost
      (
        select coalesce(sum(case when p.donated then 0 else
          coalesce(regexp_replace(p.value, '[^0-9.]', '', 'g')::numeric, 0)
        end), 0)
        from public.prizes p
        where p.fundraiser_id = f.id
      ) > (
        select coalesce(s.sold_count, 0) * f.price_per_sq
        from public.fundraiser_stats s
        where s.fundraiser_id = f.id
      )
    )
  returning f.id, f.title, f.contact_name, f.contact_email, f.payment_method, f.price_per_sq, f.launched_at;
end;
$$;
