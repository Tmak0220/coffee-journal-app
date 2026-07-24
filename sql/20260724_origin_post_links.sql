begin;

create table if not exists public.origin_post_links (
  id uuid primary key default gen_random_uuid(),
  origin_id integer not null references public.origins(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  display_status text not null default 'approved'
    check (display_status in ('pending', 'approved', 'hidden')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (origin_id, post_id)
);

create index if not exists origin_post_links_origin_display_idx
  on public.origin_post_links (origin_id, display_status, is_pinned, created_at desc);

create index if not exists origin_post_links_post_idx
  on public.origin_post_links (post_id);

-- Existing tasting/event links.
insert into public.origin_post_links (origin_id, post_id, display_status)
select linked.origin_id, linked.post_id,
  case when coalesce(o.linked_posts_mode, 'auto') = 'review' and o.user_id is not null
    then 'pending'
    else 'approved'
  end
from (
  select source_origin_id as origin_id, id as post_id from public.posts where source_origin_id is not null
  union
  select market_origin_id, id from public.posts where market_origin_id is not null
  union
  select event_origin_id, id from public.posts where event_origin_id is not null
  union
  select shop_origin_id, post_id from public.recipes where shop_origin_id is not null and post_id is not null
) linked
join public.origins o on o.id = linked.origin_id
on conflict (origin_id, post_id) do nothing;

alter table public.origin_post_links enable row level security;

drop policy if exists "Read origin links through visible posts" on public.origin_post_links;
create policy "Read origin links through visible posts"
on public.origin_post_links for select
to anon, authenticated
using (
  exists (
    select 1
    from public.posts p
    where p.id = origin_post_links.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);

drop policy if exists "Owners update linked origin posts" on public.origin_post_links;
create policy "Owners update linked origin posts"
on public.origin_post_links for update
to authenticated
using (
  private.is_admin()
  or exists (
    select 1
    from public.origins o
    where o.id = origin_post_links.origin_id
      and o.user_id = (select auth.uid())
      and private.is_business()
  )
)
with check (
  private.is_admin()
  or exists (
    select 1
    from public.origins o
    where o.id = origin_post_links.origin_id
      and o.user_id = (select auth.uid())
      and private.is_business()
  )
);

create or replace function public.set_owner_linked_posts_mode(
  p_origin_id integer,
  p_mode text
)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_mode not in ('auto', 'review') then
    raise exception 'Invalid linked post mode';
  end if;

  if not private.is_admin() and not exists (
    select 1
    from public.origins o
    where o.id = p_origin_id
      and o.user_id = auth.uid()
  ) then
    raise exception 'Not authorized';
  end if;

  update public.origins
  set linked_posts_mode = p_mode,
      updated_at = now()
  where id = p_origin_id;

  if p_mode = 'auto' then
    update public.origin_post_links
    set display_status = 'approved',
        updated_at = now()
    where origin_id = p_origin_id
      and display_status = 'pending';
  end if;
end;
$$;

revoke all on function public.set_owner_linked_posts_mode(integer, text) from public;
grant execute on function public.set_owner_linked_posts_mode(integer, text) to authenticated;

commit;
