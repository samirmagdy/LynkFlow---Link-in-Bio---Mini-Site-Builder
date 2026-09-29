alter table public.webhook_subscriptions
  add column if not exists signing_secret_ciphertext text;

create index if not exists webhook_subscriptions_workspace_status_idx
  on public.webhook_subscriptions(workspace_id, status);
