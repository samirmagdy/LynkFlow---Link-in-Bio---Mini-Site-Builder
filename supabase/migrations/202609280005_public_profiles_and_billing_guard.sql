create table if not exists public.published_profiles (
  profile_id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  username text not null unique,
  snapshot jsonb not null,
  published_version integer not null,
  published_at timestamptz not null,
  updated_at timestamptz not null default now()
);

create index if not exists published_profiles_workspace_id_idx
  on public.published_profiles(workspace_id);

alter table public.published_profiles enable row level security;

create policy "published profiles are publicly readable"
  on public.published_profiles for select
  to anon, authenticated
  using (true);

create policy "workspace owners manage published profiles"
  on public.published_profiles for all
  to authenticated
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());

create or replace function public.prevent_client_billing_changes()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    if tg_op = 'INSERT' and (
      new.plan <> 'free' or new.subscription_status <> 'active' or
      new.provider_customer_id is not null or new.provider_subscription_id is not null
    ) then
      raise exception 'Billing fields are server managed';
    end if;
    if tg_op = 'UPDATE' and (
      new.plan is distinct from old.plan or
      new.billing_cycle is distinct from old.billing_cycle or
      new.subscription_status is distinct from old.subscription_status or
      new.current_period_start is distinct from old.current_period_start or
      new.current_period_end is distinct from old.current_period_end or
      new.cancel_at_period_end is distinct from old.cancel_at_period_end or
      new.trial_ends_at is distinct from old.trial_ends_at or
      new.provider_customer_id is distinct from old.provider_customer_id or
      new.provider_subscription_id is distinct from old.provider_subscription_id
    ) then
      raise exception 'Billing fields are server managed';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_workspace_billing_fields on public.workspaces;
create trigger protect_workspace_billing_fields
  before insert or update on public.workspaces
  for each row execute procedure public.prevent_client_billing_changes();
