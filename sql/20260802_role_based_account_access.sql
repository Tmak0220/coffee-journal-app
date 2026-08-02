-- 月額メンバーシップではなく、登録時に自己申告した users.role を
-- ダッシュボードとRLSの権限基準として使用する。
-- membership_tier は将来用途のため列を残すが、現在の新規登録はすべて free。

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
      and u.role in ('pro', 'owner', 'admin')
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
      and u.role in ('owner', 'admin')
  );
$$;

revoke all on function private.is_paid_member() from public;
revoke all on function private.is_pro_or_business() from public;
revoke all on function private.is_business() from public;
grant execute on function private.is_paid_member() to anon, authenticated;
grant execute on function private.is_pro_or_business() to anon, authenticated;
grant execute on function private.is_business() to anon, authenticated;
