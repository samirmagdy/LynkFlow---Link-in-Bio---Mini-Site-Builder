-- Private-by-policy upload location for creator background assets.
-- The bucket is public for published profile delivery, while writes remain owner-scoped.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-backgrounds',
  'profile-backgrounds',
  true,
  52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif', 'video/mp4', 'video/webm', 'video/quicktime']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "background assets are publicly readable" on storage.objects;
create policy "background assets are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-backgrounds');

drop policy if exists "users upload their own background assets" on storage.objects;
create policy "users upload their own background assets"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile-backgrounds'
    and (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "users update their own background assets" on storage.objects;
create policy "users update their own background assets"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'profile-backgrounds'
    and owner_id = (select auth.uid()::text)
  )
  with check (
    bucket_id = 'profile-backgrounds'
    and owner_id = (select auth.uid()::text)
  );

drop policy if exists "users delete their own background assets" on storage.objects;
create policy "users delete their own background assets"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile-backgrounds'
    and owner_id = (select auth.uid()::text)
  );
