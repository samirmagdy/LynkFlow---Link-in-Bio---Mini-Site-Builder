alter table public.social_publications
  drop constraint if exists social_publications_provider_check;
alter table public.social_publications
  add constraint social_publications_provider_check check (provider in ('linkedin', 'tiktok', 'instagram'));

alter table public.social_publications
  add column if not exists media_type text not null default 'video';
alter table public.social_publications
  drop constraint if exists social_publications_media_type_check;
alter table public.social_publications
  add constraint social_publications_media_type_check check (media_type in ('image', 'video'));

alter table public.social_share_events
  drop constraint if exists social_share_events_provider_check;
alter table public.social_share_events
  add constraint social_share_events_provider_check check (provider in ('x', 'linkedin', 'facebook', 'whatsapp', 'telegram', 'email', 'tiktok', 'instagram'));
