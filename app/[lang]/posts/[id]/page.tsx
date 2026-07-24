import type { Metadata } from "next"
import { createClient } from "@/lib/supabase-server"
import PostPageClient from "./PostPageClient"

type Props = {
  params: Promise<{
    lang: string
    id: string
  }>
}

function extractUuid(paramId: string): string {
  if (paramId.length >= 36) {
    return paramId.slice(-36)
  }
  return paramId
}

async function getPostDetail(actualId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 💡 サーバーサイドのクエリも中間テーブル取得に変更
  const { data: post, error } = await supabase
    .from("posts")
    .select(`
      *,
      users!posts_user_id_fkey(id, username, display_name, avatar_url),
      source_origin:origins!posts_source_origin_id_fkey(*),
      market_origin:origins!posts_market_origin_id_fkey(*),
      event_origin:origins!posts_event_origin_id_fkey(*),
      post_varieties(
        varieties(*)
      ),
      post_processes(
        processes(*)
      ),
      post_tastes!fk_post_tastes_post_id(
        tastes!fk_post_tastes_taste_id(*)
      ),
      post_gears(
        id,
        gear_id,
        rating,
        grind_setting,
        comment,
        gears(id, type, name, name_ja, brand, brand_ja, slug)
      ),
      recipes(*)
    `)
    .eq("id", actualId)
    .maybeSingle()

  if (error) {
    console.error("Server-side Fetch Error:", error.message)
  }

  if (!post) return null

  const isOwner = Boolean(user && post.user_id === user.id)
  const visibility = post.visibility || "public"

  if ((visibility === "draft" || visibility === "private") && !isOwner) {
    return null
  }

  if (visibility === "members" && !isOwner) {
    if (!user) return null

    const { data: viewer } = await supabase
      .from("users")
      .select("membership_tier, role")
      .eq("id", user.id)
      .maybeSingle()

    const canViewMembersPost = viewer?.role === "admin" || Boolean(viewer?.membership_tier && viewer.membership_tier !== "free")
    if (!canViewMembersPost) return null
  }

  return post
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id: paramId, lang } = await params
  const actualId = extractUuid(paramId)

  const post = await getPostDetail(actualId)

  const isEn = lang === "en"
  const defaultTitle = isEn ? "Post Detail | MEMBER" : "投稿詳細 | MEMBER"
  const defaultDesc = isEn 
    ? "View details and origin stories in our platform." 
    : "プラットフォームの投稿詳細ページです。"

  const title = post?.title ? `${post.title} | MEMBER` : defaultTitle
  const description = post?.description 
    ? post.description.slice(0, 120) 
    : defaultDesc

  return {
    title,
    description,
  }
}

export default async function Page({ params }: Props) {
  const { id: paramId, lang } = await params
  const actualId = extractUuid(paramId)

  const post = await getPostDetail(actualId)

  return (
    <PostPageClient 
      id={actualId} 
      lang={lang} 
      initialPost={post} 
    />
  )
}
