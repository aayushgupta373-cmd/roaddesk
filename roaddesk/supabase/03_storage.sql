-- RoadDesk, step 3 of 3: photo storage. Run after 02_security.sql.

-- Public bucket, 3 MB limit, images only. Files are named with random ids.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-images', 'report-images', true, 3145728,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- A signed-in user may upload only into a folder named after their own user id.
create policy "report images: upload to own folder"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'report-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
