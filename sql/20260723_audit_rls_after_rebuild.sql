-- Read-only checks to run after 20260723_rebuild_site_rls.sql.

-- 1. Public-schema tables where RLS is disabled.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity
order by c.relname;

-- 2. RLS-enabled tables with no policies. These are intentionally deny-by-
-- default only for the legacy/staging/secret tables documented in the rebuild.
select
  n.nspname as schema_name,
  c.relname as table_name
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policies p
  on p.schemaname = n.nspname
 and p.tablename = c.relname
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relrowsecurity
group by n.nspname, c.relname
having count(p.policyname) = 0
order by c.relname;

-- 3. Exact duplicate policy definitions.
select
  schemaname,
  tablename,
  cmd,
  roles,
  qual,
  with_check,
  count(*) as duplicate_count,
  array_agg(policyname order by policyname) as policies
from pg_policies
where schemaname = 'public'
group by schemaname, tablename, cmd, roles, qual, with_check
having count(*) > 1
order by tablename, cmd;

-- 4. Broad write policies requiring manual review. The rebuilt policy set
-- should return no unconditional INSERT/UPDATE/DELETE/ALL policy.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (
    coalesce(trim(qual), '') in ('true', '(true)')
    or coalesce(trim(with_check), '') in ('true', '(true)')
  )
order by tablename, policyname;

-- 5. SECURITY DEFINER functions exposed in the public schema. Each result must
-- have a deliberately restricted EXECUTE grant and a safe search_path.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.proconfig as function_settings,
  p.proacl as access_control
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
order by p.proname;

-- 6. Sensitive users columns. Row policies do not provide column-level
-- secrecy. Until public reads use a dedicated safe view, confirm that client
-- code never selects email or other private columns for another account.
select
  table_schema,
  table_name,
  column_name,
  data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'users'
  and column_name in (
    'email', 'phone', 'stripe_customer_id', 'billing_address',
    'role', 'membership_tier'
  )
order by ordinal_position;
