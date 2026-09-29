do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'published_profiles_profile_id_fkey'
      and conrelid = 'public.published_profiles'::regclass
  ) then
    alter table public.published_profiles
      add constraint published_profiles_profile_id_fkey
      foreign key (profile_id) references public.profiles(id) on delete cascade;
  end if;
end $$;
