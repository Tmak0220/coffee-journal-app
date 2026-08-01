"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

type Props = {
  currentUserId: string
  lang: "ja" | "en"
}

type TimelineType = "tasting" | "gear" | "event" | "blog" | "verification"
type TimelineTab = "all" | TimelineType

type Author = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type TimelineItem = {
  key: string
  id: string
  type: TimelineType
  title: string
  summary: string | null
  imageUrl: string | null
  createdAt: string
  href: string
  author: Author | null
  sourceLabel?: string | null
}

function firstImage(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    if (Array.isArray(parsed)) return typeof parsed[0] === "string" ? parsed[0] : null
  } catch {
    return value
  }
  return null
}

function postType(post: { type?: string | null; event_origin_id?: number | null }): TimelineType {
  if (post.type === "gear_review") return "gear"
  if (post.type === "event" || post.event_origin_id) return "event"
  return "tasting"
}

export default function FollowingTimeline({ currentUserId, lang }: Props) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TimelineTab>("all")
  const isEn = lang === "en"

  useEffect(() => {
    let cancelled = false

    const fetchTimeline = async () => {
      setLoading(true)

      const [{ data: followData, error: followError }, { data: originFollowData, error: originFollowError }, { data: viewer }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", currentUserId),
        supabase.from("origin_follows").select("origin_slug").eq("user_id", currentUserId),
        supabase.from("users").select("membership_tier").eq("id", currentUserId).maybeSingle(),
      ])

      if (followError || originFollowError) {
        console.error("Failed to load follows:", followError || originFollowError)
        if (!cancelled) {
          setItems([])
          setLoading(false)
        }
        return
      }

      const followingIds = Array.from(new Set((followData || []).map((row) => row.following_id).filter(Boolean))) as string[]
      const followedOriginSlugs = Array.from(new Set((originFollowData || []).map((row) => row.origin_slug).filter(Boolean))) as string[]
      if (followingIds.length === 0 && followedOriginSlugs.length === 0) {
        if (!cancelled) {
          setItems([])
          setLoading(false)
        }
        return
      }

      const canViewMembers = true
      const { data: followedOrigins, error: followedOriginsError } = followedOriginSlugs.length > 0
        ? await supabase.from("origins").select("id, slug, name, name_ja, user_id").in("slug", followedOriginSlugs)
        : { data: [], error: null }
      const followedOriginIds = (followedOrigins || []).map((origin) => origin.id)
      const followedOriginOwnerIds = (followedOrigins || []).map((origin) => origin.user_id).filter(Boolean) as string[]
      const originLabelById = new Map(
        (followedOrigins || []).map((origin) => [origin.id, isEn ? origin.name : (origin.name_ja || origin.name)]),
      )

      const { data: originLinks, error: originLinksError } = followedOriginIds.length > 0
        ? await supabase
            .from("origin_post_links")
            .select("origin_id, post_id, display_status")
            .in("origin_id", followedOriginIds)
            .eq("display_status", "approved")
        : { data: [], error: null }
      const originIdByPostId = new Map<string, number>()
      for (const link of originLinks || []) {
        if (!originIdByPostId.has(link.post_id)) originIdByPostId.set(link.post_id, link.origin_id)
      }
      const linkedPostIds = Array.from(originIdByPostId.keys())
      const allAuthorIds = Array.from(new Set([...followingIds, ...followedOriginOwnerIds]))

      const authorsQuery = allAuthorIds.length > 0
        ? supabase.from("users").select("id, username, display_name, avatar_url").in("id", allAuthorIds)
        : Promise.resolve({ data: [], error: null })
      const followedPostsQuery = followingIds.length > 0
        ? supabase
          .from("posts")
          .select("id, user_id, title, description, tastes, image_urls, created_at, visibility, type, event_origin_id, lang")
          .in("user_id", followingIds)
          .eq("lang", lang)
          .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null })
      const originPostsQuery = linkedPostIds.length > 0
        ? supabase
            .from("posts")
            .select("id, user_id, title, description, tastes, image_urls, created_at, visibility, type, event_origin_id, lang")
            .in("id", linkedPostIds)
            .eq("lang", lang)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null })
      const blogAuthorIds = Array.from(new Set([...followingIds, ...followedOriginOwnerIds]))
      const blogsQuery = blogAuthorIds.length > 0
        ? supabase
          .from("blogs")
          .select("id, user_id, title, content, image_urls, created_at, visibility, lang, publish_target")
          .in("user_id", blogAuthorIds)
          .eq("lang", lang)
          .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null })
      const recipesQuery = blogAuthorIds.length > 0
        ? supabase
          .from("pro_recipes")
          .select("id, user_id, recipe_title, bean_name, image_urls, created_at, visibility, lang, target_category")
          .in("user_id", blogAuthorIds)
          .eq("lang", lang)
          .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null })

      const [authorsResult, postsResult, originPostsResult, blogsResult, recipesResult] = await Promise.all([
        authorsQuery,
        followedPostsQuery,
        originPostsQuery,
        blogsQuery,
        recipesQuery,
      ])

      const queryError = followedOriginsError || originLinksError || postsResult.error || originPostsResult.error || blogsResult.error || recipesResult.error || authorsResult.error
      if (queryError) {
        console.error("Failed to load following timeline:", queryError)
      }

      const authors = new Map<string, Author>(
        (authorsResult.data || []).map((author) => [author.id, author as Author]),
      )
      const isVisible = (visibility: string | null | undefined) =>
        visibility === "public" || (visibility === "members" && canViewMembers)

      const mergedPosts = new Map<string, any>()
      for (const post of [...(postsResult.data || []), ...(originPostsResult.data || [])]) mergedPosts.set(post.id, post)
      const postItems: TimelineItem[] = Array.from(mergedPosts.values())
        .filter((post) => isVisible(post.visibility))
        .map((post) => {
          const type = postType(post)
          return {
            key: `post-${post.id}`,
            id: post.id,
            type,
            title: post.title || (isEn ? "Untitled post" : "無題の投稿"),
            summary: post.description || post.tastes,
            imageUrl: firstImage(post.image_urls),
            createdAt: post.created_at || "",
            href: `/${lang}/posts/${post.id}`,
            author: authors.get(post.user_id) || null,
            sourceLabel: originIdByPostId.has(post.id)
              ? originLabelById.get(originIdByPostId.get(post.id)!) || null
              : null,
          }
        })

      const blogItems: TimelineItem[] = (blogsResult.data || [])
        .filter((blog) => isVisible(blog.visibility) && (
          followingIds.includes(blog.user_id)
          || (followedOriginOwnerIds.includes(blog.user_id) && ["origins", "both"].includes(blog.publish_target || ""))
        ))
        .map((blog) => ({
          key: `blog-${blog.id}`,
          id: blog.id,
          type: "blog",
          title: blog.title || (isEn ? "Untitled blog" : "無題のブログ"),
          summary: blog.content,
          imageUrl: firstImage(blog.image_urls),
          createdAt: blog.created_at || "",
          href: `/${lang}/blogs/${blog.id}`,
          author: authors.get(blog.user_id) || null,
        }))

      const recipeItems: TimelineItem[] = (recipesResult.data || [])
        .filter((recipe) => isVisible(recipe.visibility) && (
          followingIds.includes(recipe.user_id)
          || (followedOriginOwnerIds.includes(recipe.user_id) && ["origins", "both"].includes(recipe.target_category || ""))
        ))
        .map((recipe) => ({
          key: `verification-${recipe.id}`,
          id: recipe.id,
          type: "verification",
          title: recipe.recipe_title || (isEn ? "Untitled verification" : "無題の検証"),
          summary: recipe.bean_name,
          imageUrl: firstImage(recipe.image_urls),
          createdAt: recipe.created_at || "",
          href: `/${lang}/recipes/${recipe.id}`,
          author: authors.get(recipe.user_id) || null,
        }))

      if (!cancelled) {
        setItems([...postItems, ...blogItems, ...recipeItems].sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ))
        setLoading(false)
      }
    }

    fetchTimeline()
    return () => { cancelled = true }
  }, [currentUserId, lang, isEn])

  const counts = useMemo(() => {
    const result: Record<TimelineTab, number> = {
      all: items.length,
      tasting: 0,
      gear: 0,
      event: 0,
      blog: 0,
      verification: 0,
    }
    items.forEach((item) => { result[item.type] += 1 })
    return result
  }, [items])

  const filteredItems = activeTab === "all" ? items : items.filter((item) => item.type === activeTab)
  const labels: Record<TimelineTab, string> = isEn
    ? { all: "All", tasting: "Tasting", gear: "Gear", event: "Events", blog: "Blogs", verification: "Verifications" }
    : { all: "すべて", tasting: "テイスト", gear: "器具", event: "イベント", blog: "ブログ", verification: "検証" }

  if (loading) {
    return (
      <div className="mx-auto mt-6 max-w-6xl animate-pulse space-y-6">
        <div className="flex gap-2 overflow-hidden border-b border-border pb-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-9 w-24 shrink-0 rounded-full bg-neutral-100" />)}
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="aspect-[4/5] rounded-2xl bg-neutral-100" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto mt-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-border pb-3 no-scrollbar">
        {(Object.keys(labels) as TimelineTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-medium transition ${
              activeTab === tab ? "bg-foreground text-background" : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {labels[tab]} <span className="ml-1 opacity-60">{counts[tab]}</span>
          </button>
        ))}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center text-xs text-subtle">
          {isEn ? "No posts in this category yet." : "このカテゴリーの投稿はまだありません。"}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3 lg:grid-cols-4">
          {filteredItems.map((item) => (
            <Link key={item.key} href={item.href} className="group min-w-0">
              <article className="space-y-3">
                <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface">
                  {item.imageUrl ? (
                    <Image
                      src={item.imageUrl}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] tracking-[0.18em] text-subtle">NO IMAGE</div>
                  )}
                  <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-[9px] font-medium uppercase tracking-wider text-white backdrop-blur">
                    {labels[item.type]}
                  </span>
                </div>
                <div className="min-w-0 px-0.5 text-left">
                  <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:underline">
                    {item.title}
                  </h3>
                  {item.author && (
                    <p className="mt-1 truncate text-[11px] text-subtle">
                      {item.author.display_name || (item.author.username ? `@${item.author.username}` : (isEn ? "Private account" : "非公開アカウント"))}
                    </p>
                  )}
                  {item.sourceLabel && (
                    <p className="mt-1 truncate text-[10px] text-subtle">
                      {isEn ? `From ${item.sourceLabel}` : `${item.sourceLabel}に関連する投稿`}
                    </p>
                  )}
                  <time className="mt-1 block text-[10px] text-subtle">
                    {item.createdAt ? new Intl.DateTimeFormat(isEn ? "en" : "ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(new Date(item.createdAt)) : ""}
                  </time>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
