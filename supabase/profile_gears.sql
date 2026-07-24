-- プロ／オーナープロフィールで選択した、普段使用する器具。
-- 既存テーブルや既存データは変更・削除しません。
create table if not exists public.profile_gears (
  user_id uuid not null references public.users(id) on delete cascade,
  profile_type text not null check (profile_type in ('expert', 'owner')),
  gear_id integer not null references public.gears(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_type, gear_id)
);

create index if not exists profile_gears_gear_id_idx on public.profile_gears (gear_id);
alter table public.profile_gears enable row level security;

drop policy if exists "Public can read profile gears" on public.profile_gears;
create policy "Public can read profile gears" on public.profile_gears for select using (true);

drop policy if exists "Users can insert own profile gears" on public.profile_gears;
create policy "Users can insert own profile gears" on public.profile_gears for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can delete own profile gears" on public.profile_gears;
create policy "Users can delete own profile gears" on public.profile_gears for delete to authenticated using (auth.uid() = user_id);
