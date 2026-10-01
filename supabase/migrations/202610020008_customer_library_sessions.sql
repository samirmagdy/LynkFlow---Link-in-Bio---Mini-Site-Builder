create table if not exists public.customer_library_sessions (
  id text primary key,
  token_hash text not null unique,
  customer_email text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists customer_library_sessions_expiry_idx
  on public.customer_library_sessions(expires_at);
create index if not exists customer_library_sessions_email_idx
  on public.customer_library_sessions(customer_email, created_at desc);

alter table public.customer_library_sessions enable row level security;

comment on table public.customer_library_sessions is 'Short-lived server-only magic-link sessions for customer purchase libraries.';
