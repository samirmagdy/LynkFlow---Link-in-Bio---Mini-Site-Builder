create table if not exists public.email_campaigns (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  subject text not null,
  body text not null,
  status text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  recipient_count integer not null default 0,
  sent_count integer not null default 0,
  created_by text not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists email_campaigns_workspace_profile_idx
  on public.email_campaigns(workspace_id, profile_id, created_at desc);

alter table public.email_campaigns enable row level security;
create policy "workspace owners can access email campaigns"
  on public.email_campaigns for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
