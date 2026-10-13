-- 사진 버킷 2개 (architecture 4장, spec 6장)
-- 공개 읽기. 로그인한 사용자가 자기 폴더(<사용자 id>/파일명)에만 올린다.
-- 사진은 브라우저에서 1MB 이하 JPEG 등으로 줄여 올린다(HEIC는 변환 후).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('socialing-photos', 'socialing-photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('review-photos', 'review-photos', true, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "users upload photos into their own folder" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('socialing-photos', 'review-photos')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
