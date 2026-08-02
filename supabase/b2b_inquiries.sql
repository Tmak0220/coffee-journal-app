create table if not exists public.b2b_conversations (
  id uuid primary key default gen_random_uuid(), origin_id integer not null references public.origins(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade, recipient_id uuid not null references public.users(id) on delete cascade,
  subject_type text not null check (subject_type in ('wholesale','collaboration','media','large_order','other')),
  company_name text, status text not null default 'open' check (status in ('open','closed')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (origin_id, sender_id, recipient_id)
);
create table if not exists public.b2b_messages (
  id uuid primary key default gen_random_uuid(), conversation_id uuid not null references public.b2b_conversations(id) on delete cascade,
  sender_id uuid not null references public.users(id) on delete cascade, body text not null check (char_length(body) between 1 and 2000), created_at timestamptz not null default now()
);
create index if not exists b2b_conversations_recipient_idx on public.b2b_conversations(recipient_id, updated_at desc);
create index if not exists b2b_messages_conversation_idx on public.b2b_messages(conversation_id, created_at);
alter table public.b2b_conversations enable row level security;
alter table public.b2b_messages enable row level security;
drop policy if exists "Participants read B2B conversations" on public.b2b_conversations;
create policy "Participants read B2B conversations" on public.b2b_conversations for select to authenticated using (auth.uid() in (sender_id, recipient_id));
drop policy if exists "Participants read B2B messages" on public.b2b_messages;
create policy "Participants read B2B messages" on public.b2b_messages for select to authenticated using (exists (select 1 from public.b2b_conversations c where c.id = conversation_id and auth.uid() in (c.sender_id, c.recipient_id)));

create or replace function public.start_b2b_inquiry(p_origin_id integer, p_subject_type text, p_company_name text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_sender uuid := auth.uid(); v_recipient uuid; v_id uuid;
begin
  if v_sender is null then raise exception 'Authentication required'; end if;
  if p_subject_type not in ('wholesale','collaboration','media','large_order','other') or char_length(trim(p_body)) not between 1 and 2000 then raise exception 'Invalid inquiry'; end if;
  select o.user_id into v_recipient from origins o where o.id = p_origin_id and o.is_approved = true and o.is_public = true;
  if v_recipient is null or v_recipient = v_sender then raise exception 'Business recipient not found'; end if;
  insert into b2b_conversations(origin_id,sender_id,recipient_id,subject_type,company_name) values(p_origin_id,v_sender,v_recipient,p_subject_type,nullif(trim(p_company_name),''))
  on conflict(origin_id,sender_id,recipient_id) do update set updated_at=now() returning id into v_id;
  insert into b2b_messages(conversation_id,sender_id,body) values(v_id,v_sender,trim(p_body)); return v_id;
end; $$;

create or replace function public.send_b2b_message(p_conversation_id uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_sender uuid := auth.uid(); v_id uuid;
begin
  if char_length(trim(p_body)) not between 1 and 2000 or not exists(select 1 from b2b_conversations where id=p_conversation_id and v_sender in (sender_id,recipient_id)) then raise exception 'Invalid message or conversation'; end if;
  insert into b2b_messages(conversation_id,sender_id,body) values(p_conversation_id,v_sender,trim(p_body)) returning id into v_id;
  update b2b_conversations set updated_at=now() where id=p_conversation_id; return v_id;
end; $$;
revoke all on function public.start_b2b_inquiry(integer,text,text,text) from public;
revoke all on function public.send_b2b_message(uuid,text) from public;
grant execute on function public.start_b2b_inquiry(integer,text,text,text) to authenticated;
grant execute on function public.send_b2b_message(uuid,text) to authenticated;
