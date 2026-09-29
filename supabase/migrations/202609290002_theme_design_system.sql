-- First-class design-system persistence. Profile data remains a compatibility
-- snapshot while these records become the authoritative reusable resources.

create table if not exists public.themes (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  category text not null default 'custom',
  definition_json jsonb not null default '{}'::jsonb,
  preview_image_url text,
  schema_version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.layouts (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  definition_json jsonb not null default '{}'::jsonb,
  schema_version integer not null default 1,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.theme_versions (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  theme_id text,
  layout_id text,
  overrides_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  version_name text not null default 'Untitled version',
  version_notes text,
  created_by text not null,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.brand_kits (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  tokens_json jsonb not null default '{}'::jsonb,
  locked_fields_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists active_theme_id text;
alter table public.profiles add column if not exists active_layout_id text;
alter table public.profiles add column if not exists theme_overrides_json jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists layout_overrides_json jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists published_snapshot_id text;

create index if not exists themes_workspace_idx on public.themes(workspace_id, updated_at desc);
create index if not exists layouts_workspace_idx on public.layouts(workspace_id, updated_at desc);
create index if not exists theme_versions_profile_idx on public.theme_versions(workspace_id, profile_id, created_at desc);
create index if not exists brand_kits_workspace_idx on public.brand_kits(workspace_id, updated_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['themes', 'layouts', 'theme_versions', 'brand_kits'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "workspace owners can access %1$s" on public.%1$I for all using (workspace_id = auth.uid()) with check (workspace_id = auth.uid())', table_name);
  end loop;
end $$;
