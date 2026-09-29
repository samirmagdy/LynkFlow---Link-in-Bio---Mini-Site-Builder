-- Persist the selected starter-site catalog entry independently from the
-- profile's content snapshot and the reusable theme/layout resources.
alter table public.profiles add column if not exists active_starter_site_id text;
create index if not exists profiles_starter_site_idx on public.profiles(active_starter_site_id);
