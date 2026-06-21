-- Public comments on mod pages. Anyone can read; only logged-in users can
-- post (and only on their own behalf); users can delete their own comment.
-- No profanity filter by design - just a length cap and login requirement
-- to keep out spam bots.
create table if not exists mod_comments (
  id bigint generated always as identity primary key,
  mod_id integer not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamp with time zone default now()
);

create index if not exists mod_comments_mod_id_idx on mod_comments (mod_id, created_at desc);

alter table mod_comments enable row level security;

drop policy if exists "Anyone can read comments" on mod_comments;
drop policy if exists "Logged-in users can post their own comments" on mod_comments;
drop policy if exists "Users can delete their own comments" on mod_comments;

create policy "Anyone can read comments"
on mod_comments
for select
to anon, authenticated
using (true);

create policy "Logged-in users can post their own comments"
on mod_comments
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can delete their own comments"
on mod_comments
for delete
to authenticated
using (auth.uid() = user_id);
