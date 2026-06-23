-- Lets admin link a Mariposa chat session to a known marketing contact.
-- Kept as a separate metadata table (not a column on mariposa_chats) so the
-- attribution survives independently of the 90-day chat purge job.

create table if not exists public.mariposa_chat_attributions (
  session_id    uuid primary key,
  contact_id    uuid not null references public.marketing_contacts(id) on delete cascade,
  attributed_by uuid references auth.users(id) on delete set null,
  attributed_at timestamptz not null default now(),
  notes         text
);

create index if not exists idx_mariposa_chat_attributions_contact
  on public.mariposa_chat_attributions (contact_id);

alter table public.mariposa_chat_attributions enable row level security;

create policy "admin_mariposa_chat_attributions_all" on public.mariposa_chat_attributions
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_admin = true
    )
  );
