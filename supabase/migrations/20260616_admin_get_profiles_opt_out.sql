-- Add email_opted_out to admin_get_profiles via left join on email_opt_outs.
create or replace function public.admin_get_profiles()
returns table (
  id                 uuid,
  email              text,
  full_name          text,
  plan               text,
  is_admin           boolean,
  is_founding_member boolean,
  is_beta_tester     boolean,
  suspended          boolean,
  suspension_reason  text,
  suspended_at       timestamptz,
  created_at         timestamptz,
  email_opted_out    boolean
) language sql security definer set search_path = public as $$
  select
    p.id,
    u.email,
    p.full_name,
    p.plan,
    p.is_admin,
    p.is_founding_member,
    p.is_beta_tester,
    p.suspended,
    p.suspension_reason,
    p.suspended_at,
    p.created_at,
    coalesce(o.opted_out, false) as email_opted_out
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.email_opt_outs o on o.email = u.email
  order by p.created_at desc;
$$;
