-- Admin RPC to gift an org membership (sets plan + 12-month expiry).
create or replace function public.admin_gift_org_membership(
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_admin = true) then
    raise exception 'Unauthorized';
  end if;

  update public.profiles
  set
    plan             = 'org',
    org_member_until = now() + interval '12 months'
  where id = p_user_id;
end;
$$;

revoke execute on function public.admin_gift_org_membership(uuid) from public, anon, authenticated;
grant  execute on function public.admin_gift_org_membership(uuid) to authenticated;
