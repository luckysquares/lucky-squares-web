-- ── Prize claims: winner bank detail collection ───────────────────────────────
--
-- When a draw is complete for a Stripe campaign, a prize_claim row is created
-- for each cash-prize winner. An email is sent to the winner with a unique
-- claim link. They submit their BSB and account number. The organiser receives
-- an email with the details and pays the winner directly from their bank account.
--
-- Bank details are purged 7 days after the winner submits them.

create table if not exists public.prize_claims (
  id                   uuid        primary key default gen_random_uuid(),
  fundraiser_id        uuid        not null references public.fundraisers(id),
  token                uuid        not null unique default gen_random_uuid(),
  winner_square_number int         not null,
  buyer_name           text        not null,
  buyer_email          text        not null,
  place                text        not null,
  prize_description    text        not null default '',
  campaign_title       text        not null default '',
  org_name             text        not null default '',
  contact_email        text        not null default '',
  status               text        not null default 'pending'
                                   check (status in ('pending', 'claimed', 'purged')),
  bank_account_name    text,
  bank_bsb             text,
  bank_account         text,
  claimed_at           timestamptz,
  purge_at             timestamptz,  -- claimed_at + 7 days; bank details nulled after this
  created_at           timestamptz not null default now()
);

-- No direct PostgREST access — all reads/writes via service_role API routes only.
alter table public.prize_claims enable row level security;
revoke all on public.prize_claims from public, anon, authenticated;
grant  all on public.prize_claims to service_role;

create index if not exists prize_claims_token_idx      on public.prize_claims (token);
create index if not exists prize_claims_fundraiser_idx on public.prize_claims (fundraiser_id);
create index if not exists prize_claims_purge_idx      on public.prize_claims (purge_at)
  where status = 'claimed';

-- ── Scheduled purge of bank details ─────────────────────────────────────────
-- Requires pg_cron (enabled under Database > Extensions in the Supabase dashboard).
-- Runs at 3am AEST daily. Silently skips if pg_cron is not available.

do $$
begin
  perform cron.schedule(
    'purge-prize-claim-bank-details',
    '0 17 * * *',  -- 17:00 UTC = 3:00 AEST (UTC+10)
    $cron$
      update public.prize_claims
      set    bank_account_name = null,
             bank_bsb          = null,
             bank_account      = null,
             status            = 'purged'
      where  status   = 'claimed'
        and  purge_at is not null
        and  purge_at < now();
    $cron$
  );
exception when others then
  raise notice '[prize_claims] pg_cron not available — bank detail purge must be run manually. Error: %', sqlerrm;
end;
$$;
