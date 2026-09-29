create table if not exists public.public_rate_limit_buckets (
  key_id text primary key,
  window_start timestamptz not null,
  request_count integer not null default 0,
  max_requests integer not null,
  window_ms integer not null default 60000,
  updated_at timestamptz not null default now()
);

alter table public.public_rate_limit_buckets enable row level security;

create or replace function public.consume_public_rate_limit(
  p_key_id text,
  p_max_requests integer,
  p_window_ms integer default 60000
)
returns table(allowed boolean, retry_after_seconds integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_bucket public.public_rate_limit_buckets%rowtype;
  current_time timestamptz := now();
  elapsed_ms bigint;
begin
  delete from public.public_rate_limit_buckets
  where updated_at < current_time - interval '1 day';

  insert into public.public_rate_limit_buckets(key_id, window_start, request_count, max_requests, window_ms)
  values (p_key_id, current_time, 1, p_max_requests, p_window_ms)
  on conflict (key_id) do nothing;

  select * into current_bucket
  from public.public_rate_limit_buckets
  where key_id = p_key_id
  for update;

  if not found then
    return query select true, 0;
    return;
  end if;

  if current_bucket.window_start = current_time and current_bucket.request_count = 1 then
    return query select true, 0;
    return;
  end if;

  elapsed_ms := extract(epoch from (current_time - current_bucket.window_start)) * 1000;
  if elapsed_ms >= current_bucket.window_ms then
    update public.public_rate_limit_buckets
    set window_start = current_time, request_count = 1, max_requests = p_max_requests,
        window_ms = p_window_ms, updated_at = current_time
    where key_id = p_key_id;
    return query select true, 0;
  end if;

  if current_bucket.request_count >= current_bucket.max_requests then
    return query select false, greatest(1, ceil((current_bucket.window_ms - elapsed_ms) / 1000.0)::integer);
    return;
  end if;

  update public.public_rate_limit_buckets
  set request_count = request_count + 1, updated_at = current_time
  where key_id = p_key_id;
  return query select true, 0;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;
