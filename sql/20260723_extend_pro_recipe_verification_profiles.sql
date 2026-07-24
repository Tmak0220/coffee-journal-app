begin;

-- 検証パターンごとに、フォーム送信時点の各モジュールを欠損なく保持します。
-- jsonb にすることで、SCA / COE の項目差や将来の項目追加にも既存データを壊さず対応できます。
alter table public.pro_recipes
  add column if not exists pour_steps jsonb not null default '[]'::jsonb,
  add column if not exists water_profile jsonb,
  add column if not exists roast_profile jsonb,
  add column if not exists cupping_profile jsonb,
  add column if not exists coffee_lot text,
  add column if not exists coffee_url text,
  add column if not exists roast_date date,
  add column if not exists is_best_pattern boolean not null default false;

comment on column public.pro_recipes.pour_steps is
  '注湯量・時刻・抽出工程の順序付き配列';
comment on column public.pro_recipes.water_profile is
  '水質モジュールの申請・投稿時点スナップショット';
comment on column public.pro_recipes.roast_profile is
  '焙煎モジュール（焙煎機、投入量、温度、RoR、回転数、DTR等）のスナップショット';
comment on column public.pro_recipes.cupping_profile is
  'SCAまたはCOEカッピング評価のスナップショット';

create index if not exists pro_recipes_roast_date_idx
  on public.pro_recipes (roast_date);

commit;
