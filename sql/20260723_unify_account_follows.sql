begin;

-- 所有者のいる origins ページへの既存フォローを、アカウント共通の
-- follows に移す。origin_follows は所有者のいない産地マスター用に残す。
insert into public.follows (follower_id, following_id)
select distinct origin_follow.user_id, origin.user_id
from public.origin_follows as origin_follow
join public.origins as origin
  on origin.slug = origin_follow.origin_slug
where origin_follow.user_id is not null
  and origin.user_id is not null
  and origin_follow.user_id <> origin.user_id
  and not exists (
    select 1
    from public.follows as existing_follow
    where existing_follow.follower_id = origin_follow.user_id
      and existing_follow.following_id = origin.user_id
  );

-- 同じアカウントを複数ページからフォローしても重複しないようにする。
-- 既存の重複行は最も古い1件だけを残す（フォロー関係そのものは失われない）。
delete from public.follows as duplicate_follow
using public.follows as keeper
where duplicate_follow.follower_id = keeper.follower_id
  and duplicate_follow.following_id = keeper.following_id
  and (
    duplicate_follow.created_at > keeper.created_at
    or (
      duplicate_follow.created_at = keeper.created_at
      and duplicate_follow.id::text > keeper.id::text
    )
  );

create unique index if not exists follows_follower_following_unique
  on public.follows (follower_id, following_id)
  where follower_id is not null and following_id is not null;

commit;
