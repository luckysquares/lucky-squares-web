-- Post-draw survey responses
-- Two randomly selected questions are presented to the organiser after their draw completes.
-- Both the question key and the answer are stored so the admin view can display them
-- alongside the question text (resolved in the client from surveyQuestions.js).

create table if not exists public.survey_responses (
  id            uuid        primary key default gen_random_uuid(),
  fundraiser_id uuid        references public.fundraisers(id) on delete set null,
  owner_id      uuid        references auth.users(id)         on delete set null,
  created_at    timestamptz not null default now(),
  q1_key        text        not null,
  q1_answer     text        not null,
  q2_key        text        not null,
  q2_answer     text        not null
);

alter table public.survey_responses enable row level security;

-- Authenticated organisers can insert their own response only
create policy "owner can insert survey response"
  on public.survey_responses for insert
  to authenticated
  with check (owner_id = auth.uid());

-- No select policy for regular users — admin reads via service_role API route
