-- A profile without a handle cannot be addressed by the dashboard or public API.
-- Keep this invariant in the database instead of relying only on UI validation.
alter table public.profiles
  drop constraint if exists profiles_username_nonempty;

alter table public.profiles
  add constraint profiles_username_nonempty
  check (btrim(username) <> '');
