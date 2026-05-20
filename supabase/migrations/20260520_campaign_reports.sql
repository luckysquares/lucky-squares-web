create table if not exists campaign_reports (
  id            uuid default gen_random_uuid() primary key,
  fundraiser_id uuid references fundraisers(id) on delete cascade not null,
  reason        text not null check (reason in ('inappropriate_content', 'suspicious_activity', 'misleading_information', 'spam', 'other')),
  details       text,
  reporter_ip   text,
  created_at    timestamptz default now()
);

alter table campaign_reports enable row level security;

create index if not exists campaign_reports_fundraiser_idx on campaign_reports(fundraiser_id);
create index if not exists campaign_reports_created_idx   on campaign_reports(created_at desc);
