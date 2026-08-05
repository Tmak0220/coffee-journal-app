begin;

alter table public.posts add column if not exists translation_group_id uuid;
alter table public.blogs add column if not exists translation_group_id uuid;
alter table public.pro_recipes add column if not exists translation_group_id uuid;
alter table public.admin_journals add column if not exists translation_group_id uuid;

create unique index if not exists posts_translation_group_lang_uidx
  on public.posts (translation_group_id, lang) where translation_group_id is not null;
create unique index if not exists blogs_translation_group_lang_uidx
  on public.blogs (translation_group_id, lang) where translation_group_id is not null;
create unique index if not exists pro_recipes_translation_group_lang_uidx
  on public.pro_recipes (translation_group_id, lang) where translation_group_id is not null;
create unique index if not exists admin_journals_translation_group_lang_uidx
  on public.admin_journals (translation_group_id, lang) where translation_group_id is not null;

comment on column public.posts.translation_group_id is 'Groups Japanese content with its translated English record.';
comment on column public.blogs.translation_group_id is 'Groups Japanese content with its translated English record.';
comment on column public.pro_recipes.translation_group_id is 'Groups Japanese content with its translated English record.';
comment on column public.admin_journals.translation_group_id is 'Groups Japanese content with its translated English record.';

commit;
