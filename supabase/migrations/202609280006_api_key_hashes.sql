alter table public.api_keys
  add column if not exists secret_hash text;

create unique index if not exists api_keys_secret_hash_idx
  on public.api_keys(secret_hash)
  where secret_hash is not null;
