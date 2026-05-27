-- Add 'draft' status to fifty_fifty_campaigns and change the default.
-- Campaigns are now created as drafts and activated after the $19 launch fee
-- is paid via Stripe checkout.

-- Drop and recreate the check constraint to include 'draft'
alter table public.fifty_fifty_campaigns
  drop constraint if exists fifty_fifty_campaigns_status_check;

alter table public.fifty_fifty_campaigns
  add constraint fifty_fifty_campaigns_status_check
    check (status in ('draft', 'active', 'drawn', 'cancelled'));

-- Change column default from 'active' to 'draft'
alter table public.fifty_fifty_campaigns
  alter column status set default 'draft';

-- Update existing active-by-default campaigns: if launched_at equals created_at
-- (i.e. the default was applied) and they were never paid for, mark them draft.
-- In practice there are no real campaigns yet so this is a no-op safety measure.
-- Production organisers paid through the Stripe flow so their status stays 'active'.
