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

-- One level of replies: a reply's parent_id points at the comment it
-- answers; top-level comments have parent_id = null.
alter table mod_comments add column if not exists parent_id bigint references mod_comments(id) on delete cascade;

-- Avatar URL is denormalized onto the comment at post time (same as
-- username), so it doesn't need a join to render and matches what the
-- author's profile looked like when they wrote it.
alter table mod_comments add column if not exists avatar_url text;

create index if not exists mod_comments_mod_id_idx on mod_comments (mod_id, created_at desc);
create index if not exists mod_comments_parent_id_idx on mod_comments (parent_id);

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

-- Site owner's account (modvault.space admin) can delete any comment,
-- everyone else can only delete their own.
create policy "Users can delete their own comments"
on mod_comments
for delete
to authenticated
using (auth.uid() = user_id or auth.uid() = '3e836ea2-bb01-406b-94c0-59bf49ab3bc9');

-- One like/dislike per user per comment. Votes themselves aren't sensitive,
-- so anyone can read the raw rows and the client aggregates the counts.
create table if not exists mod_comment_votes (
  comment_id bigint not null references mod_comments(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  vote smallint not null check (vote in (1, -1)),
  created_at timestamp with time zone default now(),
  primary key (comment_id, user_id)
);

create index if not exists mod_comment_votes_comment_id_idx on mod_comment_votes (comment_id);

alter table mod_comment_votes enable row level security;

drop policy if exists "Anyone can read comment votes" on mod_comment_votes;
drop policy if exists "Logged-in users can vote" on mod_comment_votes;
drop policy if exists "Users can change their own vote" on mod_comment_votes;
drop policy if exists "Users can remove their own vote" on mod_comment_votes;

create policy "Anyone can read comment votes"
on mod_comment_votes
for select
to anon, authenticated
using (true);

create policy "Logged-in users can vote"
on mod_comment_votes
for insert
to authenticated
with check (auth.uid() = user_id);

create policy "Users can change their own vote"
on mod_comment_votes
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can remove their own vote"
on mod_comment_votes
for delete
to authenticated
using (auth.uid() = user_id);
