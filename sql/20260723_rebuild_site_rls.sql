-- COFFEE JOURNAL: site-wide RLS rebuild
-- Generated 2026-07-23
--
-- IMPORTANT
--   * Run this file as one statement in Supabase SQL Editor.
--   * The transaction rolls back if any policy cannot be created.
--   * No application rows are inserted, updated, or deleted.
--   * service_role continues to bypass RLS.
--   * Tables with no application use are intentionally left with RLS enabled
--     and no client policy (deny by default).

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- SECURITY DEFINER helpers live outside the exposed public schema. This also
-- prevents recursive users-table RLS lookups.
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and u.role = 'admin'
  );
$$;

create or replace function private.is_paid_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and (u.role = 'admin' or u.membership_tier in ('standard', 'pro', 'business'))
  );
$$;

create or replace function private.is_pro_or_business()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and (u.role = 'admin' or u.membership_tier in ('pro', 'business'))
  );
$$;

create or replace function private.is_business()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users u
    where u.id = (select auth.uid())
      and (u.role = 'admin' or u.membership_tier = 'business')
  );
$$;

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
      and private.is_paid_member()
    );
$$;

revoke all on all functions in schema private from public;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_paid_member() to anon, authenticated;
grant execute on function private.is_pro_or_business() to anon, authenticated;
grant execute on function private.is_business() to anon, authenticated;
grant execute on function private.can_read_content(uuid, text) to anon, authenticated;

-- Remove every existing policy from the in-scope tables. PostgreSQL combines
-- permissive policies with OR, so leaving one old "using (true)" policy would
-- silently defeat stricter replacements.
do $$
declare
  p record;
  t text;
  tables text[] := array[
    'admin_journals', 'admin_notifications',
    'b2b_conversations', 'b2b_messages',
    'blog_bookmarks', 'blog_likes', 'blogs', 'bookmarks',
    'business_inquiries', 'calendar_memos',
    'cupping_modules', 'experts', 'follows', 'gears', 'lab_logs',
    'likes', 'notifications', 'origin_follows', 'origin_post_links', 'origins',
    'post_gears', 'post_processes', 'post_tastes', 'post_varieties',
    'post_views', 'posts',
    'pro_recipe_bookmarks', 'pro_recipe_gears', 'pro_recipes',
    'processes', 'profile_gears', 'recipes',
    'roast_modules', 'shop_api_configs', 'shop_products',
    'site_contents', 'tastes', 'users',
    'varieties', 'water_modules'
  ];
begin
  foreach t in array tables loop
    if to_regclass(format('public.%I', t)) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('alter table public.%I force row level security', t);
    end if;
  end loop;

  for p in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = any(tables)
  loop
    execute format(
      'drop policy %I on %I.%I',
      p.policyname, p.schemaname, p.tablename
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accounts and profile pages
-- ---------------------------------------------------------------------------

create policy "Public reads user profiles"
on public.users for select
to anon, authenticated
using (true);

-- Required for the post-sign-up users row and ordinary account settings.
-- Protected authorization columns are enforced by the trigger below.
create policy "Users insert own account row"
on public.users for insert
to authenticated
with check (id = (select auth.uid()));

create policy "Users update own account row"
on public.users for update
to authenticated
using (id = (select auth.uid()) or private.is_admin())
with check (id = (select auth.uid()) or private.is_admin());

create or replace function private.protect_user_authorization_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    new.role := old.role;
    new.membership_tier := old.membership_tier;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_authorization_fields on public.users;
create trigger protect_user_authorization_fields
before update on public.users
for each row execute function private.protect_user_authorization_fields();

create policy "Public reads approved expert profiles"
on public.experts for select
to anon, authenticated
using (
  is_public is true
  or user_id = (select auth.uid())
  or private.is_admin()
);

create policy "Pro members create own expert profile"
on public.experts for insert
to authenticated
with check (
  private.is_admin()
  or (
    user_id = (select auth.uid())
    and private.is_pro_or_business()
  )
);

create policy "Pro members update own expert profile"
on public.experts for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);

create policy "Admins delete expert profiles"
on public.experts for delete
to authenticated
using (private.is_admin());

-- Master origins have no owner and remain publicly readable. Claimed business
-- pages are public only after approval, while their owner can always preview.
create policy "Public reads origin masters and approved pages"
on public.origins for select
to anon, authenticated
using (
  user_id is null
  or is_public is true
  or user_id = (select auth.uid())
  or private.is_admin()
);

create policy "Business members create own origin profile"
on public.origins for insert
to authenticated
with check (
  private.is_admin()
  or (
    user_id = (select auth.uid())
    and private.is_business()
  )
);

create policy "Business members update own origin profile"
on public.origins for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_business())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_business())
  or private.is_admin()
);

create policy "Admins delete origins"
on public.origins for delete
to authenticated
using (private.is_admin());

-- A profile owner must never be able to approve or publish their own profile.
create or replace function private.protect_profile_approval_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() then
    new.is_approved := old.is_approved;
    new.is_public := old.is_public;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_expert_approval_fields on public.experts;
create trigger protect_expert_approval_fields
before update on public.experts
for each row execute function private.protect_profile_approval_fields();

drop trigger if exists protect_origin_approval_fields on public.origins;
create trigger protect_origin_approval_fields
before update on public.origins
for each row execute function private.protect_profile_approval_fields();

-- ---------------------------------------------------------------------------
-- Published content
-- ---------------------------------------------------------------------------

create policy "Read posts by visibility"
on public.posts for select
to anon, authenticated
using (private.can_read_content(user_id, visibility));

create policy "Members create own posts"
on public.posts for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_paid_member()
);

create policy "Members update own posts"
on public.posts for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
);

create policy "Members delete own posts"
on public.posts for delete
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
);

create policy "Read blogs by visibility"
on public.blogs for select
to anon, authenticated
using (private.can_read_content(user_id, visibility));

create policy "Pro members create own blogs"
on public.blogs for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_pro_or_business()
);

create policy "Pro members update own blogs"
on public.blogs for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);

create policy "Pro members delete own blogs"
on public.blogs for delete
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);

create policy "Read verification posts by visibility"
on public.pro_recipes for select
to anon, authenticated
using (private.can_read_content(user_id, visibility));

create policy "Pro members create own verification posts"
on public.pro_recipes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_pro_or_business()
);

create policy "Pro members update own verification posts"
on public.pro_recipes for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);

create policy "Pro members delete own verification posts"
on public.pro_recipes for delete
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);

create policy "Read calendar entries by visibility"
on public.calendar_memos for select
to anon, authenticated
using (private.can_read_content(user_id, visibility));

create policy "Members create own calendar entries"
on public.calendar_memos for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_paid_member()
);

create policy "Members update own calendar entries"
on public.calendar_memos for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
);

create policy "Members delete own calendar entries"
on public.calendar_memos for delete
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
);

-- recipes is a detail row belonging to a post. Visibility comes from posts;
-- direct ownership is retained for edit screens.
create policy "Read recipes through visible posts"
on public.recipes for select
to anon, authenticated
using (
  user_id = (select auth.uid())
  or private.is_admin()
  or exists (
    select 1
    from public.posts p
    where p.id = recipes.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);

create policy "Members create own recipes"
on public.recipes for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_paid_member()
  and exists (
    select 1 from public.posts p
    where p.id = recipes.post_id and p.user_id = (select auth.uid())
  )
);

create policy "Members update own recipes"
on public.recipes for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
);

create policy "Members delete own recipes"
on public.recipes for delete
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_paid_member())
  or private.is_admin()
);

-- ---------------------------------------------------------------------------
-- Post relation tables: visibility follows the parent post; writes follow the
-- parent owner. This closes the previous authenticated-user-can-edit-any-row gap.
-- ---------------------------------------------------------------------------

create policy "Read origin links through visible posts"
on public.origin_post_links for select
to anon, authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = origin_post_links.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);

create policy "Owners update linked origin posts"
on public.origin_post_links for update
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.origins o
    where o.id = origin_post_links.origin_id
      and o.user_id = (select auth.uid())
      and private.is_business()
  )
)
with check (
  private.is_admin()
  or exists (
    select 1
    from public.origins o
    where o.id = origin_post_links.origin_id
      and o.user_id = (select auth.uid())
      and private.is_business()
  )
);

create policy "Read post gears through visible posts"
on public.post_gears for select
to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_gears.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);
create policy "Owners manage post gears"
on public.post_gears for all
to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_gears.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_gears.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
);

create policy "Read post processes through visible posts"
on public.post_processes for select
to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_processes.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);
create policy "Owners manage post processes"
on public.post_processes for all
to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_processes.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_processes.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
);

create policy "Read post tastes through visible posts"
on public.post_tastes for select
to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_tastes.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);
create policy "Owners manage post tastes"
on public.post_tastes for all
to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_tastes.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_tastes.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
);

create policy "Read post varieties through visible posts"
on public.post_varieties for select
to anon, authenticated
using (
  exists (
    select 1 from public.posts p
    where p.id = post_varieties.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);
create policy "Owners manage post varieties"
on public.post_varieties for all
to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_varieties.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
)
with check (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_varieties.post_id
      and p.user_id = (select auth.uid())
      and private.is_paid_member()
  )
);

-- pro_recipe_gears belongs to pro_recipes.
do $$
declare
  t text;
begin
  foreach t in array array['pro_recipe_gears'] loop
    execute format($policy$
      create policy "Read through visible verification post"
      on public.%I for select to anon, authenticated
      using (
        exists (
          select 1 from public.pro_recipes pr
          where pr.id = %I.pro_recipe_id
            and private.can_read_content(pr.user_id, pr.visibility)
        )
      )
    $policy$, t, t);
    execute format($policy$
      create policy "Owner manages verification module"
      on public.%I for all to authenticated
      using (
        private.is_admin()
        or exists (
          select 1 from public.pro_recipes pr
          where pr.id = %I.pro_recipe_id
            and pr.user_id = (select auth.uid())
            and private.is_pro_or_business()
        )
      )
      with check (
        private.is_admin()
        or exists (
          select 1 from public.pro_recipes pr
          where pr.id = %I.pro_recipe_id
            and pr.user_id = (select auth.uid())
            and private.is_pro_or_business()
        )
      )
    $policy$, t, t, t);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Social actions
-- ---------------------------------------------------------------------------

create policy "Public reads follows"
on public.follows for select
to anon, authenticated
using (true);
create policy "Members create own follows"
on public.follows for insert
to authenticated
with check (
  follower_id = (select auth.uid())
  and follower_id is distinct from following_id
  and private.is_paid_member()
);
create policy "Members delete own follows"
on public.follows for delete
to authenticated
using (follower_id = (select auth.uid()) and private.is_paid_member());

create policy "Public reads origin follows"
on public.origin_follows for select
to anon, authenticated
using (true);
create policy "Members create own origin follows"
on public.origin_follows for insert
to authenticated
with check (user_id = (select auth.uid()) and private.is_paid_member());
create policy "Members delete own origin follows"
on public.origin_follows for delete
to authenticated
using (user_id = (select auth.uid()) and private.is_paid_member());

create policy "Public reads post likes"
on public.likes for select
to anon, authenticated
using (true);
create policy "Members create own post likes"
on public.likes for insert
to authenticated
with check (user_id = (select auth.uid()) and private.is_paid_member());
create policy "Members delete own post likes"
on public.likes for delete
to authenticated
using (user_id = (select auth.uid()) and private.is_paid_member());

do $$
begin
  if to_regclass('public.blog_likes') is not null then
    execute 'create policy "Public reads blog likes" on public.blog_likes for select to anon, authenticated using (true)';
    execute 'create policy "Members create own blog likes" on public.blog_likes for insert to authenticated with check (user_id = (select auth.uid()) and private.is_paid_member())';
    execute 'create policy "Members delete own blog likes" on public.blog_likes for delete to authenticated using (user_id = (select auth.uid()) and private.is_paid_member())';
  end if;
end;
$$;

create policy "Members manage own post bookmarks"
on public.bookmarks for all
to authenticated
using (user_id = (select auth.uid()) and private.is_paid_member())
with check (user_id = (select auth.uid()) and private.is_paid_member());

create policy "Members manage own blog bookmarks"
on public.blog_bookmarks for all
to authenticated
using (user_id = (select auth.uid()) and private.is_paid_member())
with check (user_id = (select auth.uid()) and private.is_paid_member());

create policy "Members manage own verification bookmarks"
on public.pro_recipe_bookmarks for all
to authenticated
using (user_id = (select auth.uid()) and private.is_paid_member())
with check (user_id = (select auth.uid()) and private.is_paid_member());

-- View events are write-only to clients. Aggregates should be exposed through
-- a controlled RPC rather than allowing everyone to enumerate viewer IDs.
create policy "Authenticated users record own post views"
on public.post_views for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_paid_member()
);
create policy "Owners and admins read post views"
on public.post_views for select
to authenticated
using (
  private.is_admin()
  or exists (
    select 1 from public.posts p
    where p.id = post_views.post_id and p.user_id = (select auth.uid())
  )
);

-- ---------------------------------------------------------------------------
-- Announcements, requests, journal, and B2B
-- ---------------------------------------------------------------------------

create policy "Read eligible broadcast notifications"
on public.notifications for select
to anon, authenticated
using (
  user_id = (select auth.uid())
  or private.is_admin()
  or coalesce(target_group, 'all') = 'all'
  or (
    target_group = 'premium'
    and private.is_paid_member()
  )
);

create policy "Pro members create own broadcasts"
on public.notifications for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_pro_or_business()
);

create policy "Authors manage own broadcasts"
on public.notifications for update
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
)
with check (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);
create policy "Authors delete own broadcasts"
on public.notifications for delete
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);

create policy "Users read own admin requests"
on public.admin_notifications for select
to authenticated
using (user_id = (select auth.uid()) or private.is_admin());
create policy "Members create own admin requests"
on public.admin_notifications for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_paid_member()
);
create policy "Admins manage admin requests"
on public.admin_notifications for update
to authenticated
using (private.is_admin())
with check (private.is_admin());
create policy "Admins delete admin requests"
on public.admin_notifications for delete
to authenticated
using (private.is_admin());

create policy "Public reads published journal"
on public.admin_journals for select
to anon, authenticated
using (is_published is true or private.is_admin());
create policy "Admins create journal"
on public.admin_journals for insert
to authenticated
with check (private.is_admin());
create policy "Admins update journal"
on public.admin_journals for update
to authenticated
using (private.is_admin())
with check (private.is_admin());
create policy "Admins delete journal"
on public.admin_journals for delete
to authenticated
using (private.is_admin());

create policy "Participants read B2B conversations"
on public.b2b_conversations for select
to authenticated
using (
  (select auth.uid()) in (sender_id, recipient_id)
  and private.is_pro_or_business()
);
create policy "Participants update B2B conversation status"
on public.b2b_conversations for update
to authenticated
using (
  (select auth.uid()) in (sender_id, recipient_id)
  and private.is_pro_or_business()
)
with check (
  (select auth.uid()) in (sender_id, recipient_id)
  and private.is_pro_or_business()
);
create policy "Participants read B2B messages"
on public.b2b_messages for select
to authenticated
using (
  private.is_pro_or_business()
  and exists (
    select 1 from public.b2b_conversations c
    where c.id = b2b_messages.conversation_id
      and (select auth.uid()) in (c.sender_id, c.recipient_id)
  )
);

-- B2B inserts intentionally have no direct policies. The existing
-- start_b2b_inquiry/send_b2b_message SECURITY DEFINER RPCs validate membership,
-- recipient, participant, length, and relationship before writing.

-- ---------------------------------------------------------------------------
-- Public master data and profile gear selections
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['gears', 'processes', 'tastes', 'varieties'] loop
    execute format(
      'create policy "Public reads master data" on public.%I for select to anon, authenticated using (true)',
      t
    );
    execute format(
      'create policy "Admins create master data" on public.%I for insert to authenticated with check (private.is_admin())',
      t
    );
    execute format(
      'create policy "Admins update master data" on public.%I for update to authenticated using (private.is_admin()) with check (private.is_admin())',
      t
    );
    execute format(
      'create policy "Admins delete master data" on public.%I for delete to authenticated using (private.is_admin())',
      t
    );
  end loop;
end;
$$;

create policy "Public reads profile gears"
on public.profile_gears for select
to anon, authenticated
using (true);
create policy "Profile owners create gear selections"
on public.profile_gears for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and private.is_pro_or_business()
);
create policy "Profile owners delete gear selections"
on public.profile_gears for delete
to authenticated
using (
  (user_id = (select auth.uid()) and private.is_pro_or_business())
  or private.is_admin()
);

create policy "Public reads site content"
on public.site_contents for select
to anon, authenticated
using (true);
create policy "Admins create site content"
on public.site_contents for insert
to authenticated
with check (private.is_admin());
create policy "Admins update site content"
on public.site_contents for update
to authenticated
using (private.is_admin())
with check (private.is_admin());
create policy "Admins delete site content"
on public.site_contents for delete
to authenticated
using (private.is_admin());

-- Synced products may be shown on the owning public business page. OAuth
-- credentials remain inaccessible to all browser clients.
create policy "Public reads active shop products"
on public.shop_products for select
to anon, authenticated
using (
  is_active is true
  or user_id = (select auth.uid())
  or private.is_admin()
);

-- shop_api_configs: intentionally no client policy.
-- business_inquiries: legacy table, intentionally no client policy.
-- lab_logs: legacy table, intentionally no client policy.
-- All remaining legacy/private tables are accessible to service_role and table owners only.

-- The two existing B2B SECURITY DEFINER RPCs are exposed deliberately; all
-- other users are denied execution. Their bodies already validate the caller,
-- tier, recipient/participants, and message length.
do $$
begin
  if to_regprocedure('public.start_b2b_inquiry(integer,text,text,text)') is not null then
    execute 'revoke all on function public.start_b2b_inquiry(integer, text, text, text) from public';
    execute 'grant execute on function public.start_b2b_inquiry(integer, text, text, text) to authenticated';
  end if;
  if to_regprocedure('public.send_b2b_message(uuid,text)') is not null then
    execute 'revoke all on function public.send_b2b_message(uuid, text) from public';
    execute 'grant execute on function public.send_b2b_message(uuid, text) to authenticated';
  end if;
end;
$$;

commit;

-- Verification query (run after the migration):
--
-- select schemaname, tablename, policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public'
-- order by tablename, policyname;
--
-- select n.nspname as schema_name, c.relname as table_name,
--        c.relrowsecurity as rls_enabled, c.relforcerowsecurity as rls_forced
-- from pg_class c
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public' and c.relkind = 'r'
-- order by c.relname;
