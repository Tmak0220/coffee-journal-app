-- Allow paid members to store their own reusable recipe templates.
-- A template is deliberately not attached to a post.

alter table public.recipes enable row level security;

drop policy if exists "Members create own recipes" on public.recipes;

create policy "Members create own recipes"
on public.recipes
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_paid_member()
  and (
    (
      is_template = true
      and post_id is null
    )
    or
    (
      is_template = false
      and exists (
        select 1
        from public.posts p
        where p.id = recipes.post_id
          and p.user_id = (select auth.uid())
      )
    )
  )
);

