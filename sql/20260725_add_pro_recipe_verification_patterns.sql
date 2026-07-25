begin;

alter table public.pro_recipes
  add column if not exists verification_patterns jsonb not null default '[]'::jsonb;

alter table public.pro_recipes
  drop constraint if exists pro_recipes_verification_patterns_is_array;

alter table public.pro_recipes
  add constraint pro_recipes_verification_patterns_is_array
  check (jsonb_typeof(verification_patterns) = 'array');

comment on column public.pro_recipes.verification_patterns is
  'All verification patterns and their recipe, water, roast, and cupping modules for one verification article.';

commit;
