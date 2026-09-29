create table if not exists public.workspaces (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'Creator Workspace',
  plan text not null default 'free' check (plan in ('free', 'pro', 'agency')),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id text primary key,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  username text not null,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, username)
);

create index if not exists profiles_workspace_id_idx on public.profiles(workspace_id);

alter table public.workspaces enable row level security;
alter table public.profiles enable row level security;

create policy "workspace owners can access their workspace"
  on public.workspaces for all
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "workspace owners can access their profiles"
  on public.profiles for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.workspaces (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
