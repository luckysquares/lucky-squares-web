-- ── Idempotency anchor for automatic Stripe payouts ──────────────────────────
--
-- stripe_transfer_id records the result of the draw-notification edge function's
-- stripe.transfers.create() call. It is used to prevent double-payouts:
--
--   NULL        => payout not yet attempted for this campaign
--   'PENDING'   => payout is currently in progress (claimed by an invocation)
--   'tr_...'    => payout completed; value is the Stripe Transfer ID
--   'FAILED'    => payout was attempted but Stripe returned an error
--
-- The edge function updates this column to 'PENDING' atomically (WHERE
-- stripe_transfer_id IS NULL) before calling Stripe. If two concurrent
-- invocations race, only one will succeed in claiming the PENDING slot.

alter table public.payout_queue
  add column if not exists stripe_transfer_id text;

-- Index for the idempotency lookup
create index if not exists idx_payout_queue_fundraiser_transfer
  on public.payout_queue (fundraiser_id, stripe_transfer_id);
