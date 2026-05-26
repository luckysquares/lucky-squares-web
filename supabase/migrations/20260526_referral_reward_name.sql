-- Extend check_referral_reward to also return the referrer's display name
-- so the caller can personalise the reward email without a second query.
create or replace function public.check_referral_reward(p_user_id uuid)
returns table (referrer_email text, referrer_name text, coupon_code text)
language plpgsql security definer as $$
declare
  v_referral       record;
  v_campaign_count int;
  v_coupon         text;
  v_referrer_email text;
  v_referrer_name  text;
begin
  select r.* into v_referral
  from public.referrals r
  where r.referred_id = p_user_id
    and r.status = 'pending';

  if not found then return; end if;

  select count(*) into v_campaign_count
  from public.fundraisers
  where owner_id = p_user_id
    and status = 'active';

  if v_campaign_count != 1 then return; end if;

  v_coupon := 'REFER' || upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 6));

  insert into public.coupons (code, description, discount_type, discount_value, max_uses)
  values (v_coupon, 'Referral reward - free campaign', 'percent', 100, 1);

  select p.email, coalesce(p.full_name, '') into v_referrer_email, v_referrer_name
  from public.profiles p
  where p.id = v_referral.referrer_id;

  update public.referrals
  set status = 'rewarded', reward_code = v_coupon, rewarded_at = now()
  where id = v_referral.id;

  return query select v_referrer_email, v_referrer_name, v_coupon;
end;
$$;
