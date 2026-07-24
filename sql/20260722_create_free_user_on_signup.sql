-- Supabase Authにユーザーが作成された時点でpublic.usersにも無料会員行を作成する。
-- username / display_nameはプロフィール設定時までNULLのままにする。

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    role,
    membership_tier,
    created_at,
    updated_at
  )
  values (
    new.id,
    new.email,
    'user',
    'free',
    now(),
    now()
  )
  on conflict (id) do update
  set email = excluded.email,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();

-- 既存のAuthユーザーにusers行がない場合も、安全にfreeとして補完する。
insert into public.users (
  id,
  email,
  role,
  membership_tier,
  created_at,
  updated_at
)
select
  auth_user.id,
  auth_user.email,
  'user',
  'free',
  coalesce(auth_user.created_at, now()),
  now()
from auth.users as auth_user
where not exists (
  select 1
  from public.users as app_user
  where app_user.id = auth_user.id
);
