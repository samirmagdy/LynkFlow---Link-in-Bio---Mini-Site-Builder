create table if not exists public.social_publications (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  provider text not null check (provider in ('linkedin')),
  content text not null,
  target_url text,
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'publishing', 'published', 'failed', 'cancelled')),
  provider_post_id text,
  last_error text,
  attempt_count integer not null default 0,
  share_event_id text references public.social_share_events(id) on delete set null,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists social_publications_due_idx
  on public.social_publications(status, scheduled_at);

create index if not exists social_publications_workspace_profile_idx
  on public.social_publications(workspace_id, profile_id, created_at desc);

alter table public.social_publications enable row level security;
create policy "workspace owners can access social publications"
  on public.social_publications for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
