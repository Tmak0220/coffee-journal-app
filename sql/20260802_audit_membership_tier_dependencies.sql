-- membership_tier を削除する前に、Supabase SQL Editor で実行する読み取り専用監査。
-- いずれかの結果が返る間は、列を削除しないこと。

-- RLS policies
select
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
from pg_policies
where coalesce(qual, '') ilike '%membership_tier%'
   or coalesce(with_check, '') ilike '%membership_tier%'
order by schemaname, tablename, policyname;

-- Functions and triggers
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
-- pg_get_functiondef() は array_agg などの集約関数には使用できないため、
-- 通常関数 (f) とプロシージャ (p) だけを対象にする。
where p.prokind in ('f', 'p')
  and pg_get_functiondef(p.oid) ilike '%membership_tier%'
order by n.nspname, p.proname;

-- Views
select schemaname, viewname
from pg_views
where definition ilike '%membership_tier%'
order by schemaname, viewname;

-- Constraints and indexes
select
  n.nspname as schema_name,
  c.relname as relation_name,
  con.conname as constraint_name,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where pg_get_constraintdef(con.oid) ilike '%membership_tier%'
order by n.nspname, c.relname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where indexdef ilike '%membership_tier%'
order by schemaname, tablename, indexname;
