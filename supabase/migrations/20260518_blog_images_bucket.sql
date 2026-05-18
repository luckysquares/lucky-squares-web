-- Create storage bucket for blog cover images (public read)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'blog-images',
  'blog-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg','image/png','image/webp','image/gif']
)
on conflict (id) do nothing;

-- Allow anyone to read (public bucket covers this, but belt-and-suspenders)
create policy if not exists "blog_images_public_read"
  on storage.objects for select
  using (bucket_id = 'blog-images');

-- Allow service role (API) to insert
create policy if not exists "blog_images_service_insert"
  on storage.objects for insert
  with check (bucket_id = 'blog-images');

-- Allow service role to delete
create policy if not exists "blog_images_service_delete"
  on storage.objects for delete
  using (bucket_id = 'blog-images');
