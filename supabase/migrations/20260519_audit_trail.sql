-- Add payment_intent_id and updated_at to squares
alter table public.squares
  add column if not exists payment_intent_id text,
  add column if not exists updated_at timestamptz default now();

-- Add updated_at to fundraisers
alter table public.fundraisers
  add column if not exists updated_at timestamptz default now();

-- Generic trigger function for updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger squares_updated_at
  before update on public.squares
  for each row execute function public.set_updated_at();

create trigger fundraisers_updated_at
  before update on public.fundraisers
  for each row execute function public.set_updated_at();
