-- Preserve the serving style / menu entered for recipes prepared by someone else.
-- ADD COLUMN IF NOT EXISTS is safe for the existing recipes and does not rewrite
-- or delete any current row.
alter table public.recipes
  add column if not exists serving_style text;

comment on column public.recipes.serving_style is
  'Serving style or menu item for a recipe prepared or served by someone else.';
