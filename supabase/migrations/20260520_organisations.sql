-- Organisations table: stores details for org-type fundraiser runners
create table if not exists organisations (
  id         uuid default gen_random_uuid() primary key,
  owner_id   uuid references profiles(id) on delete cascade not null,
  name       text not null,
  abn        text,
  org_type   text check (org_type in ('sporting_club', 'school', 'charity', 'community_group', 'business', 'other')),
  address    text,
  suburb     text,
  state      text default 'SA',
  postcode   text,
  website    text,
  created_at timestamptz default now()
);

alter table organisations enable row level security;

create policy "Owner can manage own org"
  on organisations for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

-- Link fundraisers to an org (optional)
alter table fundraisers add column if not exists org_id uuid references organisations(id) on delete set null;
alter table fundraisers add column if not exists fundraiser_type text check (fundraiser_type in ('individual', 'org')) default 'individual';

-- RPC: upsert org for current user
create or replace function upsert_my_org(
  p_name       text,
  p_abn        text default null,
  p_org_type   text default null,
  p_address    text default null,
  p_suburb     text default null,
  p_state      text default 'SA',
  p_postcode   text default null,
  p_website    text default null
) returns uuid language plpgsql security definer as $$
declare
  v_id uuid;
begin
  select id into v_id from organisations where owner_id = auth.uid() limit 1;
  if v_id is null then
    insert into organisations (owner_id, name, abn, org_type, address, suburb, state, postcode, website)
    values (auth.uid(), p_name, p_abn, p_org_type, p_address, p_suburb, p_state, p_postcode, p_website)
    returning id into v_id;
  else
    update organisations set
      name = p_name, abn = p_abn, org_type = p_org_type,
      address = p_address, suburb = p_suburb, state = p_state,
      postcode = p_postcode, website = p_website
    where id = v_id;
  end if;
  return v_id;
end;
$$;

-- RPC: get current user's org
create or replace function get_my_org()
returns table (id uuid, name text, abn text, org_type text, address text, suburb text, state text, postcode text, website text)
language sql security definer as $$
  select id, name, abn, org_type, address, suburb, state, postcode, website
  from organisations where owner_id = auth.uid() limit 1;
$$;
