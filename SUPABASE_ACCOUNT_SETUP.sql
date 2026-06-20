-- ModVault: личный кабинет (избранное + история скачиваний)
-- Запусти этот скрипт ОДИН РАЗ в Supabase: SQL Editor -> New query -> вставь -> Run.

-- ---------- Избранное ----------
create table if not exists mod_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  mod_id integer not null,
  saved_version text,                                 -- версия мода на момент добавления (для уведомлений)
  created_at timestamp with time zone default now(),
  primary key (user_id, mod_id)
);

alter table mod_favorites enable row level security;

drop policy if exists "Users read own favorites" on mod_favorites;
drop policy if exists "Users insert own favorites" on mod_favorites;
drop policy if exists "Users update own favorites" on mod_favorites;
drop policy if exists "Users delete own favorites" on mod_favorites;

create policy "Users read own favorites" on mod_favorites
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own favorites" on mod_favorites
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own favorites" on mod_favorites
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users delete own favorites" on mod_favorites
  for delete to authenticated using (auth.uid() = user_id);

-- ---------- История скачиваний ----------
create table if not exists mod_downloads (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  mod_id integer not null,
  created_at timestamp with time zone default now()
);

alter table mod_downloads enable row level security;

drop policy if exists "Users read own downloads" on mod_downloads;
drop policy if exists "Users insert own downloads" on mod_downloads;
drop policy if exists "Users delete own downloads" on mod_downloads;

create policy "Users read own downloads" on mod_downloads
  for select to authenticated using (auth.uid() = user_id);
create policy "Users insert own downloads" on mod_downloads
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own downloads" on mod_downloads
  for delete to authenticated using (auth.uid() = user_id);

create index if not exists mod_downloads_user_idx on mod_downloads (user_id, created_at desc);
