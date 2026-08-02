-- 一般利用者が選べるアカウント種別を user / pro / owner に統一する。
-- admin は運営専用の内部ロールとして維持する。

begin;

update public.users
set role = 'pro', updated_at = now()
where role = 'barista';

do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%role%'
  loop
    execute format('alter table public.users drop constraint %I', constraint_record.conname);
  end loop;
end;
$$;

alter table public.users
  add constraint users_role_check
  check (role in ('user', 'pro', 'owner', 'admin'));

-- 通常ユーザーは user / pro / owner の間だけ自己変更できる。
-- adminへの昇格、adminからの変更、停止状態の変更は引き続き保護する。
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
  ) into caller_is_admin;

  if (select auth.uid()) is not null and not caller_is_admin then
    if old.role = 'admin' or new.role not in ('user', 'pro', 'owner') then
      new.role := old.role;
    end if;
    new.is_active := old.is_active;
    new.deactivated_at := old.deactivated_at;
    new.deactivation_reason := old.deactivation_reason;
  end if;
  return new;
end;
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

commit;
