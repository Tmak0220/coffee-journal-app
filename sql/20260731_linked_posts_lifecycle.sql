begin;

create table if not exists public.expert_post_links (
  id uuid primary key default gen_random_uuid(),
  expert_user_id uuid not null references public.users(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  display_status text not null default 'approved'
    check (display_status in ('pending', 'approved', 'hidden')),
  is_pinned boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (expert_user_id, post_id)
);

create index if not exists expert_post_links_profile_display_idx
  on public.expert_post_links (expert_user_id, display_status, is_pinned, created_at desc);

insert into public.expert_post_links (
  expert_user_id,
  post_id,
  display_status,
  is_pinned
)
select
  r.barista_user_id,
  r.post_id,
  case
    when bool_or(coalesce(r.expert_display_status, 'approved') = 'approved') then 'approved'
    when bool_or(coalesce(r.expert_display_status, 'approved') = 'hidden') then 'hidden'
    else 'pending'
  end,
  bool_or(coalesce(r.expert_is_pinned, false))
from public.recipes r
where r.barista_user_id is not null
  and r.post_id is not null
group by r.barista_user_id, r.post_id
on conflict (expert_user_id, post_id) do nothing;

alter table public.expert_post_links enable row level security;

drop policy if exists "Read expert links by publication state" on public.expert_post_links;
create policy "Read expert links by publication state"
on public.expert_post_links for select
to anon, authenticated
using (
  (
    display_status = 'approved'
    or expert_user_id = (select auth.uid())
    or private.is_admin()
  )
  and exists (
    select 1
    from public.posts p
    where p.id = expert_post_links.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);

drop policy if exists "Experts moderate linked posts" on public.expert_post_links;
create policy "Experts moderate linked posts"
on public.expert_post_links for update
to authenticated
using (
  expert_user_id = (select auth.uid())
  or private.is_admin()
)
with check (
  expert_user_id = (select auth.uid())
  or private.is_admin()
);

-- Pending/hidden origin links must not be discoverable from a public client.
drop policy if exists "Read origin links through visible posts" on public.origin_post_links;
drop policy if exists "Read origin links by publication state" on public.origin_post_links;
create policy "Read origin links by publication state"
on public.origin_post_links for select
to anon, authenticated
using (
  (
    display_status = 'approved'
    or exists (
      select 1
      from public.origins o
      where o.id = origin_post_links.origin_id
        and o.user_id = (select auth.uid())
    )
    or private.is_admin()
  )
  and exists (
    select 1
    from public.posts p
    where p.id = origin_post_links.post_id
      and private.can_read_content(p.user_id, p.visibility)
  )
);

create or replace function public.set_expert_linked_posts_mode(p_mode text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_mode not in ('auto', 'review') then
    raise exception 'Invalid linked post mode';
  end if;

  update public.experts
  set linked_posts_mode = p_mode,
      updated_at = timezone('utc', now())
  where user_id = auth.uid();

  if not found then
    raise exception 'Expert profile not found';
  end if;

  -- Changing to review affects only links created from this point onward.
  -- Changing to auto publishes links that were waiting for approval.
  if p_mode = 'auto' then
    update public.expert_post_links
    set display_status = 'approved',
        updated_at = timezone('utc', now())
    where expert_user_id = auth.uid()
      and display_status = 'pending';
  end if;
end;
$$;

revoke all on function public.set_expert_linked_posts_mode(text) from public;
grant execute on function public.set_expert_linked_posts_mode(text) to authenticated;

create or replace function private.sync_profile_post_links(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if p_post_id is null or not exists (select 1 from public.posts where id = p_post_id) then
    return;
  end if;

  insert into public.origin_post_links (origin_id, post_id, display_status)
  select
    linked.origin_id,
    p_post_id,
    case
      when o.user_id = p.user_id then 'approved'
      when coalesce(o.linked_posts_mode, 'auto') = 'review' then 'pending'
      else 'approved'
    end
  from public.posts p
  join lateral (
    select p.source_origin_id as origin_id
    union
    select p.market_origin_id
    union
    select p.event_origin_id
    union
    select r.shop_origin_id
    from public.recipes r
    where r.post_id = p.id
  ) linked on linked.origin_id is not null
  join public.origins o on o.id = linked.origin_id
  where p.id = p_post_id
  on conflict (origin_id, post_id) do nothing;

  delete from public.origin_post_links opl
  where opl.post_id = p_post_id
    and not exists (
      select 1
      from public.posts p
      where p.id = p_post_id
        and opl.origin_id in (
          p.source_origin_id,
          p.market_origin_id,
          p.event_origin_id
        )
      union all
      select 1
      from public.recipes r
      where r.post_id = p_post_id
        and r.shop_origin_id = opl.origin_id
    );

  insert into public.expert_post_links (expert_user_id, post_id, display_status)
  select distinct
    r.barista_user_id,
    p_post_id,
    case
      when r.barista_user_id = p.user_id then 'approved'
      when coalesce(e.linked_posts_mode, 'auto') = 'review' then 'pending'
      else 'approved'
    end
  from public.recipes r
  join public.posts p on p.id = r.post_id
  join public.experts e on e.user_id = r.barista_user_id
  where r.post_id = p_post_id
    and r.barista_user_id is not null
  on conflict (expert_user_id, post_id) do nothing;

  delete from public.expert_post_links epl
  where epl.post_id = p_post_id
    and not exists (
      select 1
      from public.recipes r
      where r.post_id = p_post_id
        and r.barista_user_id = epl.expert_user_id
    );
end;
$$;

create or replace function private.sync_profile_post_links_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.sync_profile_post_links(coalesce(new.post_id, old.post_id));
  if tg_op = 'UPDATE' and old.post_id is distinct from new.post_id then
    perform private.sync_profile_post_links(old.post_id);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_profile_links_from_recipes on public.recipes;
create trigger sync_profile_links_from_recipes
after insert or update of post_id, barista_user_id, shop_origin_id or delete
on public.recipes
for each row execute function private.sync_profile_post_links_trigger();

create or replace function private.sync_profile_post_links_from_post_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  perform private.sync_profile_post_links(new.id);
  return new;
end;
$$;

drop trigger if exists sync_profile_links_from_posts on public.posts;
create trigger sync_profile_links_from_posts
after insert or update of source_origin_id, market_origin_id, event_origin_id
on public.posts
for each row execute function private.sync_profile_post_links_from_post_trigger();

commit;
