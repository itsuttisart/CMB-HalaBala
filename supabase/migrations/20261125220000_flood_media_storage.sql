insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'flood-report-media',
  'flood-report-media',
  true,
  52428800,
  array[
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'image/heic',
    'image/heif',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-msvideo'
  ]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_unlinked_flood_media(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1
    from public.flood_reports report
    where report.image_url = object_name
       or report.video_url = object_name
  );
$$;

revoke all on function public.is_unlinked_flood_media(text) from public;
grant execute on function public.is_unlinked_flood_media(text) to anon, authenticated;

drop policy if exists "Public can upload flood report media" on storage.objects;
create policy "Public can upload flood report media"
on storage.objects for insert to anon, authenticated
with check (
  bucket_id = 'flood-report-media'
  and (storage.foldername(name))[1] = 'reports'
);

drop policy if exists "Public can remove unlinked flood media" on storage.objects;
create policy "Public can remove unlinked flood media"
on storage.objects for delete to anon, authenticated
using (
  bucket_id = 'flood-report-media'
  and (storage.foldername(name))[1] = 'reports'
  and public.is_unlinked_flood_media(name)
);
