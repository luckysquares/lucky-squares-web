-- DB-enforced campaign plan limits
-- Mirrors the client-side PLAN_LIMITS: { trial: 3, casual: 5, org: 10 }
-- Fires BEFORE INSERT (bank/inperson activation) and BEFORE UPDATE OF status
-- (Stripe webhook activation). Raises P0001 with a CAMPAIGN_LIMIT_REACHED
-- prefix so callers can detect and handle it specifically.

create or replace function public.enforce_campaign_limit()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_plan         text;
  v_active_count int;
  v_limit        int;
begin
  -- Only enforce when the row is transitioning TO active status
  if NEW.status != 'active' then return NEW; end if;
  -- Skip if already active (other field updates on a live campaign)
  if TG_OP = 'UPDATE' and OLD.status = 'active' then return NEW; end if;

  select plan into v_plan from public.profiles where id = NEW.owner_id;

  v_limit := case v_plan
    when 'org'    then 10
    when 'casual' then 5
    else               3   -- trial or unknown
  end;

  select count(*) into v_active_count
  from   public.fundraisers
  where  owner_id = NEW.owner_id
    and  status   = 'active'
    and  id      != NEW.id;

  if v_active_count >= v_limit then
    raise exception 'CAMPAIGN_LIMIT_REACHED: your % plan allows up to % active campaigns simultaneously.',
      coalesce(v_plan, 'trial'), v_limit
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

-- Drop first in case it already exists (idempotent)
drop trigger if exists trg_enforce_campaign_limit on public.fundraisers;

create trigger trg_enforce_campaign_limit
  before insert or update of status
  on public.fundraisers
  for each row execute function public.enforce_campaign_limit();
