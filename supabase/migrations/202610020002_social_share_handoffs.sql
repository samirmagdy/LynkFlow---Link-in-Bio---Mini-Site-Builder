alter table public.social_share_events
  drop constraint if exists social_share_events_provider_check;

alter table public.social_share_events
  add constraint social_share_events_provider_check
  check (provider in ('x', 'linkedin', 'facebook', 'whatsapp', 'telegram', 'email', 'tiktok', 'instagram', 'youtube', 'threads'));
