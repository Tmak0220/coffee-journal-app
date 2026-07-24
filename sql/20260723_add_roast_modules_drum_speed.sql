begin;

alter table public.roast_modules
  add column if not exists drum_speed numeric;

comment on column public.roast_modules.drum_speed is
  'Roaster drum rotation speed in RPM';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'roast_modules_drum_speed_nonnegative'
      and conrelid = 'public.roast_modules'::regclass
  ) then
    alter table public.roast_modules
      add constraint roast_modules_drum_speed_nonnegative
      check (drum_speed is null or drum_speed >= 0);
  end if;
end
$$;

commit;
