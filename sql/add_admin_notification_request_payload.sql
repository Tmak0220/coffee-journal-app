begin;

alter table public.admin_notifications
  add column if not exists request_payload jsonb;

comment on column public.admin_notifications.request_payload is
  '申請送信時点のプロフィール入力内容を保持するスナップショット';

commit;
