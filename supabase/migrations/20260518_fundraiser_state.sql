alter table public.fundraisers
  add column if not exists state text not null default 'SA';
