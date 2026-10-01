alter table public.product_orders
  add column if not exists physical_product boolean not null default false,
  add column if not exists fulfillment_status text not null default 'not_required',
  add column if not exists shipping_name text,
  add column if not exists shipping_address jsonb,
  add column if not exists tracking_number text,
  add column if not exists tracking_url text,
  add column if not exists fulfilled_at timestamptz;

alter table public.product_orders
  drop constraint if exists product_orders_fulfillment_status_check;
alter table public.product_orders
  add constraint product_orders_fulfillment_status_check
  check (fulfillment_status in ('not_required', 'pending', 'processing', 'fulfilled', 'cancelled'));

create index if not exists product_orders_fulfillment_idx
  on public.product_orders(workspace_id, fulfillment_status, created_at desc);
