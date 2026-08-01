import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { canViewContent } from "@/lib/permissions"
import { createClient } from "@/lib/supabase-server"
import PostPageClient from "./PostPageClient"

type Props = {
  params: Promise<{
    lang: string
    slugs: string[]
  }>
}

function extractUuid(paramId: string): string {
  if (paramId && paramId.length >= 36) {
    return paramId.slice(-36)
  }
  return paramId
}

// slugs 配列から ID、Market、Source を抽出するヘルパー関数
function parseSlugs(slugs: string[]) {
  if (!slugs || slugs.length === 0) {
    return { actualId: "", marketSlug: null, sourceSlug: null }
  }

  // 配列の一番最後（末尾）を ID として取り出す
  const rawId = slugs[slugs.length - 1]
  const actualId = extractUuid(rawId)

  // パス階層の数に応じてスラッグを振り分け
  // 例: /posts/lupicia/ethiopia/id  -> slugs: ["lupicia", "ethiopia", "id"]
  // 例: /posts/lupicia/id            -> slugs: ["lupicia", "id"]
  // 例: /posts/id                    -> slugs: ["id"]
  const marketSlug = slugs.length > 2 ? slugs[0] : slugs.length === 2 ? slugs[0] : null
  const sourceSlug = slugs.length > 2 ? slugs[1] : null

  return { actualId, marketSlug, sourceSlug }
}

async function getPostDetail(actualId: string) {
  if (!actualId) return null

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

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

  if (!canViewContent({ visibility, viewerId: user?.id, ownerId: post.user_id })) return null

  const providerIds = Array.from(new Set(
    (post.recipes || [])
      .map((recipe: any) => recipe.barista_user_id)
      .filter((id: unknown): id is string => typeof id === "string" && id.length > 0)
  ))

  if (providerIds.length === 0) return post

  const { data: providers } = await supabase
    .from("users")
    .select("id, username, display_name, display_name_en")
    .in("id", providerIds)

  const providerMap = new Map((providers || []).map(provider => [provider.id, provider]))
  return {
    ...post,
    recipes: (post.recipes || []).map((recipe: any) => ({
      ...recipe,
      barista: recipe.barista_user_id ? providerMap.get(recipe.barista_user_id) || null : null,
    })),
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slugs, lang } = await params
  const { actualId } = parseSlugs(slugs)

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
  const { slugs, lang } = await params
  const { actualId } = parseSlugs(slugs)

  const post = await getPostDetail(actualId)
  const marketSlug = post?.market_origin?.slug || null
  const sourceSlug = post?.source_origin?.slug || null
  const gearSlug = post?.type === "gear_review"
    ? post.post_gears?.find((item: any) => item?.gears?.slug)?.gears?.slug || null
    : null

  if (post) {
    const canonicalSegments = (
      post.type === "gear_review"
        ? [gearSlug, actualId]
        : [marketSlug, sourceSlug, actualId]
    ).filter(
      (segment): segment is string => Boolean(segment)
    )
    if (slugs.join("/") !== canonicalSegments.join("/")) {
      redirect(`/${lang}/posts/${canonicalSegments.map(encodeURIComponent).join("/")}`)
    }
  }

  return (
    <PostPageClient 
      id={actualId} 
      lang={lang} 
      marketSlug={marketSlug}
      sourceSlug={sourceSlug}
      initialPost={post} 
    />
  )
}
