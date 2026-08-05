begin;

create table if not exists public.admin_translation_ignores (
  resource text not null,
  resource_id text not null,
  ignored_by uuid null references public.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc'::text, now()),
  constraint admin_translation_ignores_pkey primary key (resource, resource_id),
  constraint admin_translation_ignores_resource_check
    check (resource in ('posts', 'blogs', 'pro_recipes', 'admin_journals'))
);

alter table public.admin_translation_ignores enable row level security;

-- This table is read and written only by the authenticated admin API through
-- the service role. No browser-facing RLS policy is intentionally created.

create index if not exists admin_translation_ignores_created_at_idx
  on public.admin_translation_ignores (created_at desc);

commit;
