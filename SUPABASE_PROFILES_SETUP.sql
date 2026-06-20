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
on profiles
for select
to anon, authenticated
using (true);

create policy "Users can insert own profile"
on profiles
for insert
to authenticated
with check (auth.uid() = id);

create policy "Users can update own profile"
on profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);
