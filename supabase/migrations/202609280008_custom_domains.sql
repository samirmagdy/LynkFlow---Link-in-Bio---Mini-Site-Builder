create table if not exists public.custom_domains (
  domain text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed', 'conflict')),
  ssl_status text not null default 'provisioning' check (ssl_status in ('provisioning', 'active', 'failed', 'renewal_failed')),
  cname_target text not null,
  expected_ip text,
  failure_reason text,
  conflict_owner_id uuid,
  last_checked_at timestamptz,
  next_renewal_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists custom_domains_profile_idx on public.custom_domains(profile_id);
alter table public.custom_domains enable row level security;
create policy "workspace owners can access custom domains"
  on public.custom_domains for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
