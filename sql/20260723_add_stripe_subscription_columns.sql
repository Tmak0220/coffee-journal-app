begin;

alter table public.users
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_price_id text,
  add column if not exists stripe_plan_key text,
  add column if not exists stripe_subscription_status text,
  add column if not exists stripe_current_period_end timestamp with time zone,
  add column if not exists stripe_cancel_at_period_end boolean not null default false,
  add column if not exists stripe_subscription_updated_at timestamp with time zone;

create unique index if not exists users_stripe_customer_id_unique
  on public.users (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists users_stripe_subscription_id_unique
  on public.users (stripe_subscription_id)
  where stripe_subscription_id is not null;

comment on column public.users.stripe_customer_id is
  'Stripe Customer ID used to locate and manage the account subscription.';
comment on column public.users.stripe_subscription_id is
  'Current Stripe Subscription ID.';
comment on column public.users.stripe_subscription_status is
  'Last subscription status received from a verified Stripe webhook.';

commit;
