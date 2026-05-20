-- Buyer opt-in: notify me when this organiser launches their next campaign

create table if not exists campaign_notification_optins (
  id            uuid default gen_random_uuid() primary key,
  email         text not null,
  organiser_id  uuid references profiles(id) on delete cascade not null,
  fundraiser_id uuid references fundraisers(id) on delete set null,
  created_at    timestamptz default now(),
  constraint campaign_notification_optins_unique unique (email, organiser_id)
);

alter table campaign_notification_optins enable row level security;

-- No RLS reads needed from client — all access via security definer RPCs

-- Upsert an opt-in (safe to call multiple times for same email+organiser)
create or replace function opt_in_campaign_notifications(
  p_email        text,
  p_fundraiser_id uuid
) returns void language plpgsql security definer as $$
declare
  v_organiser_id uuid;
begin
  select owner_id into v_organiser_id
  from fundraisers where id = p_fundraiser_id;

  if v_organiser_id is null then return; end if;

  insert into campaign_notification_optins (email, organiser_id, fundraiser_id)
  values (lower(trim(p_email)), v_organiser_id, p_fundraiser_id)
  on conflict (email, organiser_id) do nothing;
end;
$$;

-- Get all opted-in emails for an organiser (called when they launch a new campaign)
create or replace function get_campaign_notification_followers(
  p_fundraiser_id uuid
) returns table (email text) language sql security definer as $$
  select cno.email
  from campaign_notification_optins cno
  join fundraisers f on f.id = p_fundraiser_id
  where cno.organiser_id = f.owner_id
    and cno.fundraiser_id != p_fundraiser_id  -- don't notify from the same campaign
  order by cno.created_at;
$$;
