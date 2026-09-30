create table if not exists public.support_tickets (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  requester_email text not null,
  subject text not null check (char_length(subject) between 3 and 160),
  message text not null check (char_length(message) between 10 and 10000),
  plan text not null check (plan in ('free', 'pro', 'agency')),
  priority text not null check (priority in ('community', 'standard', 'priority')),
  status text not null default 'open' check (status in ('open', 'in_progress', 'waiting_on_customer', 'resolved')),
  sla_hours integer not null check (sla_hours > 0),
  due_at timestamptz not null,
  assigned_to text,
  first_response_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_workspace_status_idx
  on public.support_tickets(workspace_id, status, due_at);

alter table public.support_tickets enable row level security;

create policy "workspace owners can access support tickets"
  on public.support_tickets for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());

