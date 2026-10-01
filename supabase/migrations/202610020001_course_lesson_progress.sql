create table if not exists public.course_lesson_progress (
  access_token_hash text not null,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  profile_id text not null,
  block_id text not null,
  lesson_id text not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (access_token_hash, lesson_id)
);

create index if not exists course_lesson_progress_workspace_idx
  on public.course_lesson_progress(workspace_id, profile_id, block_id);

alter table public.course_lesson_progress enable row level security;

create policy "workspace owners can access course progress"
  on public.course_lesson_progress for all
  using (workspace_id = auth.uid())
  with check (workspace_id = auth.uid());
