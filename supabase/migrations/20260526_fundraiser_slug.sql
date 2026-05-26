-- Human-readable slug for campaign URLs.
-- Nullable so existing campaigns are unaffected; new campaigns always get one.
-- The application falls back to the UUID for any row without a slug.

alter table public.fundraisers
  add column if not exists slug text unique;

create index if not exists fundraisers_slug_idx on public.fundraisers (slug);
