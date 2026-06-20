alter table mod_ratings enable row level security;

delete from mod_ratings a
using mod_ratings b
where a.ctid < b.ctid
  and a.mod_id = b.mod_id
  and a.user_id = b.user_id;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'mod_ratings_mod_id_user_id_unique'
  ) then
    alter table mod_ratings
    add constraint mod_ratings_mod_id_user_id_unique unique (mod_id, user_id);
  end if;
end $$;

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

grant select on mod_ratings to anon, authenticated;
grant insert, update on mod_ratings to authenticated;
