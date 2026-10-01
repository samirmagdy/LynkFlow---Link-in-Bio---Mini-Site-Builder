create table if not exists public.booking_requests (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  block_id text not null,
  form_submission_id text not null references public.form_submissions(id) on delete cascade,
  requested_start timestamptz not null,
  duration_minutes integer not null default 30 check (duration_minutes in (15, 30, 60, 90, 120)),
  requester_email text not null,
  requester_name text,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_requests_profile_time_idx
  on public.booking_requests(workspace_id, profile_id, requested_start desc);
create index if not exists booking_requests_status_idx
  on public.booking_requests(workspace_id, profile_id, status);

alter table public.booking_requests enable row level security;
create policy "workspace owners can access booking requests"
  on public.booking_requests for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
