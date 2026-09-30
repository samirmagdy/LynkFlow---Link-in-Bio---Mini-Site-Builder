-- Public marketing newsletter subscribers are intentionally separate from
-- creator-owned audience subscribers.
create table if not exists public.marketing_subscribers (
  id text primary key,
  email text not null,
  source text not null default 'landing_page',
  consent_given boolean not null default false check (consent_given = true),
  subscribed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (email)
);

create index if not exists marketing_subscribers_subscribed_at_idx
  on public.marketing_subscribers(subscribed_at desc);

alter table public.marketing_subscribers enable row level security;
