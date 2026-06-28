-- Broken link / bad mod reports. Anyone can submit one (no login required -
-- requiring an account would just suppress legitimate reports from people
-- who only visited to download a file). The site owner reads these from
-- the Supabase table editor, so no public select policy is needed.
create table if not exists mod_reports (
  id bigint generated always as identity primary key,
  mod_id integer not null,
  reason text check (char_length(reason) <= 500),
  reporter_id uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone default now()
);

create index if not exists mod_reports_mod_id_idx on mod_reports (mod_id, created_at desc);

alter table mod_reports enable row level security;

drop policy if exists "Anyone can report a mod" on mod_reports;

create policy "Anyone can report a mod"
on mod_reports
for insert
to anon, authenticated
with check (true);
