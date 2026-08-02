-- role ベースの権限へ移行済みのため、旧 membership_tier を撤去する。
-- notifications の配信対象は target_group を使用する。
-- 実行前に 20260802_audit_membership_tier_dependencies.sql を実行し、
-- RLS・関数・ビューに membership_tier 参照がないことを確認すること。

begin;

-- notifications.membership_tier に付いているチェック制約を、名称に依存せず削除する。
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public'
      and rel.relname = 'notifications'
      and pg_get_constraintdef(con.oid) ilike '%membership_tier%'
  loop
    execute format(
      'alter table public.notifications drop constraint if exists %I',
      constraint_record.conname
    );
  end loop;
end
$$;

alter table if exists public.notifications
  drop column if exists membership_tier;

alter table if exists public.users
  drop column if exists membership_tier;

commit;
