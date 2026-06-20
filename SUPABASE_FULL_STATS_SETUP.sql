create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table profiles enable row level security;

drop policy if exists "Anyone can read profile count" on profiles;
drop policy if exists "Users can insert own profile" on profiles;
drop policy if exists "Users can update own profile" on profiles;

create policy "Anyone can read profile count"
on profiles for select
to anon, authenticated
using (true);

create policy "Users can insert own profile"
on profiles for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

create table if not exists mod_stats (
  mod_id integer primary key,
  views integer not null default 0,
  downloads integer not null default 0
);

alter table mod_stats enable row level security;

drop policy if exists "Anyone can read mod stats" on mod_stats;

create policy "Anyone can read mod stats"
on mod_stats for select
to anon, authenticated
using (true);

create table if not exists mod_ratings (
  mod_id integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  created_at timestamp with time zone default now(),
  primary key (mod_id, user_id)
);

alter table mod_ratings enable row level security;

drop policy if exists "Anyone can read mod ratings" on mod_ratings;
drop policy if exists "Users can insert own ratings" on mod_ratings;
drop policy if exists "Users can update own ratings" on mod_ratings;

create policy "Anyone can read mod ratings"
on mod_ratings for select
to anon, authenticated
using (true);

create policy "Users can insert own ratings"
on mod_ratings for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can update own ratings"
on mod_ratings for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create table if not exists mod_views (
  mod_id integer not null,
  viewer_id text not null,
  created_at timestamp with time zone default now(),
  primary key (mod_id, viewer_id)
);

alter table mod_views enable row level security;

drop policy if exists "Anyone can read mod views" on mod_views;
drop policy if exists "Anyone can insert mod views" on mod_views;

create policy "Anyone can read mod views"
on mod_views for select
to anon, authenticated
using (true);

create policy "Anyone can insert mod views"
on mod_views for insert
to anon, authenticated
with check (true);

create or replace function increment_mod_views(target_mod_id integer)
returns void
language plpgsql
security definer
as $$
begin
  insert into mod_stats (mod_id, views, downloads)
  values (target_mod_id, 1, 0)
  on conflict (mod_id)
  do update set views = mod_stats.views + 1;
end;
$$;

create or replace function increment_mod_downloads(target_mod_id integer)
returns void
language plpgsql
security definer
as $$
begin
  insert into mod_stats (mod_id, views, downloads)
  values (target_mod_id, 0, 1)
  on conflict (mod_id)
  do update set downloads = mod_stats.downloads + 1;
end;
$$;

create or replace function increment_unique_mod_view(target_mod_id integer, target_viewer_id text)
returns void
language plpgsql
security definer
as $$
begin
  insert into mod_views (mod_id, viewer_id)
  values (target_mod_id, target_viewer_id)
  on conflict do nothing;

  if found then
    insert into mod_stats (mod_id, views, downloads)
    values (target_mod_id, 1, 0)
    on conflict (mod_id)
    do update set views = mod_stats.views + 1;
  end if;
end;
$$;
