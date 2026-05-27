-- Add state column to fifty_fifty_campaigns for licensing threshold display
alter table public.fifty_fifty_campaigns
  add column if not exists state text; -- AU state/territory code e.g. 'SA', 'VIC', 'NSW'
