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
  bucket public.public_rate_limit_buckets%rowtype;
  now_ts timestamptz := now();
  elapsed_ms bigint;
begin
  delete from public.public_rate_limit_buckets
  where updated_at < now_ts - interval '1 day';

  insert into public.public_rate_limit_buckets(key_id, window_start, request_count, max_requests, window_ms)
  values (p_key_id, now_ts, 1, p_max_requests, p_window_ms)
  on conflict (key_id) do nothing;

  select * into bucket
  from public.public_rate_limit_buckets
  where key_id = p_key_id
  for update;

  elapsed_ms := extract(epoch from (now_ts - bucket.window_start)) * 1000;
  if elapsed_ms >= bucket.window_ms then
    update public.public_rate_limit_buckets
    set window_start = now_ts, request_count = 1, max_requests = p_max_requests,
        window_ms = p_window_ms, updated_at = now_ts
    where key_id = p_key_id;
    return query select true, 0;
  end if;

  if bucket.request_count >= bucket.max_requests then
    return query select false, greatest(1, ceil((bucket.window_ms - elapsed_ms) / 1000.0)::integer);
    return;
  end if;

  update public.public_rate_limit_buckets
  set request_count = request_count + 1, updated_at = now_ts
  where key_id = p_key_id;
  return query select true, 0;
end;
$$;

revoke all on function public.consume_public_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_public_rate_limit(text, integer, integer) to service_role;
