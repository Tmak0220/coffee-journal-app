-- COFFEE JOURNAL: account suspension state and deletion cascades
-- Generated 2026-07-23
--
-- is_active and is_actived must NOT both be created. They express the same
-- state and will eventually disagree. This migration uses:
--   is_active       current account availability
--   deactivated_at  when the account was suspended
--
-- This migration changes foreign-key actions but does not delete any rows.
-- Run it during a maintenance window because changing foreign keys locks the
-- affected tables while PostgreSQL validates the replacement constraints.

begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

alter table public.users
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivation_reason text;

-- ADD COLUMN IF NOT EXISTS does not repair an older nullable/inconsistent
-- version of the column. Normalize existing rows before validating the check.
alter table public.users
  alter column is_active set default true;

update public.users
set is_active = true
where is_active is null;

update public.users
set deactivated_at = coalesce(deactivated_at, now())
where is_active is false
  and deactivated_at is null;

update public.users
set
  deactivated_at = null,
  deactivation_reason = null
where is_active is true
  and (
    deactivated_at is not null
    or deactivation_reason is not null
  );

alter table public.users
  alter column is_active set not null;

comment on column public.users.is_active is
  'Whether the application account may use member features. False preserves the account and content but suspends access.';
comment on column public.users.deactivated_at is
  'Timestamp at which the application account was suspended. Null while active.';
comment on column public.users.deactivation_reason is
  'Administrative reason for account suspension. Do not expose on public profile pages.';

alter table public.users
  drop constraint if exists users_active_timestamp_consistency;
alter table public.users
  add constraint users_active_timestamp_consistency
  check (
    (is_active is true and deactivated_at is null)
    or
    (is_active is false and deactivated_at is not null)
  );

create index if not exists users_is_active_idx
  on public.users (is_active);

-- Keep is_active and deactivated_at consistent even when an administrator only
-- changes is_active.
create or replace function private.sync_account_active_state()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_active is false and old.is_active is true then
    new.deactivated_at := coalesce(new.deactivated_at, now());
  elsif new.is_active is true then
    new.deactivated_at := null;
    new.deactivation_reason := null;
  end if;
  return new;
end;
$$;

drop trigger if exists sync_account_active_state on public.users;
create trigger sync_account_active_state
before update of is_active on public.users
for each row execute function private.sync_account_active_state();

-- A normal user must not be able to reactivate themselves, change their tier,
-- or promote themselves. Administrators and service_role remain able to do so.
create or replace function private.protect_user_authorization_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_is_admin boolean;
begin
  select exists (
    select 1
    from public.users administrator
    where administrator.id = (select auth.uid())
      and administrator.role = 'admin'
      and administrator.is_active is true
  )
  into caller_is_admin;

  if (select auth.uid()) is not null and not caller_is_admin then
    new.role := old.role;
    new.membership_tier := old.membership_tier;
    new.is_active := old.is_active;
    new.deactivated_at := old.deactivated_at;
    new.deactivation_reason := old.deactivation_reason;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_user_authorization_fields on public.users;
create trigger protect_user_authorization_fields
before update on public.users
for each row execute function private.protect_user_authorization_fields();

-- Membership helpers must treat a suspended account exactly like a free,
-- unauthorised account. These replace the helpers from the site-wide RLS
-- migration without changing their signatures.
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
      and u.is_active is true
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
      and u.is_active is true
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
      and u.is_active is true
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
      and u.is_active is true
      and (u.role = 'admin' or u.membership_tier = 'business')
  );
$$;

revoke all on function private.is_admin() from public;
revoke all on function private.is_paid_member() from public;
revoke all on function private.is_pro_or_business() from public;
revoke all on function private.is_business() from public;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.is_paid_member() to anon, authenticated;
grant execute on function private.is_pro_or_business() to anon, authenticated;
grant execute on function private.is_business() to anon, authenticated;

-- Replace every existing users UPDATE/ALL policy. Otherwise an older permissive
-- policy would be OR-combined and suspended users could still edit their row.
do $$
declare
  p record;
begin
  for p in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and cmd in ('UPDATE', 'ALL')
  loop
    execute format('drop policy %I on public.users', p.policyname);
  end loop;
end;
$$;

create policy "Active users update own account row"
on public.users for update
to authenticated
using (
  private.is_admin()
  or (
    id = (select auth.uid())
    and is_active is true
  )
)
with check (
  private.is_admin()
  or (
    id = (select auth.uid())
    and is_active is true
  )
);

-- Admin-only RPC used after approving an account-suspension/reactivation
-- request. It changes the application state; the server must additionally ban
-- or unban the corresponding Supabase Auth user through the Auth Admin API.
create or replace function public.admin_set_account_active(
  target_user_id uuid,
  active boolean,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'Administrator permission required'
      using errcode = '42501';
  end if;

  update public.users
  set
    is_active = active,
    deactivated_at = case when active then null else now() end,
    deactivation_reason = case
      when active then null
      else nullif(btrim(reason), '')
    end
  where id = target_user_id;

  if not found then
    raise exception 'Account not found'
      using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_set_account_active(uuid, boolean, text) from public;
grant execute on function public.admin_set_account_active(uuid, boolean, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- Account deletion cascade
-- ---------------------------------------------------------------------------
-- If public.users.id is linked to auth.users.id, deleting the Supabase Auth
-- identity must delete the application account row too.
do $$
declare
  fk record;
  definition text;
begin
  for fk in
    select
      constraint_record.oid,
      constraint_record.conname,
      constraint_record.conrelid::regclass as child_table
    from pg_constraint constraint_record
    where constraint_record.contype = 'f'
      and constraint_record.conrelid = 'public.users'::regclass
      and constraint_record.confrelid = 'auth.users'::regclass
  loop
    definition := pg_get_constraintdef(fk.oid);
    definition := regexp_replace(
      definition,
      '\s+ON DELETE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'i'
    );
    if definition ~* '\s+(DEFERRABLE|NOT VALID)' then
      definition := regexp_replace(
        definition,
        '\s+(DEFERRABLE|NOT VALID)',
        ' ON DELETE CASCADE \1',
        'i'
      );
    else
      definition := definition || ' ON DELETE CASCADE';
    end if;

    execute format(
      'alter table %s drop constraint %I',
      fk.child_table,
      fk.conname
    );
    execute format(
      'alter table %s add constraint %I %s',
      fk.child_table,
      fk.conname,
      definition
    );
  end loop;
end;
$$;

-- All direct user-owned data is deleted with public.users.
--
-- Exception: origins.user_id becomes NULL. An origins row can be shared master
-- data referenced by other users' posts, so deleting that row automatically
-- could erase or invalidate unrelated content. The deletion API should
-- separately clear owner-profile-only fields or delete a confirmed unshared
-- owner-created origin after checking references.

do $$
declare
  fk record;
  definition text;
  delete_action text;
begin
  for fk in
    select
      constraint_record.oid,
      constraint_record.conname,
      constraint_record.conrelid,
      constraint_record.conrelid::regclass as child_table
    from pg_constraint constraint_record
    where constraint_record.contype = 'f'
      and constraint_record.confrelid = 'public.users'::regclass
  loop
    delete_action := case
      when fk.conrelid = 'public.origins'::regclass then 'SET NULL'
      else 'CASCADE'
    end;

    definition := pg_get_constraintdef(fk.oid);
    definition := regexp_replace(
      definition,
      '\s+ON DELETE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'i'
    );

    -- DEFERRABLE and NOT VALID must remain after the referential actions.
    if definition ~* '\s+(DEFERRABLE|NOT VALID)' then
      definition := regexp_replace(
        definition,
        '\s+(DEFERRABLE|NOT VALID)',
        format(' ON DELETE %s \1', delete_action),
        'i'
      );
    else
      definition := definition || format(' ON DELETE %s', delete_action);
    end if;

    execute format(
      'alter table %s drop constraint %I',
      fk.child_table,
      fk.conname
    );
    execute format(
      'alter table %s add constraint %I %s',
      fk.child_table,
      fk.conname,
      definition
    );
  end loop;
end;
$$;

-- When a top-level content row is deleted by the users cascade, every junction,
-- bookmark, like, view, recipe detail, and verification module must disappear.
do $$
declare
  fk record;
  definition text;
begin
  for fk in
    select
      constraint_record.oid,
      constraint_record.conname,
      constraint_record.conrelid::regclass as child_table
    from pg_constraint constraint_record
    where constraint_record.contype = 'f'
      and constraint_record.confrelid in (
        to_regclass('public.posts'),
        to_regclass('public.blogs'),
        to_regclass('public.pro_recipes'),
        to_regclass('public.recipes'),
        to_regclass('public.b2b_conversations')
      )
  loop
    definition := pg_get_constraintdef(fk.oid);
    definition := regexp_replace(
      definition,
      '\s+ON DELETE\s+(NO ACTION|RESTRICT|CASCADE|SET NULL|SET DEFAULT)',
      '',
      'i'
    );

    if definition ~* '\s+(DEFERRABLE|NOT VALID)' then
      definition := regexp_replace(
        definition,
        '\s+(DEFERRABLE|NOT VALID)',
        ' ON DELETE CASCADE \1',
        'i'
      );
    else
      definition := definition || ' ON DELETE CASCADE';
    end if;

    execute format(
      'alter table %s drop constraint %I',
      fk.child_table,
      fk.conname
    );
    execute format(
      'alter table %s add constraint %I %s',
      fk.child_table,
      fk.conname,
      definition
    );
  end loop;
end;
$$;

commit;

-- ---------------------------------------------------------------------------
-- Verification queries
-- ---------------------------------------------------------------------------
-- Direct references to users. origins must be SET NULL; other owned tables
-- should normally be CASCADE.
--
-- select
--   conrelid::regclass as child_table,
--   conname,
--   pg_get_constraintdef(oid) as definition
-- from pg_constraint
-- where contype = 'f'
--   and confrelid = 'public.users'::regclass
-- order by conrelid::regclass::text, conname;
--
-- Content child relationships should be ON DELETE CASCADE.
--
-- select
--   conrelid::regclass as child_table,
--   confrelid::regclass as parent_table,
--   conname,
--   pg_get_constraintdef(oid) as definition
-- from pg_constraint
-- where contype = 'f'
--   and confrelid in (
--     to_regclass('public.posts'),
--     to_regclass('public.blogs'),
--     to_regclass('public.pro_recipes'),
--     to_regclass('public.recipes'),
--     to_regclass('public.b2b_conversations')
--   )
-- order by confrelid::regclass::text, conrelid::regclass::text;
