-- Application resources not embedded in profiles.data.

create table if not exists public.analytics_events (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  event_type text not null check (event_type in ('page_view', 'block_click', 'qr_scan', 'form_submit')),
  block_id text,
  block_title text,
  tab_id text,
  snapshot_version integer,
  visitor_hash text,
  occurred_at timestamptz not null,
  referrer text not null default 'Direct',
  country text not null default 'Unknown',
  device text not null check (device in ('mobile', 'desktop', 'tablet')),
  campaign text,
  is_bot boolean not null default false,
  consent_granted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_profile_time_idx
  on public.analytics_events(workspace_id, profile_id, occurred_at desc);

create table if not exists public.analytics_exports (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  requested_by text not null,
  date_range text not null,
  status text not null check (status in ('processing', 'completed', 'failed')),
  total_events integer not null default 0,
  download_url text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.form_submissions (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  block_id text not null,
  form_title text not null,
  form_type text,
  data jsonb not null default '{}'::jsonb,
  responder_email text,
  responder_name text,
  submitted_at timestamptz not null,
  consent_given boolean not null default false,
  consent_text text,
  ip_hash text,
  status text not null default 'verified' check (status in ('verified', 'flagged_spam', 'archived')),
  subscriber_created boolean not null default false
);

create index if not exists form_submissions_profile_time_idx
  on public.form_submissions(workspace_id, profile_id, submitted_at desc);

create table if not exists public.subscribers (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  email text not null,
  name text,
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  source_block_id text not null,
  source_form_title text not null,
  subscribed_at timestamptz not null,
  consent_given boolean not null default false,
  consent_text text,
  last_engagement_at timestamptz,
  unique (workspace_id, profile_id, email)
);

create table if not exists public.audit_logs (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor text not null,
  action text not null,
  target text not null,
  occurred_at timestamptz not null,
  details text
);

create index if not exists audit_logs_workspace_time_idx
  on public.audit_logs(workspace_id, occurred_at desc);

create table if not exists public.abuse_reports (
  id text primary key,
  workspace_id uuid references public.workspaces(id) on delete set null,
  profile_username text not null,
  reason text not null check (reason in ('spam', 'phishing', 'copyright', 'harmful')),
  description text not null,
  reporter_email text,
  occurred_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed'))
);

create table if not exists public.custom_themes (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.api_keys (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  scopes text[] not null,
  allowed_profile_ids text[],
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default now(),
  created_by text not null,
  last_used_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz
);

create table if not exists public.webhook_subscriptions (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  url text not null check (url like 'https://%'),
  description text,
  topics text[] not null,
  signing_secret_prefix text not null,
  status text not null default 'active' check (status in ('active', 'paused', 'failed')),
  created_at timestamptz not null default now(),
  created_by text not null,
  last_delivery_at timestamptz,
  last_delivery_status text check (last_delivery_status in ('success', 'failed')),
  consecutive_failures integer not null default 0
);

create table if not exists public.webhook_deliveries (
  id text primary key,
  subscription_id text not null references public.webhook_subscriptions(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  topic text not null,
  payload jsonb not null,
  signature text not null,
  status text not null check (status in ('pending', 'delivered', 'failed')),
  attempt_count integer not null default 0,
  next_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.api_idempotency_keys (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key_id text not null,
  idempotency_key text not null,
  request_hash text not null,
  response_status integer not null,
  response_body jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (key_id, idempotency_key)
);

create table if not exists public.api_rate_limit_buckets (
  key_id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  window_start timestamptz not null,
  request_count integer not null default 0,
  max_requests integer not null,
  window_ms integer not null default 60000
);

-- Every application table is workspace-scoped. Service-role workers may bypass
-- these policies; browser clients can only access rows for auth.uid().
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'analytics_events', 'analytics_exports', 'form_submissions', 'subscribers',
    'audit_logs', 'custom_themes', 'api_keys', 'webhook_subscriptions',
    'webhook_deliveries', 'api_idempotency_keys', 'api_rate_limit_buckets'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "workspace owners can access %1$s" on public.%1$I for all using (workspace_id = auth.uid()) with check (workspace_id = auth.uid())', table_name);
  end loop;
end $$;

alter table public.abuse_reports enable row level security;
create policy "workspace owners can access abuse reports"
  on public.abuse_reports for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
