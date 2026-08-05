begin;

-- English records represent the same publication as their Japanese source.
-- Only records that are explicitly paired by translation_group_id are updated.

update public.posts as en
set created_at = ja.created_at
from (
  select distinct on (translation_group_id)
    translation_group_id,
    created_at
  from public.posts
  where lang = 'ja'
    and translation_group_id is not null
  order by translation_group_id, created_at asc, id
) as ja
where en.lang = 'en'
  and en.translation_group_id = ja.translation_group_id
  and en.created_at is distinct from ja.created_at;

update public.blogs as en
set created_at = ja.created_at
from (
  select distinct on (translation_group_id)
    translation_group_id,
    created_at
  from public.blogs
  where lang = 'ja'
    and translation_group_id is not null
  order by translation_group_id, created_at asc, id
) as ja
where en.lang = 'en'
  and en.translation_group_id = ja.translation_group_id
  and en.created_at is distinct from ja.created_at;

update public.pro_recipes as en
set created_at = ja.created_at
from (
  select distinct on (translation_group_id)
    translation_group_id,
    created_at
  from public.pro_recipes
  where lang = 'ja'
    and translation_group_id is not null
  order by translation_group_id, created_at asc, id
) as ja
where en.lang = 'en'
  and en.translation_group_id = ja.translation_group_id
  and en.created_at is distinct from ja.created_at;

update public.admin_journals as en
set created_at = ja.created_at
from (
  select distinct on (translation_group_id)
    translation_group_id,
    created_at
  from public.admin_journals
  where lang = 'ja'
    and translation_group_id is not null
  order by translation_group_id, created_at asc, id
) as ja
where en.lang = 'en'
  and en.translation_group_id = ja.translation_group_id
  and en.created_at is distinct from ja.created_at;

commit;
