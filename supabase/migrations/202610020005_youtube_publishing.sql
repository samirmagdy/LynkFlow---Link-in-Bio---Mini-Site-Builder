alter table public.social_connections
  drop constraint if exists social_connections_provider_check;

alter table public.social_connections
  add constraint social_connections_provider_check
  check (provider in ('linkedin', 'tiktok', 'instagram', 'facebook', 'youtube', 'threads', 'x'));

alter table public.social_oauth_states
  drop constraint if exists social_oauth_states_provider_check;

alter table public.social_oauth_states
  add constraint social_oauth_states_provider_check
  check (provider in ('linkedin', 'tiktok', 'instagram', 'facebook', 'youtube', 'threads', 'x'));

alter table public.social_publications
  drop constraint if exists social_publications_provider_check;

alter table public.social_publications
  add constraint social_publications_provider_check
  check (provider in ('linkedin', 'tiktok', 'instagram', 'facebook', 'youtube', 'x'));
