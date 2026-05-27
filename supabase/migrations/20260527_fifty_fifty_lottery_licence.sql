-- Add lottery_licence column to fifty_fifty_campaigns
-- Stores the organiser's licence number if required by their state's lottery laws.

alter table public.fifty_fifty_campaigns
  add column if not exists lottery_licence text;

-- Also add bank payment columns for bank-transfer 50/50 campaigns
alter table public.fifty_fifty_campaigns
  add column if not exists bank_account_name text;

alter table public.fifty_fifty_campaigns
  add column if not exists bank_bsb text;

alter table public.fifty_fifty_campaigns
  add column if not exists bank_account text;
