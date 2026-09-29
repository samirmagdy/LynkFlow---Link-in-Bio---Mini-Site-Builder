-- Ownership-scoped metadata for reusable background media.
create table if not exists public.background_assets (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text,
  storage_path text not null unique,
  asset_url text not null,
  kind text not null check (kind in ('image', 'video')),
  mime_type text not null,
  byte_size bigint not null default 0,
  width integer,
  height integer,
  duration_seconds numeric,
  source text not null default 'upload' check (source in ('upload', 'pexels')),
  source_url text,
  photographer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists background_assets_workspace_idx on public.background_assets(workspace_id, created_at desc);
create index if not exists background_assets_profile_idx on public.background_assets(workspace_id, profile_id, created_at desc);

alter table public.background_assets enable row level security;
drop policy if exists "workspace owners can access background assets" on public.background_assets;
create policy "workspace owners can access background assets"
  on public.background_assets for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
