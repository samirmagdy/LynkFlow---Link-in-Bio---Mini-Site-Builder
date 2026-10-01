create table if not exists public.social_connections (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('linkedin')),
  provider_account_id text not null,
  account_name text,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  token_expires_at timestamptz,
  scopes text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, provider, provider_account_id)
);

create index if not exists social_connections_workspace_provider_idx
  on public.social_connections(workspace_id, provider, status);

create table if not exists public.social_oauth_states (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  provider text not null check (provider in ('linkedin')),
  state_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists social_oauth_states_expiry_idx
  on public.social_oauth_states(expires_at, used_at);

alter table public.social_connections enable row level security;
alter table public.social_oauth_states enable row level security;

create policy "workspace owners can access social connections"
  on public.social_connections for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());

create policy "workspace owners can access social oauth states"
  on public.social_oauth_states for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
