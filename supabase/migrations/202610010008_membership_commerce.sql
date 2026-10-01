alter table public.product_orders
  add column if not exists commerce_type text not null default 'product',
  add column if not exists stripe_subscription_id text,
  add column if not exists membership_status text;

alter table public.product_orders
  drop constraint if exists product_orders_commerce_type_check;

alter table public.product_orders
  add constraint product_orders_commerce_type_check
  check (commerce_type in ('product', 'course', 'tip', 'membership'));

alter table public.product_orders
  drop constraint if exists product_orders_membership_status_check;

alter table public.product_orders
  add constraint product_orders_membership_status_check
  check (membership_status is null or membership_status in ('active', 'past_due', 'canceled', 'incomplete'));

create index if not exists product_orders_membership_subscription_idx
  on public.product_orders(stripe_subscription_id)
  where stripe_subscription_id is not null;
