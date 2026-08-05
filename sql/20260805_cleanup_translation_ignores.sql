begin;

-- Make this migration safe to run even when the preceding table migration has
-- not been executed yet.
create table if not exists public.admin_translation_ignores (
  resource text not null,
  resource_id text not null,
  ignored_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint admin_translation_ignores_pkey primary key (resource, resource_id),
  constraint admin_translation_ignores_resource_check
    check (resource in ('posts', 'blogs', 'pro_recipes', 'admin_journals'))
);

alter table public.admin_translation_ignores enable row level security;

create index if not exists admin_translation_ignores_created_at_idx
  on public.admin_translation_ignores (created_at desc);

-- Remove an exclusion marker whenever its source content is deleted.
-- The source content itself remains the authority for whether a translation
-- candidate exists; this trigger only prevents stale exclusion rows.
create or replace function public.cleanup_admin_translation_ignore()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.admin_translation_ignores
  where resource = TG_TABLE_NAME
    and resource_id = OLD.id::text;
  return OLD;
end;
$$;

drop trigger if exists cleanup_translation_ignore_after_posts_delete on public.posts;
create trigger cleanup_translation_ignore_after_posts_delete
after delete on public.posts
for each row execute function public.cleanup_admin_translation_ignore();

drop trigger if exists cleanup_translation_ignore_after_blogs_delete on public.blogs;
create trigger cleanup_translation_ignore_after_blogs_delete
after delete on public.blogs
for each row execute function public.cleanup_admin_translation_ignore();

drop trigger if exists cleanup_translation_ignore_after_pro_recipes_delete on public.pro_recipes;
create trigger cleanup_translation_ignore_after_pro_recipes_delete
after delete on public.pro_recipes
for each row execute function public.cleanup_admin_translation_ignore();

drop trigger if exists cleanup_translation_ignore_after_admin_journals_delete on public.admin_journals;
create trigger cleanup_translation_ignore_after_admin_journals_delete
after delete on public.admin_journals
for each row execute function public.cleanup_admin_translation_ignore();

-- Clean up exclusions whose source records were deleted before these triggers
-- were installed.
delete from public.admin_translation_ignores as ignored
where ignored.resource = 'posts'
  and not exists (
    select 1 from public.posts as source
    where source.id::text = ignored.resource_id
  );

delete from public.admin_translation_ignores as ignored
where ignored.resource = 'blogs'
  and not exists (
    select 1 from public.blogs as source
    where source.id::text = ignored.resource_id
  );

delete from public.admin_translation_ignores as ignored
where ignored.resource = 'pro_recipes'
  and not exists (
    select 1 from public.pro_recipes as source
    where source.id::text = ignored.resource_id
  );

delete from public.admin_translation_ignores as ignored
where ignored.resource = 'admin_journals'
  and not exists (
    select 1 from public.admin_journals as source
    where source.id::text = ignored.resource_id
  );

commit;
