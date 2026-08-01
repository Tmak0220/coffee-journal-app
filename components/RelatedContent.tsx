"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Source = "posts" | "blogs" | "pro_recipes"

type Item = {
  id: string
  userId: string
  title: string
  description: string
  imageUrl: string | null
  createdAt: string
  authorName: string
  relation: "same" | "following" | "discovery"
}

type Props = {
  source: Source
  currentId: string
  authorId: string
  lang: "ja" | "en"
  postType?: string | null
}

const firstImage = (value: unknown): string | null => {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : null
  } catch {
    return value.startsWith("http") ? value : null
  }
}

export default function RelatedContent({ source, currentId, authorId, lang, postType }: Props) {
  const [items, setItems] = useState<Item[]>([])
  const isEn = lang === "en"

  useEffect(() => {
    let active = true

    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      let canViewMembers = false
      let followingIds: string[] = []

      if (user) {
        const { data: follows } = await supabase
          .from("follows")
          .select("following_id")
          .eq("follower_id", user.id)
        canViewMembers = true
        followingIds = (follows || []).map((follow) => follow.following_id)
      }

      const visibility = canViewMembers ? ["public", "members"] : ["public"]
      let rawRows: any[] = []
      let queryError: { message?: string } | null = null

      if (source === "posts") {
        let query = supabase
          .from("posts")
          .select("id, user_id, title, description, image_urls, created_at, visibility, type, event_origin_id")
          .neq("id", currentId)
          .eq("lang", lang)
          .in("visibility", visibility)
          .order("created_at", { ascending: false })
          .limit(40)
        if (postType === "event") query = query.or("type.eq.event,event_origin_id.not.is.null")
        else if (postType === "gear_review") query = query.eq("type", "gear_review")
        else query = query.eq("type", postType || "blog")
        const result = await query
        rawRows = result.data || []
        queryError = result.error
      } else if (source === "blogs") {
        const result = await supabase
          .from("blogs")
          .select("id, user_id, title, content, image_urls, created_at, visibility")
          .neq("id", currentId)
          .eq("lang", lang)
          .in("visibility", visibility)
          .order("created_at", { ascending: false })
          .limit(40)
        rawRows = result.data || []
        queryError = result.error
      } else {
        const result = await supabase
          .from("pro_recipes")
          .select("id, user_id, recipe_title, bean_name, image_urls, created_at, visibility")
          .neq("id", currentId)
          .eq("lang", lang)
          .in("visibility", visibility)
          .order("created_at", { ascending: false })
          .limit(40)
        rawRows = result.data || []
        queryError = result.error
      }

      if (!active) return
      if (queryError) {
        console.error("Related content fetch error:", queryError)
        return
      }

      const authorIds = Array.from(new Set(rawRows.map((row) => row.user_id).filter(Boolean)))
      const { data: authors } = authorIds.length
        ? await supabase.from("users").select("id, username, display_name, display_name_en").in("id", authorIds)
        : { data: [] }
      const authorMap = new Map((authors || []).map((author) => [author.id, author]))

      const normalized: Item[] = rawRows.map((row) => {
        const author = authorMap.get(row.user_id)
        return {
          id: row.id,
          userId: row.user_id,
          title: row.title || row.recipe_title || row.bean_name || (isEn ? "Untitled" : "無題"),
          description: row.description || row.content || row.bean_name || "",
          imageUrl: firstImage(row.image_urls),
          createdAt: row.created_at,
          authorName: isEn
            ? author?.display_name_en || author?.display_name || author?.username || "—"
            : author?.display_name || author?.username || "—",
          relation: row.user_id === authorId
            ? "same"
            : followingIds.includes(row.user_id) ? "following" : "discovery",
        }
      })

      const same = normalized.filter((item) => item.relation === "same")
      const following = normalized.filter((item) => item.relation === "following")
      const discovery = normalized.filter((item) => item.relation === "discovery")
      const selected: Item[] = []
      const add = (item?: Item) => {
        if (item && !selected.some((selectedItem) => selectedItem.id === item.id)) selected.push(item)
      }

      add(same.shift())
      add(following.shift())
      add(discovery.shift())
      while (selected.length < 4) {
        add(discovery.shift() || following.shift() || same.shift())
        if (same.length + following.length + discovery.length === 0) break
      }
      setItems(selected)
    }

    void load()
    return () => { active = false }
  }, [authorId, currentId, isEn, lang, postType, source])

  if (items.length === 0) return null

  const hrefFor = (item: Item) => source === "posts"
    ? `/${lang}/posts/${item.id}`
    : source === "blogs" ? `/${lang}/blogs/${item.id}` : `/${lang}/recipes/${item.id}`

  return (
    <section className="mx-auto mt-14 w-full max-w-7xl border-t border-neutral-200 pt-10 sm:mt-16 sm:pt-12">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">DISCOVER MORE</p>
          <h2 className="mt-1 text-lg font-semibold text-neutral-900">{isEn ? "Related posts" : "関連する投稿"}</h2>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item) => (
          <Link key={item.id} href={hrefFor(item)} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md">
            <div className="aspect-[16/10] overflow-hidden bg-neutral-100">
              {item.imageUrl
                ? <img src={item.imageUrl} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" />
                : <div className="flex h-full items-center justify-center text-[10px] tracking-widest text-neutral-300">NO IMAGE</div>}
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="max-w-[65%] truncate rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[9px] font-medium text-neutral-600">{item.authorName}</span>
                <time className="font-mono text-[9px] text-neutral-400">{new Date(item.createdAt).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</time>
              </div>
              <h3 className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-neutral-900">{item.title}</h3>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
