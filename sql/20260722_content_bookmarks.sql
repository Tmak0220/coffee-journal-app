begin;

create table if not exists public.blog_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  blog_id uuid not null references public.blogs(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, blog_id)
);

create table if not exists public.pro_recipe_bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  pro_recipe_id uuid not null references public.pro_recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, pro_recipe_id)
);

create index if not exists blog_bookmarks_user_id_idx on public.blog_bookmarks(user_id);
create index if not exists pro_recipe_bookmarks_user_id_idx on public.pro_recipe_bookmarks(user_id);

alter table public.blog_bookmarks enable row level security;
alter table public.pro_recipe_bookmarks enable row level security;
alter table public.bookmarks enable row level security;

-- 既存の緩いポリシーがOR条件で残らないよう、対象3テーブルのポリシーを
-- データには触れずに入れ替える。
do $$
declare
  policy_row record;
begin
  for policy_row in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('bookmarks', 'blog_bookmarks', 'pro_recipe_bookmarks')
  loop
    execute format('drop policy %I on %I.%I', policy_row.policyname, policy_row.schemaname, policy_row.tablename);
  end loop;
end;
$$;

create policy "Members manage own post bookmarks"
on public.bookmarks for all
using (
  user_id = auth.uid()
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.role = 'admin' or u.membership_tier <> 'free')
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.users u
    where u.id = auth.uid()
      and (u.role = 'admin' or u.membership_tier <> 'free')
  )
);

create policy "Members manage own blog bookmarks"
on public.blog_bookmarks for all
using (
  user_id = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and (u.role = 'admin' or u.membership_tier <> 'free'))
)
with check (
  user_id = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and (u.role = 'admin' or u.membership_tier <> 'free'))
);

create policy "Members manage own pro recipe bookmarks"
on public.pro_recipe_bookmarks for all
using (
  user_id = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and (u.role = 'admin' or u.membership_tier <> 'free'))
)
with check (
  user_id = auth.uid()
  and exists (select 1 from public.users u where u.id = auth.uid() and (u.role = 'admin' or u.membership_tier <> 'free'))
);

commit;
