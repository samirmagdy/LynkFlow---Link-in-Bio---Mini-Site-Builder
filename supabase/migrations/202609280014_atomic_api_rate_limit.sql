create or replace function public.consume_api_rate_limit(
  p_key_id text,
  p_workspace_id uuid,
  p_max_requests integer,
  p_window_ms integer default 60000
)
returns table(allowed boolean, retry_after_seconds integer, remaining_requests integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket public.api_rate_limit_buckets%rowtype;
  now_ts timestamptz := now();
  elapsed_ms bigint;
begin
  select * into bucket
  from public.api_rate_limit_buckets
  where key_id = p_key_id
  for update;

  if not found then
    insert into public.api_rate_limit_buckets(key_id, workspace_id, window_start, request_count, max_requests, window_ms)
    values (p_key_id, p_workspace_id, now_ts, 1, p_max_requests, p_window_ms);
    return query select true, 0, greatest(0, p_max_requests - 1);
    return;
  end if;

  elapsed_ms := extract(epoch from (now_ts - bucket.window_start)) * 1000;
  if elapsed_ms >= bucket.window_ms then
    update public.api_rate_limit_buckets
    set window_start = now_ts, request_count = 1, max_requests = p_max_requests,
        window_ms = p_window_ms
    where key_id = p_key_id;
    return query select true, 0, greatest(0, p_max_requests - 1);
    return;
  end if;

  if bucket.request_count >= bucket.max_requests then
    return query select false, greatest(1, ceil((bucket.window_ms - elapsed_ms) / 1000.0)::integer), 0;
    return;
  end if;

  update public.api_rate_limit_buckets
  set request_count = request_count + 1
  where key_id = p_key_id;
  return query select true, 0, greatest(0, bucket.max_requests - bucket.request_count - 1);
end;
$$;

revoke all on function public.consume_api_rate_limit(text, uuid, integer, integer) from public;
grant execute on function public.consume_api_rate_limit(text, uuid, integer, integer) to service_role;
