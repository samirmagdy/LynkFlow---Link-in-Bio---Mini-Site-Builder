alter table public.product_orders
  add column if not exists delivery_url text,
  add column if not exists delivery_sent_at timestamptz;
