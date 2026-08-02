-- Small, fixed-scope marketplace for approved Experts / Origins profiles.
-- Additive migration: it does not remove membership or subscription data.

create table if not exists public.service_offerings (
  id uuid primary key default gen_random_uuid(),
  provider_user_id uuid not null references public.users(id) on delete cascade,
  provider_type text not null check (provider_type in ('expert', 'origin')),
  origin_id integer references public.origins(id) on delete cascade,
  service_type text not null check (service_type in ('brew_recipe_review', 'online_consultation', 'roast_water_review')),
  title text not null check (char_length(title) between 1 and 100),
  description text not null check (char_length(description) between 1 and 2000),
  price_yen integer not null check (price_yen between 3000 and 500000),
  delivery_days integer not null default 7 check (delivery_days between 1 and 90),
  duration_minutes integer check (duration_minutes is null or duration_minutes between 15 and 240),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique nulls not distinct (provider_user_id, provider_type, origin_id, service_type),
  check ((provider_type = 'origin' and origin_id is not null) or (provider_type = 'expert' and origin_id is null))
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  offering_id uuid not null references public.service_offerings(id) on delete restrict,
  buyer_user_id uuid not null references public.users(id) on delete cascade,
  provider_user_id uuid not null references public.users(id) on delete cascade,
  request_content text not null check (char_length(request_content) between 20 and 5000),
  status text not null default 'requested' check (status in ('requested','accepted','rejected','in_progress','delivered','completed','canceled')),
  amount_yen integer not null check (amount_yen >= 3000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  accepted_at timestamptz,
  delivered_at timestamptz,
  completed_at timestamptz,
  check (buyer_user_id <> provider_user_id)
);

create index if not exists service_offerings_provider_idx on public.service_offerings(provider_user_id, is_active);
create index if not exists service_orders_buyer_idx on public.service_orders(buyer_user_id, created_at desc);
create index if not exists service_orders_provider_idx on public.service_orders(provider_user_id, created_at desc);

alter table public.service_offerings enable row level security;
alter table public.service_orders enable row level security;

drop policy if exists "Public reads active service offerings" on public.service_offerings;
create policy "Public reads active service offerings" on public.service_offerings
  for select using (is_active or auth.uid() = provider_user_id);
drop policy if exists "Providers manage own service offerings" on public.service_offerings;
create policy "Providers manage own service offerings" on public.service_offerings
  for all to authenticated
  using (auth.uid() = provider_user_id)
  with check (
    auth.uid() = provider_user_id
    and (
      (
        provider_type = 'expert'
        and origin_id is null
        and exists (
          select 1 from public.experts e
          where e.user_id = auth.uid()
            and e.is_profile_completed = true
            and e.is_approved = true
            and e.is_public = true
        )
      )
      or (
        provider_type = 'origin'
        and exists (
          select 1 from public.origins o
          where o.id = origin_id
            and o.user_id = auth.uid()
            and o.is_profile_completed = true
            and o.is_approved = true
            and o.is_public = true
        )
      )
    )
  );

drop policy if exists "Order participants read service orders" on public.service_orders;
create policy "Order participants read service orders" on public.service_orders
  for select to authenticated using (auth.uid() in (buyer_user_id, provider_user_id));
drop policy if exists "Buyers create service orders" on public.service_orders;
create policy "Buyers create service orders" on public.service_orders
  for insert to authenticated with check (
    auth.uid() = buyer_user_id
    and buyer_user_id <> provider_user_id
    and exists (
      select 1 from public.service_offerings o
      where o.id = offering_id and o.is_active and o.provider_user_id = provider_user_id and o.price_yen = amount_yen
    )
  );
drop policy if exists "Participants update service orders" on public.service_orders;

-- Order participants may only change the status through this function. This
-- prevents a browser client from replacing the price or either participant ID.
create or replace function public.update_service_order_status(
  p_order_id uuid,
  p_status text
)
returns public.service_orders
language plpgsql
security definer
set search_path = public
as $$
declare
  current_order public.service_orders;
  next_order public.service_orders;
begin
  select * into current_order
  from public.service_orders
  where id = p_order_id
  for update;

  if current_order.id is null then
    raise exception 'Service order not found';
  end if;

  if auth.uid() = current_order.provider_user_id then
    if not (
      (current_order.status = 'requested' and p_status in ('accepted', 'rejected'))
      or (current_order.status = 'accepted' and p_status = 'in_progress')
      or (current_order.status = 'in_progress' and p_status = 'delivered')
    ) then
      raise exception 'Invalid provider status transition';
    end if;
  elsif auth.uid() = current_order.buyer_user_id then
    if not (
      (current_order.status = 'requested' and p_status = 'canceled')
      or (current_order.status = 'delivered' and p_status = 'completed')
    ) then
      raise exception 'Invalid buyer status transition';
    end if;
  else
    raise exception 'Not authorized';
  end if;

  update public.service_orders
  set
    status = p_status,
    accepted_at = case when p_status = 'accepted' then now() else accepted_at end,
    delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    updated_at = now()
  where id = p_order_id
  returning * into next_order;

  return next_order;
end;
$$;

revoke all on function public.update_service_order_status(uuid, text) from public;
grant execute on function public.update_service_order_status(uuid, text) to authenticated;

create or replace function public.touch_service_marketplace_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists service_offerings_touch_updated_at on public.service_offerings;
create trigger service_offerings_touch_updated_at before update on public.service_offerings
for each row execute function public.touch_service_marketplace_updated_at();
drop trigger if exists service_orders_touch_updated_at on public.service_orders;
create trigger service_orders_touch_updated_at before update on public.service_orders
for each row execute function public.touch_service_marketplace_updated_at();
