begin;

-- image_urlsをpostsと同じtext[]へ統一する。
alter table public.pro_recipes
  alter column image_urls type text[]
  using case
    when image_urls is null or btrim(image_urls) = '' then null
    else array[image_urls]
  end;

-- 公開ページで必要な属性をレシピ本体へ追加する。
alter table public.pro_recipes
  add column if not exists visibility text not null default 'draft',
  add column if not exists target_category text not null default 'experts',
  add column if not exists lang text not null default 'ja';

alter table public.pro_recipes
  drop constraint if exists pro_recipes_visibility_check,
  add constraint pro_recipes_visibility_check
    check (visibility in ('draft', 'private', 'members', 'public')),
  drop constraint if exists pro_recipes_target_category_check,
  add constraint pro_recipes_target_category_check
    check (target_category in ('experts', 'origins', 'both')),
  drop constraint if exists pro_recipes_lang_check,
  add constraint pro_recipes_lang_check
    check (lang in ('ja', 'en'));

-- pro_recipesとgearsの多対多中間テーブル。
create table if not exists public.pro_recipe_gears (
  id uuid primary key default gen_random_uuid(),
  pro_recipe_id uuid not null references public.pro_recipes(id) on delete cascade,
  gear_id integer not null references public.gears(id) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (pro_recipe_id, gear_id)
);

create index if not exists pro_recipes_user_id_idx
  on public.pro_recipes(user_id);
create index if not exists pro_recipes_visibility_lang_idx
  on public.pro_recipes(visibility, lang);
create index if not exists pro_recipe_gears_pro_recipe_id_idx
  on public.pro_recipe_gears(pro_recipe_id);
create index if not exists pro_recipe_gears_gear_id_idx
  on public.pro_recipe_gears(gear_id);

alter table public.pro_recipes enable row level security;
alter table public.pro_recipe_gears enable row level security;

drop policy if exists "Users can create own pro recipes" on public.pro_recipes;
create policy "Users can create own pro recipes"
on public.pro_recipes for insert
with check (user_id = auth.uid());

drop policy if exists "Users can read permitted pro recipes" on public.pro_recipes;
create policy "Users can read permitted pro recipes"
on public.pro_recipes for select
using (
  user_id = auth.uid()
  or visibility = 'public'
  or (
    visibility = 'members'
    and exists (
      select 1 from public.users u
      where u.id = auth.uid() and u.membership_tier <> 'free'
    )
  )
);

drop policy if exists "Users can update own pro recipes" on public.pro_recipes;
create policy "Users can update own pro recipes"
on public.pro_recipes for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can delete own pro recipes" on public.pro_recipes;
create policy "Users can delete own pro recipes"
on public.pro_recipes for delete
using (user_id = auth.uid());

drop policy if exists "Public can read visible pro recipe gears" on public.pro_recipe_gears;
create policy "Public can read visible pro recipe gears"
on public.pro_recipe_gears for select
using (
  exists (
    select 1 from public.pro_recipes pr
    where pr.id = pro_recipe_id
      and (
        pr.visibility = 'public'
        or pr.user_id = auth.uid()
        or (
          pr.visibility = 'members'
          and exists (
            select 1 from public.users u
            where u.id = auth.uid()
              and u.membership_tier <> 'free'
          )
        )
      )
  )
);

drop policy if exists "Owners can insert pro recipe gears" on public.pro_recipe_gears;
create policy "Owners can insert pro recipe gears"
on public.pro_recipe_gears for insert
with check (
  exists (
    select 1 from public.pro_recipes pr
    where pr.id = pro_recipe_id and pr.user_id = auth.uid()
  )
);

drop policy if exists "Owners can update pro recipe gears" on public.pro_recipe_gears;
create policy "Owners can update pro recipe gears"
on public.pro_recipe_gears for update
using (
  exists (
    select 1 from public.pro_recipes pr
    where pr.id = pro_recipe_id and pr.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.pro_recipes pr
    where pr.id = pro_recipe_id and pr.user_id = auth.uid()
  )
);

drop policy if exists "Owners can delete pro recipe gears" on public.pro_recipe_gears;
create policy "Owners can delete pro recipe gears"
on public.pro_recipe_gears for delete
using (
  exists (
    select 1 from public.pro_recipes pr
    where pr.id = pro_recipe_id and pr.user_id = auth.uid()
  )
);

commit;

-- 実行後の確認:
-- select count(*) as old_equipment_rows from public.pro_recipe_equipments;
-- select count(*) as new_gear_rows from public.pro_recipe_gears;
--
-- 旧テーブルにデータがない、または移行完了を確認してから別トランザクションで実行:
-- drop table public.pro_recipe_equipments;
