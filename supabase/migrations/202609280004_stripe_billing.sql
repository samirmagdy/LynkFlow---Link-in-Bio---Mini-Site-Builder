alter table public.workspaces
  add column if not exists billing_cycle text not null default 'annual'
    check (billing_cycle in ('monthly', 'annual')),
  add column if not exists subscription_status text not null default 'active'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled', 'grace_period')),
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz,
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists trial_ends_at timestamptz,
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text;

create unique index if not exists workspaces_provider_customer_id_idx
  on public.workspaces(provider_customer_id)
  where provider_customer_id is not null;

create unique index if not exists workspaces_provider_subscription_id_idx
  on public.workspaces(provider_subscription_id)
  where provider_subscription_id is not null;

create table if not exists public.stripe_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_events enable row level security;
