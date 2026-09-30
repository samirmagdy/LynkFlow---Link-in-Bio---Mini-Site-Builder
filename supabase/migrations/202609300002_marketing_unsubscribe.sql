alter table public.marketing_subscribers
  add column if not exists unsubscribed_at timestamptz;
