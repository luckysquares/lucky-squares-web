-- Admin RPC for reading survey responses.
-- Matches the pattern used by admin_get_profiles, admin_dashboard_metrics, etc.
-- Checks is_admin on the calling user, joins to fundraisers and profiles.

create or replace function public.admin_get_survey_responses()
returns table(
  id               uuid,
  created_at       timestamptz,
  fundraiser_id    uuid,
  fundraiser_title text,
  fundraiser_org   text,
  owner_id         uuid,
  owner_name       text,
  q1_key           text,
  q1_answer        text,
  q2_key           text,
  q2_answer        text
)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.profiles where id = auth.uid() and is_admin = true
  ) then
    raise exception 'Unauthorized';
  end if;

  return query
  select
    sr.id,
    sr.created_at,
    sr.fundraiser_id,
    f.title,
    f.org,
    sr.owner_id,
    p.full_name,
    sr.q1_key,
    sr.q1_answer,
    sr.q2_key,
    sr.q2_answer
  from   public.survey_responses sr
  left join public.fundraisers f on f.id = sr.fundraiser_id
  left join public.profiles    p on p.id = sr.owner_id
  order by sr.created_at desc
  limit 500;
end;
$$;

revoke execute on function public.admin_get_survey_responses() from public, anon;
grant  execute on function public.admin_get_survey_responses() to authenticated;
