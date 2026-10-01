create table if not exists public.social_share_events (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  provider text not null check (provider in ('x', 'linkedin', 'facebook', 'whatsapp', 'telegram', 'email')),
  content text not null,
  target_url text not null,
  status text not null default 'initiated' check (status in ('initiated', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists social_share_events_workspace_profile_idx
  on public.social_share_events(workspace_id, profile_id, created_at desc);

alter table public.social_share_events enable row level security;
create policy "workspace owners can access social share events"
  on public.social_share_events for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
