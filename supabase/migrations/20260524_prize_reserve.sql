-- ── Prize reserve: split-at-purchase payment model ───────────────────────────
--
-- When a square is purchased, funds are split immediately:
--   · Up to prize_reserve_cents stays on the Lucky Squares platform (prize hold)
--   · Everything above the reserve threshold is transferred to the organiser now
--
-- After the draw:
--   · Lucky Squares pays cash-prize winners from the held reserve
--   · Any remainder (donated prizes, unsold squares below threshold) is
--     transferred to the organiser
--
-- prize_reserve_cents      — locked at launch; sum of non-donated cash prizes
-- prize_reserve_held_cents — running total of funds currently held on platform

alter table public.fundraisers
  add column if not exists prize_reserve_cents      int not null default 0,
  add column if not exists prize_reserve_held_cents int not null default 0;

-- ── Prize lock: prevent edits after launch ───────────────────────────────────
-- Prizes are locked once a campaign goes active. The reserve is calculated at
-- launch and must not change while funds are being collected against it.

create or replace function public.prevent_prize_edit_after_launch()
returns trigger language plpgsql as $$
declare
  v_status text;
begin
  select status into v_status
  from public.fundraisers
  where id = coalesce(new.fundraiser_id, old.fundraiser_id);

  if v_status in ('active', 'drawn', 'cancelled') then
    raise exception 'Prizes cannot be modified after a campaign has launched.';
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_prevent_prize_edit_after_launch on public.prizes;
create trigger trg_prevent_prize_edit_after_launch
  before insert or update or delete on public.prizes
  for each row execute function public.prevent_prize_edit_after_launch();

-- ── Atomic prize reserve claim ───────────────────────────────────────────────
-- Called once per successful square purchase in the Stripe webhook.
-- Locks the fundraiser row, works out how much of this payment needs to stay
-- on the platform for prizes, increments prize_reserve_held_cents, and returns:
--
--   hold_cents     — keep on platform (prize reserve top-up)
--   transfer_cents — send to organiser's connected account right now

create or replace function public.claim_prize_reserve(
  p_fundraiser_id  uuid,
  p_subtotal_cents int    -- gross square revenue for this purchase (buyer tx fee is on top of this)
)
returns table(hold_cents int, transfer_cents int)
language plpgsql security definer set search_path = public
as $$
declare
  v_reserve  int;
  v_held     int;
  v_hold     int;
begin
  -- SELECT FOR UPDATE: prevents two concurrent webhook calls from racing on
  -- the same fundraiser row and double-counting the prize reserve.
  select prize_reserve_cents, prize_reserve_held_cents
  into   v_reserve, v_held
  from   fundraisers
  where  id = p_fundraiser_id
  for update;

  -- How much of this payment is still needed to fill the prize reserve?
  v_hold := greatest(0, least(p_subtotal_cents, v_reserve - v_held));

  -- Atomically record the claim
  update fundraisers
  set    prize_reserve_held_cents = v_held + v_hold
  where  id = p_fundraiser_id;

  return query select v_hold, p_subtotal_cents - v_hold;
end;
$$;

revoke execute on function public.claim_prize_reserve(uuid, int) from public, anon, authenticated;
grant  execute on function public.claim_prize_reserve(uuid, int) to service_role;
