"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import BookmarkLoading from "./loading"

type Category = "all" | "post" | "event" | "gear" | "blog" | "verification"
type SourceTable = "bookmarks" | "blog_bookmarks" | "pro_recipe_bookmarks"

type BookmarkItem = {
  bookmarkId: string
  sourceTable: SourceTable
  contentId: string
  category: Exclude<Category, "all">
  title: string
  imageUrl: string | null
  createdAt: string
  href: string
}

const categoryOrder: Category[] = ["all", "post", "event", "gear", "blog", "verification"]

export default function BookmarkPageClient() {
  const router = useRouter()
  const pathname = usePathname()
  const lang = pathname.startsWith("/en/") || pathname === "/en" ? "en" : "ja"
  const isEn = lang === "en"

  const [items, setItems] = useState<BookmarkItem[]>([])
  const [activeCategory, setActiveCategory] = useState<Category>("all")
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [selectedKeys, setSelectedKeys] = useState<string[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const t = isEn ? {
    subtitle: "Saved articles",
    total: (count: number) => `${count} saved items`,
    edit: "MANAGE",
    done: "DONE",
    deleteSelected: (count: number) => `DELETE ${count}`,
    empty: "No saved items in this category.",
    delete: "Remove bookmark",
    loadError: "Some bookmarks could not be loaded.",
    labels: { all: "ALL", post: "POSTS", event: "EVENTS", gear: "GEAR", blog: "BLOGS", verification: "VERIFICATIONS" },
  } : {
    subtitle: "保存した記事",
    total: (count: number) => `合計 ${count} 件`,
    edit: "整理・削除",
    done: "完了",
    deleteSelected: (count: number) => `${count}件を削除`,
    empty: "このカテゴリーに保存された記事はありません。",
    delete: "ブックマークを削除",
    loadError: "一部のブックマークを読み込めませんでした。",
    labels: { all: "すべて", post: "投稿", event: "イベント", gear: "器具", blog: "ブログ", verification: "検証記事" },
  }

  const fetchBookmarks = useCallback(async () => {
    setErrorMessage(null)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setIsAuthChecked(true)
      router.replace(`/${lang}/login?redirectTo=${encodeURIComponent(`/${lang}/bookmarks`)}`)
      return
    }

    const isMetadataAdmin = user.user_metadata?.role === "admin" || user.app_metadata?.role === "admin"
    const { data: member } = await supabase.from("users").select("membership_tier, role").eq("id", user.id).maybeSingle()
    const hasAccess = isMetadataAdmin || member?.role === "admin" || Boolean(member?.membership_tier && member.membership_tier !== "free")
    if (!hasAccess) {
      setIsAuthChecked(true)
      router.replace(`/${lang}/members`)
      return
    }

    const [postRowsResult, blogRowsResult, verificationRowsResult] = await Promise.all([
      supabase.from("bookmarks").select("id, post_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("blog_bookmarks").select("id, blog_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("pro_recipe_bookmarks").select("id, pro_recipe_id, created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    ])

    if (postRowsResult.error || blogRowsResult.error || verificationRowsResult.error) setErrorMessage(t.loadError)

    const postRows = postRowsResult.data || []
    const blogRows = blogRowsResult.data || []
    const verificationRows = verificationRowsResult.data || []

    const postIds = postRows.flatMap((row) => row.post_id ? [row.post_id] : [])
    const blogIds = blogRows.flatMap((row) => row.blog_id ? [row.blog_id] : [])
    const verificationIds = verificationRows.flatMap((row) => row.pro_recipe_id ? [row.pro_recipe_id] : [])

    const [postsResult, blogsResult, verificationsResult] = await Promise.all([
      postIds.length ? supabase.from("posts").select("id, title, image_urls, type, event_origin_id, created_at").in("id", postIds) : Promise.resolve({ data: [] }),
      blogIds.length ? supabase.from("blogs").select("id, title, image_urls, created_at").in("id", blogIds) : Promise.resolve({ data: [] }),
      verificationIds.length ? supabase.from("pro_recipes").select("id, recipe_title, bean_name, image_urls, created_at").in("id", verificationIds) : Promise.resolve({ data: [] }),
    ])

    const postMap = new Map((postsResult.data || []).map((post) => [post.id, post]))
    const blogMap = new Map((blogsResult.data || []).map((blog) => [blog.id, blog]))
    const verificationMap = new Map((verificationsResult.data || []).map((recipe) => [recipe.id, recipe]))
    const firstImage = (value: string[] | string | null | undefined) => Array.isArray(value) ? value[0] || null : typeof value === "string" ? value.split(",")[0]?.trim() || null : null

    const combined: BookmarkItem[] = []
    for (const row of postRows) {
      if (!row.post_id) continue
      const post = postMap.get(row.post_id)
      if (!post) continue
      const category = post.type === "gear_review" ? "gear" : post.type === "event" || post.event_origin_id ? "event" : "post"
      combined.push({ bookmarkId: row.id, sourceTable: "bookmarks", contentId: post.id, category, title: post.title || (isEn ? "Untitled post" : "無題の投稿"), imageUrl: firstImage(post.image_urls), createdAt: row.created_at || post.created_at, href: `/${lang}/posts/${post.id}` })
    }
    for (const row of blogRows) {
      if (!row.blog_id) continue
      const blog = blogMap.get(row.blog_id)
      if (!blog) continue
      combined.push({ bookmarkId: row.id, sourceTable: "blog_bookmarks", contentId: blog.id, category: "blog", title: blog.title, imageUrl: firstImage(blog.image_urls), createdAt: row.created_at || blog.created_at, href: `/${lang}/blogs/${blog.id}` })
    }
    for (const row of verificationRows) {
      if (!row.pro_recipe_id) continue
      const recipe = verificationMap.get(row.pro_recipe_id)
      if (!recipe) continue
      combined.push({ bookmarkId: row.id, sourceTable: "pro_recipe_bookmarks", contentId: recipe.id, category: "verification", title: recipe.recipe_title || recipe.bean_name, imageUrl: firstImage(recipe.image_urls), createdAt: row.created_at || recipe.created_at, href: `/${lang}/recipes/${recipe.id}` })
    }

    combined.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    setItems(combined)
    setIsAuthChecked(true)
  }, [isEn, lang, router, t.loadError])

  useEffect(() => { void fetchBookmarks() }, [fetchBookmarks])

  const keyOf = (item: BookmarkItem) => `${item.sourceTable}:${item.bookmarkId}`
  const filteredItems = useMemo(() => activeCategory === "all" ? items : items.filter((item) => item.category === activeCategory), [activeCategory, items])
  const counts = useMemo(() => Object.fromEntries(categoryOrder.map((category) => [category, category === "all" ? items.length : items.filter((item) => item.category === category).length])) as Record<Category, number>, [items])

  const deleteItems = async (targets: BookmarkItem[]) => {
    if (!targets.length || actionLoading) return
    setActionLoading(true)
    setErrorMessage(null)
    let failed = false
    for (const table of ["bookmarks", "blog_bookmarks", "pro_recipe_bookmarks"] as SourceTable[]) {
      const ids = targets.filter((item) => item.sourceTable === table).map((item) => item.bookmarkId)
      if (!ids.length) continue
      const { error } = await supabase.from(table).delete().in("id", ids)
      if (error) failed = true
    }
    if (!failed) {
      const removed = new Set(targets.map(keyOf))
      setItems((current) => current.filter((item) => !removed.has(keyOf(item))))
      setSelectedKeys((current) => current.filter((key) => !removed.has(key)))
      if (targets.length > 1) setIsEditing(false)
    } else {
      setErrorMessage(isEn ? "Failed to remove bookmarks." : "ブックマークの削除に失敗しました。")
    }
    setActionLoading(false)
  }

  if (!isAuthChecked) return <BookmarkLoading />

  return (
    <main className="public-page-shell mx-auto max-w-6xl px-4 py-7 sm:px-10 sm:py-10 md:px-14 md:py-14 lg:px-16">
      <header className="flex flex-col gap-6 border-b border-neutral-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-neutral-400">LIBRARY</p>
          <h1 className="mt-3 text-3xl font-light tracking-[0.06em] text-neutral-900">BOOKMARKS</h1>
          <p className="mt-2 text-xs text-neutral-500">{t.subtitle} · {t.total(items.length)}</p>
        </div>
        {items.length > 0 && <div className="flex gap-3">{isEditing && selectedKeys.length > 0 && <button type="button" disabled={actionLoading} onClick={() => deleteItems(items.filter((item) => selectedKeys.includes(keyOf(item))))} className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50">{t.deleteSelected(selectedKeys.length)}</button>}<button type="button" onClick={() => { setIsEditing((value) => !value); setSelectedKeys([]) }} className={`rounded-xl border px-4 py-2.5 text-xs font-semibold transition ${isEditing ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"}`}>{isEditing ? t.done : t.edit}</button></div>}
      </header>

      {errorMessage && <p className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600">{errorMessage}</p>}

      <nav className="-mx-4 mt-7 flex gap-6 overflow-x-auto border-b border-neutral-200 px-4 sm:mx-0 sm:mt-8 sm:gap-7 sm:px-0" aria-label="Bookmark categories">
        {categoryOrder.map((category) => <button key={category} type="button" onClick={() => { setActiveCategory(category); setSelectedKeys([]) }} className={`relative shrink-0 pb-3 text-xs font-semibold tracking-wide transition ${activeCategory === category ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-700"}`}>{t.labels[category]} <span className="ml-1 text-[10px] font-normal">{counts[category]}</span>{activeCategory === category && <span className="absolute inset-x-0 bottom-0 h-px bg-neutral-900" />}</button>)}
      </nav>

      {filteredItems.length === 0 ? <div className="py-24 text-center text-xs text-neutral-400">{t.empty}</div> : (
        <section className="mt-7 grid grid-cols-2 gap-x-3 gap-y-7 sm:mt-9 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
          {filteredItems.map((item) => {
            const key = keyOf(item)
            const selected = selectedKeys.includes(key)
            return <article key={key} className={`group relative transition ${isEditing && !selected ? "opacity-60" : ""}`}>
              {isEditing && <button type="button" aria-label={selected ? "Deselect" : "Select"} onClick={() => setSelectedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key])} className={`absolute left-3 top-3 z-20 flex size-7 items-center justify-center rounded-full border text-xs shadow-sm ${selected ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-transparent"}`}>✓</button>}
              <button type="button" title={t.delete} aria-label={t.delete} disabled={actionLoading} onClick={() => deleteItems([item])} className="absolute right-3 top-3 z-20 flex size-8 items-center justify-center rounded-full border border-neutral-200 bg-white/90 text-neutral-500 opacity-100 shadow-sm backdrop-blur transition hover:border-red-200 hover:text-red-600 sm:opacity-0 sm:group-hover:opacity-100">×</button>
              <Link href={isEditing ? "#" : item.href} onClick={(event) => { if (isEditing) { event.preventDefault(); setSelectedKeys((current) => current.includes(key) ? current.filter((value) => value !== key) : [...current, key]) } }}>
                <div className={`relative aspect-[4/5] overflow-hidden rounded-2xl border bg-neutral-50 transition ${selected ? "border-neutral-900 ring-1 ring-neutral-900" : "border-neutral-200 group-hover:border-neutral-400"}`}>{item.imageUrl ? <Image src={item.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-[9px] tracking-[0.14em] text-neutral-300">NO IMAGE</div>}</div>
                <div className="mt-3 px-1"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{t.labels[item.category]}</p><h2 className="mt-1 line-clamp-2 text-xs font-medium leading-5 text-neutral-800">{item.title}</h2><time className="mt-2 block text-[9px] text-neutral-400">{new Date(item.createdAt).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</time></div>
              </Link>
            </article>
          })}
        </section>
      )}
    </main>
  )
}
