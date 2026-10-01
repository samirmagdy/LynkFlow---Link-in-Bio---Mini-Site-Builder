create table if not exists public.product_orders (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  block_id text not null,
  stripe_session_id text not null unique,
  payment_status text not null check (payment_status in ('paid', 'unpaid', 'no_payment_required')),
  amount_total integer not null default 0 check (amount_total >= 0),
  currency text not null,
  customer_email text,
  customer_name text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists product_orders_workspace_time_idx
  on public.product_orders(workspace_id, created_at desc);

alter table public.product_orders enable row level security;
create policy "workspace owners can access product orders"
  on public.product_orders for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
