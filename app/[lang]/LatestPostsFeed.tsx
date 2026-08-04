"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

const PAGE_SIZE = 8

type LatestPost = {
  id: string
  title: string | null
  image_urls: string[] | string | null
  created_at: string | null
  type: string | null
  event_origin_id: number | null
  users: unknown
  market_origin: unknown
  source_origin: unknown
  post_gears: unknown
}

const copy = {
  ja: {
    eyebrow: "LATEST POSTS",
    title: "最新の投稿",
    description: "ユーザーが公開した最新のコーヒー記録です。",
    empty: "公開されている投稿はまだありません。",
    find: "投稿を探す",
    untitled: "無題の投稿",
    noImage: "画像なし",
    by: "投稿者",
    loading: "投稿を読み込んでいます...",
    end: "すべての投稿を表示しました",
    error: "投稿を読み込めませんでした。",
    types: { tasting: "テイスティング", event: "イベント", gear: "器具レビュー" },
  },
  en: {
    eyebrow: "LATEST POSTS",
    title: "Latest posts",
    description: "The latest public coffee records shared by users.",
    empty: "No public posts yet.",
    find: "Explore posts",
    untitled: "Untitled post",
    noImage: "No image",
    by: "By",
    loading: "Loading more posts...",
    end: "You have reached the end",
    error: "Posts could not be loaded.",
    types: { tasting: "Tasting", event: "Event", gear: "Gear review" },
  },
} as const

const relationValue = (value: unknown): Record<string, unknown> | null => {
  if (Array.isArray(value)) return (value[0] as Record<string, unknown>) || null
  return value && typeof value === "object" ? value as Record<string, unknown> : null
}

const firstImage = (value: LatestPost["image_urls"]): string | null => {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : value
  } catch {
    return value
  }
}

const relationSlug = (value: unknown) => {
  const relation = relationValue(value)
  return typeof relation?.slug === "string" && relation.slug ? relation.slug : null
}

const postHref = (post: LatestPost, lang: string) => {
  if (post.type === "gear_review") {
    const links = Array.isArray(post.post_gears) ? post.post_gears : []
    const gear = relationValue(relationValue(links[0])?.gears)
    const gearSlug = typeof gear?.slug === "string" ? gear.slug : null
    return gearSlug ? `/${lang}/posts/${gearSlug}/${post.id}` : `/${lang}/posts/${post.id}`
  }
  const slugs = [relationSlug(post.market_origin), relationSlug(post.source_origin)].filter(Boolean)
  return `/${lang}/posts/${[...slugs, post.id].join("/")}`
}

export default function LatestPostsFeed({ lang }: { lang: "ja" | "en" }) {
  const t = copy[lang]
  const [posts, setPosts] = useState<LatestPost[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [failed, setFailed] = useState(false)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return
    loadingRef.current = true
    setLoading(true)
    setFailed(false)

    const from = posts.length
    const { data, error } = await supabase
      .from("posts")
      .select(`
        id,
        title,
        image_urls,
        created_at,
        type,
        event_origin_id,
        users!posts_user_id_fkey(username, display_name, display_name_en),
        market_origin:origins!posts_market_origin_id_fkey(slug),
        source_origin:origins!posts_source_origin_id_fkey(slug),
        post_gears(gears(slug))
      `)
      .eq("visibility", "public")
      .eq("lang", lang)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      console.error("Latest posts fetch error:", error)
      setFailed(true)
    } else {
      const incoming = (data || []) as unknown as LatestPost[]
      setPosts((current) => {
        const known = new Set(current.map((post) => post.id))
        return [...current, ...incoming.filter((post) => !known.has(post.id))]
      })
      setHasMore(incoming.length === PAGE_SIZE)
    }

    loadingRef.current = false
    setLoading(false)
  }, [hasMore, lang, posts.length])

  useEffect(() => {
    setPosts([])
    setHasMore(true)
    setFailed(false)
    loadingRef.current = false
  }, [lang])

  useEffect(() => {
    if (posts.length === 0 && hasMore && !failed && !loadingRef.current) void loadMore()
  }, [failed, hasMore, loadMore, posts.length])

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !failed) void loadMore() },
      { rootMargin: "500px 0px" },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [failed, loadMore])

  return (
    <section className="relative z-10 mx-auto mb-16 w-full max-w-6xl px-4 sm:px-10 md:px-14 lg:px-16">
      <div className="flex flex-col gap-4 border-b border-neutral-200/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-neutral-400">{t.eyebrow}</p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-neutral-900 sm:text-2xl">{t.title}</h2>
          <p className="mt-1 text-xs leading-6 text-neutral-500 sm:text-sm">{t.description}</p>
        </div>
        <Link href={`/${lang}/search`} className="w-fit text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-600 transition hover:text-black">
          {t.find} <span aria-hidden="true">→</span>
        </Link>
      </div>

      {!loading && posts.length === 0 && !failed ? (
        <div className="mt-6 rounded-2xl border border-dashed border-neutral-200 bg-white/60 px-5 py-14 text-center text-xs text-neutral-400">{t.empty}</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {posts.map((post) => {
            const author = relationValue(post.users)
            const authorName = lang === "en" ? author?.display_name_en || author?.display_name || author?.username : author?.display_name || author?.username
            const username = typeof author?.username === "string" ? author.username : null
            const imageUrl = firstImage(post.image_urls)
            const kind = post.type === "gear_review" ? "gear" : post.type === "event" || post.event_origin_id ? "event" : "tasting"
            const href = postHref(post, lang)

            return (
              <article key={post.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition duration-500 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_34px_-16px_rgba(0,0,0,0.2)]">
                <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-neutral-100">
                  {imageUrl ? <Image src={imageUrl} alt="" fill sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04]" /> : <div className="flex h-full items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-300">{t.noImage}</div>}
                </Link>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.1em] text-neutral-500">{t.types[kind]}</span>
                    <time className="font-mono text-[9px] text-neutral-400">{post.created_at ? new Date(post.created_at).toLocaleDateString(lang === "en" ? "en-US" : "ja-JP") : ""}</time>
                  </div>
                  <Link href={href} className="mt-3 line-clamp-2 min-h-10 text-[13px] font-bold leading-5 text-neutral-850 transition group-hover:text-black">{post.title || t.untitled}</Link>
                  <div className="mt-auto border-t border-neutral-100 pt-3">
                    {username ? <Link href={`/${lang}/users/${encodeURIComponent(username)}`} className="line-clamp-1 text-[10px] text-neutral-400 transition hover:text-neutral-900">{t.by} <span className="font-semibold text-neutral-700">{String(authorName || `@${username}`)}</span></Link> : <p className="line-clamp-1 text-[10px] text-neutral-400">{t.by} <span className="font-semibold text-neutral-700">{String(authorName || "—")}</span></p>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-6" aria-live="polite">
        {loading && <span className="text-[10px] font-medium tracking-wide text-neutral-400 animate-pulse">{t.loading}</span>}
        {!loading && failed && <button type="button" onClick={() => void loadMore()} className="rounded-xl border border-neutral-200 bg-white px-5 py-3 text-[10px] font-semibold text-neutral-600 transition hover:border-neutral-400 hover:text-black">{t.error}</button>}
        {!loading && !failed && !hasMore && posts.length > 0 && <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-neutral-300">{t.end}</span>}
      </div>
    </section>
  )
}
