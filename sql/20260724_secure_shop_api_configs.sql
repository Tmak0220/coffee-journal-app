begin;

alter table public.shop_api_configs
  add column if not exists refresh_token_expires_at timestamptz,
  add column if not exists last_synced_at timestamptz,
  add column if not exists last_sync_error text;

-- Normalize existing Shopify rows so the public shop URL can be reused safely.
update public.shop_api_configs
set shop_url = 'https://' || store_domain
where platform_type = 'shopify'
  and store_domain is not null
  and nullif(btrim(shop_url), '') is null;

-- Rebuild the ownership FK explicitly. Deleting an account must also remove
-- every stored OAuth credential.
alter table public.shop_api_configs
  drop constraint if exists shop_api_configs_user_id_fkey;

alter table public.shop_api_configs
  add constraint shop_api_configs_user_id_fkey
  foreign key (user_id)
  references public.users(id)
  on delete cascade;

-- Keep one credential set per user/platform and reject unsupported providers.
create unique index if not exists shop_api_configs_user_platform_key
  on public.shop_api_configs (user_id, platform_type);

alter table public.shop_api_configs
  drop constraint if exists shop_api_configs_platform_type_check;

alter table public.shop_api_configs
  add constraint shop_api_configs_platform_type_check
  check (platform_type in ('base', 'shopify', 'square'));

alter table public.shop_api_configs
  drop constraint if exists shop_api_configs_access_token_not_blank;

alter table public.shop_api_configs
  add constraint shop_api_configs_access_token_not_blank
  check (length(btrim(access_token)) > 0);

create or replace function public.set_shop_api_configs_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

revoke all on function public.set_shop_api_configs_updated_at() from public;

drop trigger if exists set_shop_api_configs_updated_at
  on public.shop_api_configs;

create trigger set_shop_api_configs_updated_at
before update on public.shop_api_configs
for each row
execute function public.set_shop_api_configs_updated_at();

-- OAuth tokens must never be readable or writable from a browser client.
-- All application access goes through authenticated server routes using the
-- service-role client.
alter table public.shop_api_configs enable row level security;
alter table public.shop_api_configs force row level security;

do $$
declare
  policy_record record;
begin
  for policy_record in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'shop_api_configs'
  loop
    execute format(
      'drop policy if exists %I on public.shop_api_configs',
      policy_record.policyname
    );
  end loop;
end;
$$;

revoke all on table public.shop_api_configs from anon, authenticated;

commit;

-- Verification:
-- select policyname, cmd, roles, qual, with_check
-- from pg_policies
-- where schemaname = 'public' and tablename = 'shop_api_configs';
-- Expected result: zero rows.
