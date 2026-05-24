-- ── Secure square claiming: atomic reservation + status-guarded claim ────────
--
-- Two related security fixes applied in a single migration:
--
-- 1. reserve_squares_for_checkout (FIND-001)
--    A server-side atomic RPC that replaces the client-supplied availability
--    check in create-checkout. Called by the API before creating a Stripe
--    session. Atomically reserves all requested squares in a single UPDATE
--    statement, returning any squares that could not be reserved (i.e. already
--    sold). Squares that are currently reserved (non-expired) also have their
--    reservation extended, so the checkout window stays consistent.
--
-- 2. claim_squares updated (FIND-008)
--    Added AND status = 'reserved' to the WHERE clause. This means claim_squares
--    will only transition reserved squares to sold. If a square was already sold
--    (double-payment scenario), the UPDATE silently skips it and the webhook
--    can detect the miss via the returned count and issue an automatic refund.
--    The RPC now returns INTEGER (count of squares actually claimed) instead of VOID.

-- ── 1. reserve_squares_for_checkout ─────────────────────────────────────────

create or replace function public.reserve_squares_for_checkout(
  p_fundraiser_id  uuid,
  p_square_numbers int[]
)
returns int[]    -- returns array of square numbers that COULD NOT be reserved (already sold)
language plpgsql security definer set search_path = public
as $$
declare
  v_updated int;
  v_taken   int[];
begin
  -- Atomically reserve all requested squares that are not yet sold.
  -- Covers three states in one pass:
  --   available                          -> reserved (fresh reservation)
  --   reserved + expired                 -> reserved (re-reserve after expiry)
  --   reserved + not expired             -> reserved (extend the reservation window)
  -- The only state we refuse is 'sold'.
  update squares
  set    status        = 'reserved',
         reserved_until = now() + interval '7 minutes'
  where  fundraiser_id = p_fundraiser_id
    and  number        = any(p_square_numbers)
    and  status       != 'sold';

  get diagnostics v_updated = row_count;

  -- If we updated fewer rows than requested, some squares must be 'sold'.
  -- Return the sold square numbers so the caller can report them.
  if v_updated < array_length(p_square_numbers, 1) then
    select coalesce(array_agg(number), array[]::int[])
    into   v_taken
    from   squares
    where  fundraiser_id = p_fundraiser_id
      and  number        = any(p_square_numbers)
      and  status        = 'sold';

    return v_taken;
  end if;

  return array[]::int[];  -- empty = all squares successfully reserved
end;
$$;

-- Grant execute to the service role only (called from the API server, not clients)
revoke execute on function public.reserve_squares_for_checkout(uuid, int[]) from public, anon, authenticated;
grant  execute on function public.reserve_squares_for_checkout(uuid, int[]) to service_role;


-- ── 2. claim_squares (updated to return count + status guard) ────────────────

-- Drop first: return type changes from void → integer, which requires a DROP+CREATE.
drop function if exists public.claim_squares(uuid, int[], text, text, text);

create or replace function public.claim_squares(
  p_fundraiser_id  uuid,
  p_square_numbers int[],
  p_buyer_name     text,
  p_buyer_email    text,
  p_buyer_phone    text default null
)
returns integer    -- number of squares actually claimed (< requested = double-payment)
language plpgsql security definer set search_path = public
as $$
declare
  v_claimed int;
begin
  -- Only transition squares that are in 'reserved' status.
  -- If a square is already 'sold', this UPDATE silently skips it.
  -- The caller (webhook) checks the returned count; if v_claimed < array_length
  -- of p_square_numbers, it knows a double-payment occurred and issues a refund.
  update squares
  set    status        = 'sold',
         buyer_name    = p_buyer_name,
         buyer_email   = p_buyer_email,
         buyer_phone   = p_buyer_phone,
         reserved_until = null,
         paid          = false
  where  fundraiser_id = p_fundraiser_id
    and  number        = any(p_square_numbers)
    and  status        = 'reserved';   -- FIND-008: guard against double-claiming

  get diagnostics v_claimed = row_count;
  return v_claimed;
end;
$$;
