-- Avatar support for ModVault profiles.
-- 1) avatar_url column on profiles (the public URL of the uploaded image).
-- 2) a public storage bucket "avatars" to hold the image files.
-- 3) storage RLS so anyone can view avatars, but a user can only write
--    inside a folder named after their own user id (e.g. "<uid>/avatar.webp").
-- Safe to re-run: everything is "if not exists" / "on conflict" / "drop ... if exists".

alter table profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Users upload own avatar" on storage.objects;
drop policy if exists "Users update own avatar" on storage.objects;
drop policy if exists "Users delete own avatar" on storage.objects;

create policy "Public read avatars"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'avatars');

create policy "Users upload own avatar"
on storage.objects for insert
to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own avatar"
on storage.objects for update
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own avatar"
on storage.objects for delete
to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
