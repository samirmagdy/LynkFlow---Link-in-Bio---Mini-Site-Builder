-- Shared workspaces: invitations and collaborator read access.
create table if not exists public.workspace_members (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text not null,
  name text not null,
  role text not null check (role in ('manager', 'viewer')),
  assigned_profile_ids jsonb not null default '[]'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  added_by uuid not null references auth.users(id) on delete restrict,
  invite_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists workspace_members_user_idx on public.workspace_members(user_id, status);
create index if not exists workspace_members_workspace_idx on public.workspace_members(workspace_id, status);

alter table public.workspace_members enable row level security;

create or replace function public.can_access_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_workspace_id = auth.uid()
    or exists (
      select 1 from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = auth.uid()
        and member.status in ('pending', 'active')
        and (member.invite_expires_at is null or member.invite_expires_at > now())
    );
$$;

create or replace function public.can_write_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_workspace_id = auth.uid()
    or exists (
      select 1 from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = auth.uid()
        and member.role = 'manager'
        and member.status = 'active'
        and (member.invite_expires_at is null or member.invite_expires_at > now())
    );
$$;

create policy "workspace members can read memberships"
  on public.workspace_members for select
  using (workspace_id = auth.uid() or user_id = auth.uid());

create policy "workspace owners manage memberships"
  on public.workspace_members for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());

drop policy if exists "workspace owners can access their workspace" on public.workspaces;
create policy "workspace owners manage their workspace"
  on public.workspaces for all
  using (id = auth.uid())
  with check (id = auth.uid());
create policy "workspace members can read their workspace"
  on public.workspaces for select
  using (public.can_access_workspace(id));

drop policy if exists "workspace owners can access their profiles" on public.profiles;
create policy "workspace collaborators can read profiles"
  on public.profiles for select
  using (public.can_access_workspace(workspace_id));
create policy "workspace collaborators can write profiles"
  on public.profiles for all
  using (public.can_write_workspace(workspace_id))
  with check (public.can_write_workspace(workspace_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'analytics_events', 'analytics_exports', 'form_submissions', 'subscribers',
    'audit_logs', 'custom_themes', 'api_keys', 'webhook_subscriptions',
    'webhook_deliveries', 'api_idempotency_keys', 'api_rate_limit_buckets',
    'background_assets', 'brand_kits', 'custom_domains', 'layouts',
    'preview_tokens', 'published_profiles', 'theme_versions', 'themes'
  ] loop
    execute format('drop policy if exists "workspace owners can access %1$s" on public.%1$I', table_name);
    execute format('create policy "workspace collaborators can read %1$s" on public.%1$I for select using (public.can_access_workspace(workspace_id))', table_name);
    execute format('create policy "workspace collaborators can write %1$s" on public.%1$I for all using (public.can_write_workspace(workspace_id)) with check (public.can_write_workspace(workspace_id))', table_name);
  end loop;
end $$;

drop policy if exists "workspace owners can access abuse reports" on public.abuse_reports;
create policy "workspace collaborators can read abuse reports"
  on public.abuse_reports for select
  using (workspace_id is not null and public.can_access_workspace(workspace_id));
create policy "workspace owners manage abuse reports"
  on public.abuse_reports for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
