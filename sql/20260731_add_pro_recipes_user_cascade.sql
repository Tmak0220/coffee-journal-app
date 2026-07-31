-- Ensure verification articles are removed with their application account.
-- Audited against the production schema on 2026-07-31.
--
-- Existing data check at audit time:
--   pro_recipes rows: 1
--   orphaned rows:    0

begin;

alter table public.pro_recipes
  drop constraint if exists pro_recipes_user_id_fkey;

alter table public.pro_recipes
  add constraint pro_recipes_user_id_fkey
  foreign key (user_id)
  references public.users(id)
  on delete cascade;

commit;

-- Verification:
-- select
--   conname,
--   pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.pro_recipes'::regclass
--   and conname = 'pro_recipes_user_id_fkey';
