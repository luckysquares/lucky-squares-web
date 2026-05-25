-- ── Add missing plan column to profiles ──────────────────────────────────────
-- The plan column was referenced in RPCs and business logic but the
-- ALTER TABLE statement was never written, so it never existed in the DB.

alter table public.profiles
  add column if not exists plan text not null default 'trial'
    check (plan in ('trial', 'casual', 'org'));
