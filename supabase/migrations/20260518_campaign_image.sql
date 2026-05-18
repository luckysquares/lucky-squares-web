-- ── Campaign image upload ─────────────────────────────────────────────────────

alter table public.fundraisers
  add column if not exists image_url text;

-- ── Storage bucket ─────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'fundraiser-images',
  'fundraiser-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Public read
create policy "Public can view fundraiser images"
  on storage.objects for select
  using (bucket_id = 'fundraiser-images');

-- Authenticated users can upload into their own folder (path starts with their user id)
create policy "Users can upload fundraiser images"
  on storage.objects for insert
  with check (
    bucket_id = 'fundraiser-images'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can update their own fundraiser images"
  on storage.objects for update
  using (
    bucket_id = 'fundraiser-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete their own fundraiser images"
  on storage.objects for delete
  using (
    bucket_id = 'fundraiser-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
