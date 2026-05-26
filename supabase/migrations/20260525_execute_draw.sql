-- Add winner_square_nums column (int[]) to store multiple winner square numbers.
-- winner_square_num (singular) is kept for backward compatibility.
ALTER TABLE fundraisers ADD COLUMN IF NOT EXISTS winner_square_nums int[];

-- ── execute_draw ────────────────────────────────────────────────────────────
-- Replaces the client-side Math.random() winner selection in LiveGrid.js with
-- server-side PostgreSQL random().
--
-- This function:
--   1. Verifies the calling user owns the campaign (or is an org contributor).
--      Service-role callers (auto-draw edge function) skip this check.
--   2. Selects p_num_winners distinct random squares from the sold pool.
--   3. Marks the fundraiser as 'drawn' and persists the winner square numbers.
--   4. Runs the Foundation Member check (first 100 organisers to complete a draw).
--   5. Returns full winner details for the UI.
--
-- Idempotency: if the fundraiser is already 'drawn' the initial query finds no
-- active row and raises 'Campaign not found or not active' — preventing a
-- second draw from overwriting the first result.
--
-- Called from:
--   - LiveGrid.js (user-initiated draws, anon key + user JWT)
--   - supabase/functions/auto-draw (scheduled, service-role key, no user JWT)

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
begin
  -- Fetch owner from an *active* campaign only.
  -- If already drawn (or draft/cancelled) this returns NULL and we abort.
  select owner_id into v_owner_id
  from fundraisers
  where id = p_fundraiser_id
    and status = 'active';

  if v_owner_id is null then
    raise exception 'Campaign not found or not active';
  end if;

  -- Ownership check.
  -- auth.uid() is NULL when called with the service-role key (auto-draw edge
  -- function), which bypasses user-level RLS. In that case we trust the caller
  -- and skip the check. For user-initiated draws, enforce owner or contributor.
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

  -- Select p_num_winners distinct random sold squares in a single pass.
  -- Subquery randomises then LIMIT picks; array_agg preserves that order.
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

  -- Persist result and flip status in one statement.
  update fundraisers
  set status             = 'drawn',
      winner_square_nums = v_winner_nums,
      winner_square_num  = v_winner_nums[1]  -- keep singular column for backward compat
  where id = p_fundraiser_id;

  -- Foundation Member check: first 100 organisers to complete any draw.
  select count(*) into v_founding_count
  from profiles
  where is_founding_member = true;

  if v_founding_count < 100 then
    update profiles
    set is_founding_member = true
    where id = v_owner_id
      and is_founding_member = false;  -- idempotent
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

-- Grant execute to authenticated users (manual draws from LiveGrid)
-- and service_role (auto-draw edge function).
grant execute on function public.execute_draw(uuid, int) to authenticated;
grant execute on function public.execute_draw(uuid, int) to service_role;
