-- Persist saved-preset composition explicitly so applying a preset can be
-- explained as appearance-only or content/layout-changing.
alter table public.custom_themes add column if not exists theme_id text;
alter table public.custom_themes add column if not exists layout_id text;
alter table public.custom_themes add column if not exists brand_kit_id text;
alter table public.custom_themes add column if not exists starter_site_id text;
alter table public.custom_themes add column if not exists selected_block_variants jsonb not null default '{}'::jsonb;
alter table public.custom_themes add column if not exists includes_starter_content boolean not null default false;
alter table public.custom_themes add column if not exists changes_content boolean not null default false;
alter table public.custom_themes add column if not exists changes_layout boolean not null default true;

create index if not exists custom_themes_composition_idx on public.custom_themes(workspace_id, theme_id, layout_id, starter_site_id);
