alter table public.product_orders
  add column if not exists access_token_hash text,
  add column if not exists access_token_expires_at timestamptz;

create unique index if not exists product_orders_access_token_hash_idx
  on public.product_orders(access_token_hash)
  where access_token_hash is not null;
