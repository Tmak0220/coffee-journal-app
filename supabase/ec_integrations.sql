create table if not exists public.shop_api_configs (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  platform_type text not null check (platform_type in ('base','shopify','square')),
  access_token text not null, refresh_token text, expires_at timestamptz, store_domain text, external_account_id text,
  scopes text[] not null default '{}', created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, platform_type)
);
alter table public.shop_api_configs add column if not exists expires_at timestamptz;
alter table public.shop_api_configs add column if not exists store_domain text;
alter table public.shop_api_configs add column if not exists external_account_id text;
alter table public.shop_api_configs add column if not exists scopes text[] not null default '{}';
alter table public.shop_api_configs add column if not exists updated_at timestamptz not null default now();
create unique index if not exists shop_api_configs_user_platform_key on public.shop_api_configs(user_id, platform_type);
alter table public.shop_api_configs enable row level security;
-- OAuthトークンはservice role経由のみで扱い、ブラウザからは一切読み書きさせません。

create table if not exists public.shop_products (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.users(id) on delete cascade,
  platform_type text not null check (platform_type in ('base','shopify','square')),
  external_product_id text not null, title text not null, description text, product_url text, image_url text,
  is_active boolean not null default true, origin_country text, farm_or_station text, variety text, process_method text, roast_level text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, platform_type, external_product_id)
);
create unique index if not exists shop_products_user_platform_external_key on public.shop_products(user_id, platform_type, external_product_id);
alter table public.shop_products enable row level security;
drop policy if exists "Users read own synced products" on public.shop_products;
create policy "Users read own synced products" on public.shop_products for select to authenticated using (auth.uid() = user_id);
