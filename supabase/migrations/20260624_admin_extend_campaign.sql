-- Lets admin push out a campaign's 30-day clock by extending launched_at.
-- The 30-day expiry check (cancel_expired_campaigns) only looks at launched_at,
-- so extending is just moving that anchor forward.

create or replace function public.admin_extend_campaign(
  p_id   uuid,
  p_days int
)
returns timestamptz
language plpgsql security definer set search_path = public
as $$
declare
  v_new_launched_at timestamptz;
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorised';
  end if;

  if p_days is null or p_days <= 0 or p_days > 90 then
    raise exception 'p_days must be between 1 and 90';
  end if;

  update public.fundraisers
  set    launched_at = coalesce(launched_at, created_at, now()) + (p_days || ' days')::interval
  where  id = p_id
    and  status = 'active'
  returning launched_at into v_new_launched_at;

  if v_new_launched_at is null then
    raise exception 'Campaign not found or not active';
  end if;

  return v_new_launched_at;
end;
$$;

revoke execute on function public.admin_extend_campaign(uuid, int) from public, anon, authenticated;
grant  execute on function public.admin_extend_campaign(uuid, int) to authenticated;
