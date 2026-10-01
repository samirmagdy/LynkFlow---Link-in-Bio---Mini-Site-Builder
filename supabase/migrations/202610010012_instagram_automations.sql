alter table public.social_connections
  drop constraint if exists social_connections_provider_check;
alter table public.social_connections
  add constraint social_connections_provider_check check (provider in ('linkedin', 'tiktok', 'instagram'));

alter table public.social_oauth_states
  drop constraint if exists social_oauth_states_provider_check;
alter table public.social_oauth_states
  add constraint social_oauth_states_provider_check check (provider in ('linkedin', 'tiktok', 'instagram'));

create table if not exists public.social_automations (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  provider text not null check (provider = 'instagram'),
  provider_account_id text not null,
  trigger text not null check (trigger in ('comment.keyword', 'message.keyword')),
  keyword text not null,
  response_text text not null,
  target_url text,
  enabled boolean not null default true,
  run_count integer not null default 0,
  last_triggered_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_automations_lookup_idx
  on public.social_automations(provider, provider_account_id, trigger, enabled);
create index if not exists social_automations_workspace_profile_idx
  on public.social_automations(workspace_id, profile_id, created_at desc);

create table if not exists public.social_automation_runs (
  id text primary key,
  automation_id text not null references public.social_automations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider = 'instagram'),
  provider_event_id text not null,
  recipient_id text,
  status text not null check (status in ('matched', 'sent', 'ignored', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (automation_id, provider_event_id)
);

create index if not exists social_automation_runs_workspace_idx
  on public.social_automation_runs(workspace_id, created_at desc);

alter table public.social_automations enable row level security;
alter table public.social_automation_runs enable row level security;

create policy "workspace owners can access social automations"
  on public.social_automations for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());

create policy "workspace owners can access social automation runs"
  on public.social_automation_runs for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
