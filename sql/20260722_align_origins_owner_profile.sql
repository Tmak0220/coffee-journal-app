begin;

-- OwnerProfileForm が使用する列だけを、既存データを保持したまま補完します。
-- avatar_url / cover_url は users テーブルの列なので origins には追加しません。
alter table public.origins
  add column if not exists user_id uuid references public.users(id) on delete set null,
  add column if not exists links jsonb default '[]'::jsonb,
  add column if not exists headquarters jsonb,
  add column if not exists headquarters_en jsonb,
  add column if not exists branches jsonb default '[]'::jsonb,
  add column if not exists branches_en jsonb default '[]'::jsonb,
  add column if not exists display_name text,
  add column if not exists display_name_en text,
  add column if not exists pending_display_name text,
  add column if not exists pending_display_name_en text,
  add column if not exists is_approved boolean default false,
  add column if not exists is_profile_completed boolean default false,
  add column if not exists bio text,
  add column if not exists bio_en text,
  add column if not exists is_public boolean default false;

alter table public.origins
  alter column links set default '[]'::jsonb,
  alter column branches set default '[]'::jsonb,
  alter column branches_en set default '[]'::jsonb,
  alter column is_approved set default false,
  alter column is_profile_completed set default false,
  alter column is_public set default false;

-- origins_type_checkで許可されていない'farm'がデフォルトになっている矛盾を解消します。
-- typeはNULL許可のため、用途ごとのINSERT側で明示します。
alter table public.origins
  alter column type drop default;

create index if not exists origins_name_ja_search_idx
  on public.origins using gin (to_tsvector('simple', coalesce(name_ja, '')));

create index if not exists origins_search_keywords_search_idx
  on public.origins using gin (to_tsvector('simple', coalesce(search_keywords, '')));

-- origins_user_id_key は「列名」ではなく user_id の一意制約名です。
-- 1アカウントにつき1オーナープロフィールの設計に必要なため削除しません。

commit;
