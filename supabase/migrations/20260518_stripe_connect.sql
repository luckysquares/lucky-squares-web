-- ── Stripe Connect ────────────────────────────────────────────────────────────

alter table public.fundraisers
  add column if not exists stripe_onboarding_complete boolean not null default false;
