create table if not exists public.client_approval_requests (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  preview_token_hash text not null unique,
  client_name text not null,
  client_email text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'expired', 'revoked')),
  feedback text,
  expires_at timestamptz not null,
  responded_at timestamptz,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists client_approval_requests_workspace_idx
  on public.client_approval_requests(workspace_id, created_at desc);
create index if not exists client_approval_requests_profile_idx
  on public.client_approval_requests(profile_id, created_at desc);
create index if not exists client_approval_requests_token_idx
  on public.client_approval_requests(preview_token_hash);

alter table public.client_approval_requests enable row level security;

create policy "workspace owners can access client approvals"
  on public.client_approval_requests for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());

comment on table public.client_approval_requests is 'Secure agency/client draft review requests. Tokens are stored only as hashes.';
