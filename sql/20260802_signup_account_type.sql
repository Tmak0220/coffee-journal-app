-- 新規登録時の自己申告を users.role へ保存する。
-- user -> USER、pro -> EXPERT、owner -> ORIGIN の各ダッシュボードを利用する。
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role, created_at, updated_at)
  values (
    new.id,
    new.email,
    case new.raw_user_meta_data ->> 'account_type'
      when 'pro' then 'pro'
      when 'owner' then 'owner'
      else 'user'
    end,
    now(),
    now()
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_auth_user();
