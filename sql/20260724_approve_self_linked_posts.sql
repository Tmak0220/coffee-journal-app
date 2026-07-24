begin;

-- A profile owner linking their own tasting post does not require approval.
update public.origin_post_links opl
set display_status = 'approved',
    updated_at = timezone('utc', now())
from public.origins o,
     public.posts p
where o.id = opl.origin_id
  and p.id = opl.post_id
  and o.user_id is not null
  and o.user_id = p.user_id
  and opl.display_status = 'pending';

update public.recipes r
set expert_display_status = 'approved'
from public.posts p
where p.id = r.post_id
  and r.barista_user_id is not null
  and r.barista_user_id = p.user_id
  and r.expert_display_status = 'pending';

commit;

-- Verification:
-- select opl.id
-- from public.origin_post_links opl
-- join public.origins o on o.id = opl.origin_id
-- join public.posts p on p.id = opl.post_id
-- where o.user_id = p.user_id and opl.display_status <> 'approved';
--
-- select r.id
-- from public.recipes r
-- join public.posts p on p.id = r.post_id
-- where r.barista_user_id = p.user_id
--   and r.expert_display_status <> 'approved';
