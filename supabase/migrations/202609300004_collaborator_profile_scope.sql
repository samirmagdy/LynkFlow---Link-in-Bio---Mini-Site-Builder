-- Managers/viewers can only read and mutate profiles explicitly assigned to them.
create or replace function public.can_write_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_workspace_id = auth.uid()
    or exists (
      select 1 from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = auth.uid()
        and member.role = 'manager'
        and member.status in ('pending', 'active')
        and (member.invite_expires_at is null or member.invite_expires_at > now())
    );
$$;

create or replace function public.can_access_profile(target_workspace_id uuid, target_profile_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select target_workspace_id = auth.uid()
    or exists (
      select 1 from public.workspace_members member
      where member.workspace_id = target_workspace_id
        and member.user_id = auth.uid()
        and member.status in ('pending', 'active')
        and (member.invite_expires_at is null or member.invite_expires_at > now())
        and member.assigned_profile_ids ? target_profile_id
    );
$$;

drop policy if exists "workspace collaborators can read profiles" on public.profiles;
drop policy if exists "workspace collaborators can write profiles" on public.profiles;
create policy "assigned collaborators can read profiles"
  on public.profiles for select
  using (public.can_access_profile(workspace_id, id));
create policy "assigned collaborators can write profiles"
  on public.profiles for all
  using (public.can_access_profile(workspace_id, id) and public.can_write_workspace(workspace_id))
  with check (public.can_access_profile(workspace_id, id) and public.can_write_workspace(workspace_id));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'analytics_events', 'analytics_exports', 'form_submissions', 'subscribers',
    'background_assets', 'custom_domains', 'preview_tokens', 'published_profiles',
    'theme_versions'
  ] loop
    execute format('drop policy if exists "workspace collaborators can read %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "workspace collaborators can write %1$s" on public.%1$I', table_name);
    execute format('create policy "assigned collaborators can read %1$s" on public.%1$I for select using (public.can_access_profile(workspace_id, profile_id))', table_name);
    execute format('create policy "assigned collaborators can write %1$s" on public.%1$I for all using (public.can_access_profile(workspace_id, profile_id) and public.can_write_workspace(workspace_id)) with check (public.can_access_profile(workspace_id, profile_id) and public.can_write_workspace(workspace_id))', table_name);
  end loop;
end $$;
