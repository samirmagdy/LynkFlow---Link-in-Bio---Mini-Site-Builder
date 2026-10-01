alter table public.support_tickets
  add column if not exists routing_status text not null default 'pending'
    check (routing_status in ('pending', 'sent', 'failed')),
  add column if not exists routed_at timestamptz,
  add column if not exists routing_error text;

create index if not exists support_tickets_routing_status_idx
  on public.support_tickets(routing_status, created_at)
  where routing_status <> 'sent';
