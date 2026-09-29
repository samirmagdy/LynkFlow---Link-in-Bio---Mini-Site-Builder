create table if not exists public.preview_tokens (
  id text primary key,
  token_hash text not null unique,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  created_by text not null,
  revoked_at timestamptz
);

create index if not exists preview_tokens_profile_idx
  on public.preview_tokens(profile_id, expires_at desc);

alter table public.preview_tokens enable row level security;
