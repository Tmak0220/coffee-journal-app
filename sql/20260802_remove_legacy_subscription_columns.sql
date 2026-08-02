-- 月額メンバーシップ廃止後の users テーブル整理。
-- 依頼販売の決済情報は users ではなく、注文・決済専用テーブルで管理する。

begin;

drop index if exists public.users_stripe_customer_id_unique;
drop index if exists public.users_stripe_subscription_id_unique;

alter table public.users
  drop column if exists stripe_customer_id,
  drop column if exists stripe_subscription_id,
  drop column if exists stripe_price_id,
  drop column if exists stripe_plan_key,
  drop column if exists stripe_subscription_status,
  drop column if exists stripe_current_period_end,
  drop column if exists stripe_cancel_at_period_end,
  drop column if exists stripe_subscription_updated_at;

commit;
