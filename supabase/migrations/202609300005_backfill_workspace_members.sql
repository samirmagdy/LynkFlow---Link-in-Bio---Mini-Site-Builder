-- Preserve collaborators created before workspace_members became authoritative.
insert into public.workspace_members (
  id, workspace_id, user_id, email, name, role, assigned_profile_ids,
  status, added_by, invite_expires_at, created_at, updated_at
)
select
  coalesce(nullif(member->>'id', ''), 'legacy-' || md5(w.id::text || ':' || lower(member->>'email'))),
  w.id,
  auth_user.id,
  lower(member->>'email'),
  coalesce(nullif(member->>'name', ''), lower(member->>'email')),
  case when member->>'role' = 'viewer' then 'viewer' else 'manager' end,
  case when jsonb_typeof(member->'assignedProfileIds') = 'array' then member->'assignedProfileIds' else '[]'::jsonb end,
  'pending',
  w.id,
  nullif(member->>'pendingInviteExpiresAt', '')::timestamptz,
  coalesce(nullif(member->>'addedAt', '')::timestamptz, now()),
  now()
from public.workspaces w
cross join lateral jsonb_array_elements(coalesce(w.settings->'members', '[]'::jsonb)) member
left join auth.users auth_user on lower(auth_user.email) = lower(member->>'email')
where nullif(member->>'email', '') is not null
on conflict do nothing;
