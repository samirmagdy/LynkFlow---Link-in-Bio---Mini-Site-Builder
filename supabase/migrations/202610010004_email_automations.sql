create table if not exists public.email_automations (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  name text not null,
  trigger text not null default 'subscriber.created' check (trigger in ('subscriber.created')),
  subject text not null,
  body text not null,
  enabled boolean not null default true,
  run_count integer not null default 0,
  last_triggered_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now()
);

create index if not exists email_automations_workspace_profile_idx
  on public.email_automations(workspace_id, profile_id, created_at desc);

create table if not exists public.email_automation_runs (
  id text primary key,
  automation_id text not null references public.email_automations(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  event_id text not null,
  recipient_email text not null,
  status text not null default 'sending' check (status in ('sending', 'sent', 'failed')),
  error_message text,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (automation_id, event_id)
);

create index if not exists email_automation_runs_workspace_idx
  on public.email_automation_runs(workspace_id, created_at desc);

alter table public.email_automations enable row level security;
alter table public.email_automation_runs enable row level security;
create policy "workspace owners can access email automations"
  on public.email_automations for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
create policy "workspace owners can access email automation runs"
  on public.email_automation_runs for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
