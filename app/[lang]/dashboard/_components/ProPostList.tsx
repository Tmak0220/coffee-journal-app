"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Category = "all" | "notice" | "blog" | "verification"
type Visibility = "all" | "draft" | "private" | "members" | "public"

type ProPostItem = {
  id: string
  category: Exclude<Category, "all">
  title: string
  description: string
  imageUrl: string | null
  createdAt: string
  visibility: Exclude<Visibility, "all">
  href: string | null
  editHref: string | null
}

const firstImage = (value: unknown): string | null => {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed) && typeof parsed[0] === "string") return parsed[0]
    } catch {
      return value.startsWith("http") ? value : null
    }
  }
  return null
}

export default function ProPostList({
  userId,
  lang = "ja",
  refreshKey = 0,
  destination = "experts",
}: {
  userId: string
  lang?: "ja" | "en"
  refreshKey?: number
  destination?: "experts" | "origins"
}) {
  const isEn = lang === "en"
  const [items, setItems] = useState<ProPostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<Category>("all")
  const [visibility, setVisibility] = useState<Visibility>("all")
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")

  const t = isEn ? {
    title: destination === "origins" ? "OWNER POSTS" : "PRO POSTS",
    description: destination === "origins"
      ? "Manage announcements, articles, and verification reports published to your origin page."
      : "Manage your announcements, articles, and verification reports.",
    all: "All Posts",
    notice: "Announcements",
    blog: "Articles",
    verification: "Verification",
    allVisibility: "All Visibilities",
    draft: "Draft",
    private: "Private",
    members: "Members",
    public: "Public",
    newest: "Newest First",
    oldest: "Oldest First",
    empty: "No matching posts found.",
    view: "View",
    edit: "Edit",
  } : {
    title: destination === "origins" ? "オーナー投稿" : "プロ投稿",
    description: destination === "origins"
      ? "お知らせ・ブログ・検証記事をまとめて管理できます。"
      : "お知らせ・ブログ・検証記事をまとめて管理できます。",
    all: "すべての投稿",
    notice: "お知らせ",
    blog: "ブログ",
    verification: "検証記事",
    allVisibility: "すべての公開状態",
    draft: "下書き",
    private: "非公開",
    members: "会員限定",
    public: "公開",
    newest: "新しい順",
    oldest: "古い順",
    empty: "該当する投稿はありません。",
    view: "表示",
    edit: "編集",
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const [noticesResult, blogsResult, recipesResult] = await Promise.all([
        supabase.from("notifications").select("id, title, content, link_url, created_at, target_group, lang, author_type").eq("user_id", userId).eq("lang", lang).order("created_at", { ascending: false }),
        supabase.from("blogs").select("id, title, content, image_urls, created_at, visibility, lang, author_type").eq("user_id", userId).eq("lang", lang).order("created_at", { ascending: false }),
        supabase.from("pro_recipes").select("id, recipe_title, bean_name, image_urls, created_at, visibility, lang, target_category").eq("user_id", userId).eq("lang", lang).order("created_at", { ascending: false }),
      ])

      if (!active) return
      const matchesAuthorType = (authorType: string | null | undefined) => destination === "origins"
        ? authorType === "owner"
        : !authorType || authorType === "pro"
      const notices = (noticesResult.data || []).filter((notice: any) => matchesAuthorType(notice.author_type)).map((notice: any): ProPostItem => ({
        id: notice.id,
        category: "notice",
        title: notice.title || (isEn ? "Untitled announcement" : "無題のお知らせ"),
        description: notice.content || "",
        imageUrl: null,
        createdAt: notice.created_at,
        visibility: notice.target_group === "premium" ? "members" : "public",
        href: notice.link_url || null,
        editHref: null,
      }))
      const blogs = (blogsResult.data || []).filter((blog: any) => matchesAuthorType(blog.author_type)).map((blog: any): ProPostItem => ({
        id: blog.id,
        category: "blog",
        title: blog.title || (isEn ? "Untitled article" : "無題の記事"),
        description: (blog.content || "").replace(/<[^>]*>/g, ""),
        imageUrl: firstImage(blog.image_urls),
        createdAt: blog.created_at,
        visibility: blog.visibility || "draft",
        href: `/${lang}/blogs/${blog.id}`,
        editHref: `/${lang}/edit/blog/${blog.id}`,
      }))
      const recipes = (recipesResult.data || [])
        .filter((recipe: any) => destination === "origins"
          ? recipe.target_category === "origins" || recipe.target_category === "both"
          : !recipe.target_category || recipe.target_category === "experts" || recipe.target_category === "both")
        .map((recipe: any): ProPostItem => ({
        id: recipe.id,
        category: "verification",
        title: recipe.recipe_title || recipe.bean_name || (isEn ? "Untitled verification" : "無題の検証記事"),
        description: recipe.bean_name || "",
        imageUrl: firstImage(recipe.image_urls),
        createdAt: recipe.created_at,
        visibility: recipe.visibility || "draft",
        href: `/${lang}/recipes/${recipe.id}`,
        editHref: `/${lang}/edit/verification/${recipe.id}`,
      }))
      setItems([...notices, ...blogs, ...recipes])
      setLoading(false)
    }
    void load()
    return () => { active = false }
  }, [destination, isEn, lang, refreshKey, userId])

  const visibleItems = useMemo(() => items
    .filter(item => category === "all" || item.category === category)
    .filter(item => visibility === "all" || item.visibility === visibility)
    .sort((a, b) => {
      const difference = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return sortOrder === "newest" ? difference : -difference
    }), [category, items, sortOrder, visibility])

  const selectClass = "rounded-xl border border-neutral-200 bg-white px-3.5 py-2.5 text-xs text-neutral-700 outline-none transition hover:border-neutral-400 focus:border-neutral-500"
  const categoryLabel = (value: ProPostItem["category"]) => t[value]
  const visibilityLabel = (value: ProPostItem["visibility"]) => t[value]

  return (
    <section className="w-full max-w-5xl mx-auto space-y-8 rounded-xl border border-neutral-200 bg-white px-6 pb-10 pt-6 shadow-sm sm:px-10 sm:pb-16 sm:pt-10">
      <div className="flex flex-col gap-5 border-b border-neutral-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[15px] font-bold uppercase tracking-wider text-neutral-900">{t.title}</h2>
          <p className="mt-1 text-[11px] tracking-wide text-neutral-400">{t.description}</p>
          <p className="mt-1 font-mono text-[10px] tracking-wider text-neutral-400">TOTAL: {visibleItems.length}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select value={category} onChange={(event) => setCategory(event.target.value as Category)} className={selectClass}>
            <option value="all">{t.all}</option>
            <option value="notice">{t.notice}</option>
            <option value="blog">{t.blog}</option>
            <option value="verification">{t.verification}</option>
          </select>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value as Visibility)} className={selectClass}>
            <option value="all">{t.allVisibility}</option>
            <option value="draft">{t.draft}</option>
            <option value="private">{t.private}</option>
            <option value="members">{t.members}</option>
            <option value="public">{t.public}</option>
          </select>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as "newest" | "oldest")} className={selectClass}>
            <option value="newest">{t.newest}</option>
            <option value="oldest">{t.oldest}</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div aria-busy="true" className="grid animate-pulse grid-cols-1 gap-5 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-xl border border-neutral-100 bg-white shadow-sm">
              <div className="aspect-video bg-neutral-100" />
              <div className="p-5">
                <div className="h-3 w-24 rounded bg-neutral-100" />
                <div className="mt-5 h-5 w-3/4 rounded bg-neutral-100" />
                <div className="mt-3 h-3 w-full rounded bg-neutral-100" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="py-20 text-center text-sm text-neutral-400">{t.empty}</div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {visibleItems.map(item => (
            <article key={`${item.category}-${item.id}`} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:border-neutral-300 hover:shadow-md">
              {item.imageUrl && <div className="aspect-video overflow-hidden border-b border-neutral-100 bg-neutral-50"><img src={item.imageUrl} alt="" className="h-full w-full object-cover" /></div>}
              <div className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">{categoryLabel(item.category)}</span>
                    <span className="text-[10px] font-mono text-neutral-400">{new Date(item.createdAt).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</span>
                  </div>
                  <span className="whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1 text-[9px] font-semibold tracking-wider text-white">{visibilityLabel(item.visibility)}</span>
                </div>
                <h3 className="mt-4 line-clamp-1 text-[15px] font-semibold text-neutral-900">{item.title}</h3>
                <p className="mt-2 line-clamp-2 min-h-10 text-xs leading-5 text-neutral-500">{item.description}</p>
                {(item.href || item.editHref) && <div className="mt-5 grid grid-cols-2 gap-2">
                  {item.href && <Link href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel={item.href.startsWith("http") ? "noreferrer" : undefined} className="block rounded-xl border border-neutral-300 px-4 py-2.5 text-center text-xs font-medium text-neutral-800 transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white">{t.view}</Link>}
                  {item.editHref && <Link href={item.editHref} className="block rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2.5 text-center text-xs font-medium text-neutral-600 transition hover:border-neutral-400 hover:text-neutral-900">{t.edit}</Link>}
                </div>}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
