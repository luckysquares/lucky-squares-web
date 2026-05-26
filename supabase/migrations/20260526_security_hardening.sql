-- ── Fix 1: draw-notification idempotency ────────────────────────────────────
-- Tracks when draw notification emails were first sent so repeated calls
-- (e.g. from a malicious actor who knows the fundraiser_id) are no-ops.
ALTER TABLE fundraisers ADD COLUMN IF NOT EXISTS notifications_sent_at timestamptz;

-- ── Fix 2: validate p_num_winners inside execute_draw ────────────────────────
-- Replaces the existing function to add a server-side check that the requested
-- winner count never exceeds the number of prizes with descriptions in the DB.
-- Prevents a campaign owner from passing an inflated p_num_winners via DevTools.

create or replace function public.execute_draw(
  p_fundraiser_id uuid,
  p_num_winners   int default 1
)
returns table (
  square_num    int,
  buyer_name    text,
  buyer_email   text,
  buyer_phone   text
)
language plpgsql security definer set search_path = public
as $$
declare
  v_owner_id       uuid;
  v_caller_uid     uuid;
  v_winner_nums    int[];
  v_founding_count int;
  v_prize_count    int;
begin
  -- Fetch owner from an *active* campaign only.
  select owner_id into v_owner_id
  from fundraisers
  where id = p_fundraiser_id
    and status = 'active';

  if v_owner_id is null then
    raise exception 'Campaign not found or not active';
  end if;

  -- Ownership check (skipped for service-role / auto-draw caller).
  v_caller_uid := auth.uid();
  if v_caller_uid is not null then
    if v_caller_uid != v_owner_id and not exists (
      select 1 from org_members
      where org_user_id   = v_owner_id
        and member_user_id = v_caller_uid
    ) then
      raise exception 'not authorised';
    end if;
  end if;

  -- Server-side winner count validation.
  -- Count prizes that have a non-empty description (these are the active prizes).
  -- p_num_winners must not exceed this count (minimum 1 is still allowed).
  select count(*) into v_prize_count
  from prizes
  where fundraiser_id = p_fundraiser_id
    and description is not null
    and description != '';

  if p_num_winners > greatest(1, v_prize_count) then
    raise exception 'Winner count (%) exceeds prize count (%)', p_num_winners, v_prize_count;
  end if;

  -- Select p_num_winners distinct random sold squares.
  select array_agg(number order by rnd)
  into v_winner_nums
  from (
    select number, random() as rnd
    from squares
    where fundraiser_id = p_fundraiser_id
      and status = 'sold'
    order by 2
    limit p_num_winners
  ) sub;

  if v_winner_nums is null or array_length(v_winner_nums, 1) = 0 then
    raise exception 'No sold squares to draw from';
  end if;

  -- Persist result and flip status.
  update fundraisers
  set status             = 'drawn',
      winner_square_nums = v_winner_nums,
      winner_square_num  = v_winner_nums[1]
  where id = p_fundraiser_id;

  -- Foundation Member check: first 100 organisers to complete any draw.
  select count(*) into v_founding_count
  from profiles
  where is_founding_member = true;

  if v_founding_count < 100 then
    update profiles
    set is_founding_member = true
    where id = v_owner_id
      and is_founding_member = false;
  end if;

  -- Return winner rows in draw order.
  return query
  select s.number, s.buyer_name, s.buyer_email, s.buyer_phone
  from squares s
  where s.fundraiser_id = p_fundraiser_id
    and s.number = any(v_winner_nums)
  order by array_position(v_winner_nums, s.number);
end;
$$;

grant execute on function public.execute_draw(uuid, int) to authenticated;
grant execute on function public.execute_draw(uuid, int) to service_role;
