alter table public.social_publications
  drop constraint if exists social_publications_provider_check;

alter table public.social_publications
  add constraint social_publications_provider_check
  check (provider in ('linkedin', 'tiktok', 'instagram', 'facebook', 'youtube', 'threads', 'x'));
