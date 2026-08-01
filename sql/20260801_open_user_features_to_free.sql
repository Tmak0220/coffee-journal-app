begin;

-- `members` is an authenticated-account visibility, not a paid-plan visibility.
create or replace function private.can_read_content(
  owner_id uuid,
  content_visibility text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    owner_id = (select auth.uid())
    or private.is_admin()
    or content_visibility = 'public'
    or (
      content_visibility = 'members'
      and (select auth.uid()) is not null
    );
$$;

grant execute on function private.can_read_content(uuid, text) to anon, authenticated;

-- Free accounts can create, edit and delete their own user posts and calendars.
drop policy if exists "Members create own posts" on public.posts;
drop policy if exists "Members update own posts" on public.posts;
drop policy if exists "Members delete own posts" on public.posts;
create policy "Authenticated users create own posts" on public.posts for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Authenticated users update own posts" on public.posts for update to authenticated
using (user_id = (select auth.uid()) or private.is_admin())
with check (user_id = (select auth.uid()) or private.is_admin());
create policy "Authenticated users delete own posts" on public.posts for delete to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists "Members create own calendar entries" on public.calendar_memos;
drop policy if exists "Members update own calendar entries" on public.calendar_memos;
drop policy if exists "Members delete own calendar entries" on public.calendar_memos;
create policy "Authenticated users create own calendar entries" on public.calendar_memos for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Authenticated users update own calendar entries" on public.calendar_memos for update to authenticated
using (user_id = (select auth.uid()) or private.is_admin())
with check (user_id = (select auth.uid()) or private.is_admin());
create policy "Authenticated users delete own calendar entries" on public.calendar_memos for delete to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

drop policy if exists "Members create own recipes" on public.recipes;
drop policy if exists "Members update own recipes" on public.recipes;
drop policy if exists "Members delete own recipes" on public.recipes;
create policy "Authenticated users create own recipes" on public.recipes for insert to authenticated
with check (
  user_id = (select auth.uid())
  and (
    (is_template = true and post_id is null)
    or
    (is_template = false and exists (
      select 1 from public.posts p
      where p.id = recipes.post_id and p.user_id = (select auth.uid())
    ))
  )
);
create policy "Authenticated users update own recipes" on public.recipes for update to authenticated
using (user_id = (select auth.uid()) or private.is_admin())
with check (user_id = (select auth.uid()) or private.is_admin());
create policy "Authenticated users delete own recipes" on public.recipes for delete to authenticated
using (user_id = (select auth.uid()) or private.is_admin());

-- Child rows inherit write authority from the parent post owner.
do $$
declare
  relation_table text;
begin
  foreach relation_table in array array['post_gears', 'post_processes', 'post_tastes', 'post_varieties'] loop
    execute format('drop policy if exists %I on public.%I',
      case relation_table
        when 'post_gears' then 'Owners manage post gears'
        when 'post_processes' then 'Owners manage post processes'
        when 'post_tastes' then 'Owners manage post tastes'
        else 'Owners manage post varieties'
      end,
      relation_table
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.is_admin() or exists (select 1 from public.posts p where p.id = %I.post_id and p.user_id = (select auth.uid()))) with check (private.is_admin() or exists (select 1 from public.posts p where p.id = %I.post_id and p.user_id = (select auth.uid())))',
      'Authenticated owners manage ' || relation_table,
      relation_table,
      relation_table,
      relation_table
    );
  end loop;
end;
$$;

-- Follow, like and bookmark actions are available to every authenticated account.
drop policy if exists "Members create own follows" on public.follows;
drop policy if exists "Members delete own follows" on public.follows;
create policy "Authenticated users create own follows" on public.follows for insert to authenticated
with check (follower_id = (select auth.uid()) and follower_id is distinct from following_id);
create policy "Authenticated users delete own follows" on public.follows for delete to authenticated
using (follower_id = (select auth.uid()));

drop policy if exists "Members create own origin follows" on public.origin_follows;
drop policy if exists "Members delete own origin follows" on public.origin_follows;
create policy "Authenticated users create own origin follows" on public.origin_follows for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Authenticated users delete own origin follows" on public.origin_follows for delete to authenticated
using (user_id = (select auth.uid()));

drop policy if exists "Members create own post likes" on public.likes;
drop policy if exists "Members delete own post likes" on public.likes;
create policy "Authenticated users create own post likes" on public.likes for insert to authenticated
with check (user_id = (select auth.uid()));
create policy "Authenticated users delete own post likes" on public.likes for delete to authenticated
using (user_id = (select auth.uid()));

do $$
begin
  if to_regclass('public.blog_likes') is not null then
    drop policy if exists "Members create own blog likes" on public.blog_likes;
    drop policy if exists "Members delete own blog likes" on public.blog_likes;
    create policy "Authenticated users create own blog likes" on public.blog_likes for insert to authenticated
      with check (user_id = (select auth.uid()));
    create policy "Authenticated users delete own blog likes" on public.blog_likes for delete to authenticated
      using (user_id = (select auth.uid()));
  end if;
end;
$$;

drop policy if exists "Members manage own post bookmarks" on public.bookmarks;
drop policy if exists "Members manage own blog bookmarks" on public.blog_bookmarks;
drop policy if exists "Members manage own verification bookmarks" on public.pro_recipe_bookmarks;
drop policy if exists "Members manage own pro recipe bookmarks" on public.pro_recipe_bookmarks;
create policy "Authenticated users manage own post bookmarks" on public.bookmarks for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Authenticated users manage own blog bookmarks" on public.blog_bookmarks for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "Authenticated users manage own verification bookmarks" on public.pro_recipe_bookmarks for all to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

commit;
