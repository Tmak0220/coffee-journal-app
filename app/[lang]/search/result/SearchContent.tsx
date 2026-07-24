"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { GridSkeleton } from "@/components/ui/PageSkeletons"

type ProfileResult = {
  id: string
  title: string
  subtitle: string | null
  imageUrl: string | null
  href: string
  badge?: string
}

type ContentType = "tasting" | "gear" | "event" | "blog" | "verification"
type ContentResult = {
  key: string
  id: string
  type: ContentType
  title: string
  summary: string | null
  imageUrl: string | null
  href: string
  createdAt: string
}

const paidTiers = new Set(["standard", "pro", "business"])

function firstImage(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null
  if (typeof value !== "string" || !value.trim()) return null
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : value
  } catch {
    return value
  }
}

function safeQuery(value: string) {
  return value.trim().replace(/[,%()]/g, " ").replace(/\s+/g, " ").slice(0, 80)
}

export default function SearchContent() {
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const lang = pathname.startsWith("/en/") || pathname === "/en" ? "en" : "ja"
  const isEn = lang === "en"
  const query = searchParams.get("q") || ""
  const varietyIds = (searchParams.get("variety_id") || "").split(",").filter(Boolean)
  const processIds = (searchParams.get("process_id") || "").split(",").filter(Boolean)
  const tasteIds = (searchParams.get("taste_ids") || "").split(",").filter(Boolean)
  const gearIds = (searchParams.get("gear_ids") || "").split(",").filter(Boolean)
  const filterSignature = [...varietyIds, "|", ...processIds, "|", ...tasteIds, "|", ...gearIds].join(",")

  const [users, setUsers] = useState<ProfileResult[]>([])
  const [origins, setOrigins] = useState<ProfileResult[]>([])
  const [experts, setExperts] = useState<ProfileResult[]>([])
  const [content, setContent] = useState<ContentResult[]>([])
  const [loading, setLoading] = useState(false)

  const labels: Record<ContentType, string> = isEn
    ? { tasting: "Tasting", gear: "Gear", event: "Events", blog: "Blogs", verification: "Verifications" }
    : { tasting: "テイスト", gear: "器具", event: "イベント", blog: "ブログ", verification: "検証" }

  const ui = isEn
    ? {
        title: "Search results",
        users: "User accounts",
        origins: "Origins, Shops & Events",
        experts: "Coffee People",
        emptyProfiles: "No matching profiles found.",
        emptyContent: "No matching posts found.",
        noResults: "No results matched your search.",
      }
    : {
        title: "検索結果",
        users: "ユーザーアカウント",
        origins: "産地・店舗・イベント",
        experts: "コーヒーに関わる人々",
        emptyProfiles: "該当するプロフィールはありません。",
        emptyContent: "該当する投稿はありません。",
        noResults: "検索条件に一致する結果はありませんでした。",
      }

  useEffect(() => {
    let cancelled = false

    const fetchResults = async () => {
      const term = safeQuery(query)
      const hasFilters = varietyIds.length + processIds.length + tasteIds.length + gearIds.length > 0
      if (!term && !hasFilters) {
        setUsers([])
        setOrigins([])
        setExperts([])
        setContent([])
        return
      }

      setLoading(true)
      const pattern = `%${term}%`

      try {
        const { data: { session } } = await supabase.auth.getSession()
        const viewerId = session?.user?.id
        const { data: viewer } = viewerId
          ? await supabase.from("users").select("membership_tier").eq("id", viewerId).maybeSingle()
          : { data: null }
        const visibleStatuses = paidTiers.has(viewer?.membership_tier || "")
          ? ["public", "members"]
          : ["public"]

        const relationParams = new URLSearchParams()
        if (varietyIds.length) relationParams.set("variety_id", varietyIds.join(","))
        if (processIds.length) relationParams.set("process_id", processIds.join(","))
        if (tasteIds.length) relationParams.set("taste_ids", tasteIds.join(","))
        if (gearIds.length) relationParams.set("gear_ids", gearIds.join(","))
        const relationResponse = hasFilters
          ? await fetch(`/api/search/related-content?${relationParams.toString()}`, { cache: "no-store" })
          : null
        if (relationResponse && !relationResponse.ok) {
          throw new Error("Failed to resolve selected search filters")
        }
        const related = relationResponse
          ? await relationResponse.json() as { postIds: string[]; recipeIds: string[] }
          : { postIds: [], recipeIds: [] }
        const allowedPostIds = hasFilters ? related.postIds : null
        const allowedRecipeIds = hasFilters ? related.recipeIds : null

        let postQuery = supabase
          .from("posts")
          .select("id, title, description, tastes, image_urls, created_at, type, event_origin_id")
          .eq("lang", lang)
          .in("visibility", visibleStatuses)
        if (term) {
          postQuery = postQuery.or(`title.ilike.${pattern},description.ilike.${pattern},tastes.ilike.${pattern}`)
        }
        if (allowedPostIds) {
          postQuery = allowedPostIds.length > 0
            ? postQuery.in("id", allowedPostIds)
            : postQuery.in("id", ["00000000-0000-0000-0000-000000000000"])
        }

        let recipeQuery = supabase
          .from("pro_recipes")
          .select("id, recipe_title, bean_name, log_purpose, log_process, log_conclusion, image_urls, created_at")
          .eq("lang", lang)
          .in("visibility", visibleStatuses)
        if (term) {
          recipeQuery = recipeQuery.or(`recipe_title.ilike.${pattern},bean_name.ilike.${pattern},log_purpose.ilike.${pattern},log_process.ilike.${pattern},log_conclusion.ilike.${pattern}`)
        }
        if (allowedRecipeIds) {
          recipeQuery = allowedRecipeIds.length > 0
            ? recipeQuery.in("id", allowedRecipeIds)
            : recipeQuery.in("id", ["00000000-0000-0000-0000-000000000000"])
        }
        const shouldSearchRecipes = (!hasFilters && Boolean(term)) || allowedRecipeIds !== null

        const [usersResult, originsResult, expertsResult, postsResult, blogsResult, recipesResult] = await Promise.all([
          term ? supabase
            .from("users")
            .select("id, username, display_name, display_name_en, avatar_url")
            .or(`username.ilike.${pattern},display_name.ilike.${pattern},display_name_en.ilike.${pattern}`)
            .not("username", "is", null)
            .limit(16) : Promise.resolve({ data: [] }),
          term ? supabase
            .from("origins")
            .select("id, slug, name, name_ja, display_name, display_name_en, type, user_id, is_public")
            .or(`name.ilike.${pattern},name_ja.ilike.${pattern},display_name.ilike.${pattern},display_name_en.ilike.${pattern},search_keywords.ilike.${pattern}`)
            .or("user_id.is.null,is_public.eq.true")
            .in("type", ["market", "source", "event"])
            .limit(16) : Promise.resolve({ data: [] }),
          term ? supabase
            .from("experts")
            .select("user_id, display_name, display_name_en, primary_specialty, primary_specialty_en, is_approved, is_public")
            .eq("is_approved", true)
            .eq("is_public", true)
            .or(`display_name.ilike.${pattern},display_name_en.ilike.${pattern},primary_specialty.ilike.${pattern},primary_specialty_en.ilike.${pattern}`)
            .limit(16) : Promise.resolve({ data: [] }),
          postQuery.limit(40),
          term && !hasFilters ? supabase
            .from("blogs")
            .select("id, title, content, image_urls, created_at")
            .eq("lang", lang)
            .in("visibility", visibleStatuses)
            .or(`title.ilike.${pattern},content.ilike.${pattern}`)
            .limit(16) : Promise.resolve({ data: [] }),
          shouldSearchRecipes ? recipeQuery.limit(24) : Promise.resolve({ data: [] }),
        ])

        const matchedUsers = usersResult.data || []
        const matchedUserIds = matchedUsers.map((user) => user.id)

        // ユーザー名で検索した場合にも、そのユーザーの承認済みExpertsを含める。
        const expertsByUser = matchedUserIds.length > 0
          ? await supabase
              .from("experts")
              .select("user_id, display_name, display_name_en, primary_specialty, primary_specialty_en, is_approved, is_public")
              .in("user_id", matchedUserIds)
              .eq("is_approved", true)
              .eq("is_public", true)
          : { data: [] }

        const expertRows = Array.from(new Map(
          [...(expertsResult.data || []), ...(expertsByUser.data || [])].map((expert: any) => [expert.user_id, expert]),
        ).values()) as any[]
        const expertUserIds = expertRows.map((expert) => expert.user_id).filter(Boolean)
        const missingExpertUserIds = expertUserIds.filter((id) => !matchedUserIds.includes(id))
        const { data: missingExpertUsers } = missingExpertUserIds.length > 0
          ? await supabase
              .from("users")
              .select("id, username, display_name, display_name_en, avatar_url")
              .in("id", missingExpertUserIds)
          : { data: [] }
        const allUserRows = [...matchedUsers, ...(missingExpertUsers || [])]
        const userMap = new Map(allUserRows.map((user) => [user.id, user]))

        const userProfiles: ProfileResult[] = matchedUsers.map((user) => ({
          id: user.id,
          title: (isEn ? user.display_name_en : user.display_name) || user.display_name || user.username || (isEn ? "Anonymous" : "名称非公開"),
          subtitle: user.username ? `@${user.username}` : null,
          imageUrl: user.avatar_url,
          href: `/${lang}/users/${user.username}`,
        }))

        const originProfiles: ProfileResult[] = (originsResult.data || [])
          .filter((origin) => !origin.user_id || origin.is_public === true)
          .map((origin) => ({
            id: String(origin.id),
            title: (isEn ? origin.display_name_en : origin.display_name) || (isEn ? origin.name : origin.name_ja) || origin.name,
            subtitle: origin.slug,
            imageUrl: null,
            href: `/${lang}/origins/${origin.slug}`,
            badge: (origin.type || "origins").toUpperCase(),
          }))

        const expertProfiles: ProfileResult[] = expertRows
          .map((expert) => {
            const user = userMap.get(expert.user_id)
            if (!user?.username) return null
            return {
              id: expert.user_id,
              title: (isEn ? expert.display_name_en : expert.display_name)
                || (isEn ? user.display_name_en : user.display_name)
                || user.display_name
                || user.username,
              subtitle: (isEn ? expert.primary_specialty_en : expert.primary_specialty) || `@${user.username}`,
              imageUrl: user.avatar_url,
              href: `/${lang}/experts/${user.username}`,
              badge: "EXPERT",
            }
          })
          .filter(Boolean) as ProfileResult[]

        const postItems: ContentResult[] = (postsResult.data || []).map((post) => {
          const type: ContentType = post.type === "gear_review"
            ? "gear"
            : post.type === "event" || post.event_origin_id
              ? "event"
              : "tasting"
          return {
            key: `post-${post.id}`,
            id: post.id,
            type,
            title: post.title || (isEn ? "Untitled post" : "無題の投稿"),
            summary: post.description || post.tastes,
            imageUrl: firstImage(post.image_urls),
            href: `/${lang}/posts/${post.id}`,
            createdAt: post.created_at || "",
          }
        })
        const blogItems: ContentResult[] = (blogsResult.data || []).map((blog) => ({
          key: `blog-${blog.id}`,
          id: blog.id,
          type: "blog",
          title: blog.title || (isEn ? "Untitled blog" : "無題のブログ"),
          summary: blog.content,
          imageUrl: firstImage(blog.image_urls),
          href: `/${lang}/blogs/${blog.id}`,
          createdAt: blog.created_at || "",
        }))
        const recipeItems: ContentResult[] = (recipesResult.data || []).map((recipe) => ({
          key: `verification-${recipe.id}`,
          id: recipe.id,
          type: "verification",
          title: recipe.recipe_title || (isEn ? "Untitled verification" : "無題の検証"),
          summary: recipe.bean_name || recipe.log_purpose,
          imageUrl: firstImage(recipe.image_urls),
          href: `/${lang}/recipes/${recipe.id}`,
          createdAt: recipe.created_at || "",
        }))

        if (!cancelled) {
          setUsers(userProfiles)
          setOrigins(originProfiles)
          setExperts(expertProfiles)
          setContent([...postItems, ...blogItems, ...recipeItems].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          ))
        }
      } catch (error) {
        console.error("Search error:", error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchResults()
    return () => { cancelled = true }
  }, [query, lang, isEn, filterSignature])

  const sections: Array<{ type: ContentType; items: ContentResult[] }> = (
    ["tasting", "gear", "event", "blog", "verification"] as ContentType[]
  ).map((type) => ({ type, items: content.filter((item) => item.type === type) }))

  const ProfileSection = ({ title, items }: { title: string; items: ProfileResult[] }) => (
    <section>
      <div className="flex items-end justify-between border-b border-border pb-3">
        <h2 className="text-sm font-bold tracking-[0.12em] text-foreground">{title}</h2>
        <span className="font-mono text-[10px] text-subtle">{items.length}</span>
      </div>
      {items.length === 0 ? (
        <p className="mt-5 text-xs text-subtle">{ui.emptyProfiles}</p>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link key={item.id} href={item.href} className="group flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:shadow-sm">
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border bg-neutral-50">
                {item.imageUrl ? (
                  <Image src={item.imageUrl} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs font-semibold">{item.title.slice(0, 1).toUpperCase()}</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                {item.badge && <span className="text-[8px] font-bold tracking-widest text-subtle">{item.badge}</span>}
                <p className="truncate text-sm font-semibold text-foreground">{item.title}</p>
                {item.subtitle && <p className="truncate text-[10px] text-subtle">{item.subtitle}</p>}
              </div>
              <span className="text-subtle transition group-hover:translate-x-0.5 group-hover:text-foreground">→</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  )

  if (loading) return <GridSkeleton />

  const noResults = users.length + origins.length + experts.length + content.length === 0

  return (
    <main className="mx-auto min-h-screen max-w-7xl space-y-14 px-5 py-10 sm:px-8 md:py-14 lg:px-12">
      <header className="border-b border-border pb-8">
        <p className="text-[10px] font-bold tracking-[0.2em] text-subtle">SEARCH</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{ui.title}</h1>
        <p className="mt-3 text-xs text-subtle sm:text-sm">
          {query ? `“${query}”` : (isEn ? "Combined filter search" : "組み合わせ条件で検索")}
        </p>
      </header>

      {noResults ? (
        <div className="rounded-2xl border border-dashed border-border px-6 py-16 text-center text-sm text-subtle">{ui.noResults}</div>
      ) : (
        <div className="space-y-14">
          {users.length > 0 && <ProfileSection title={ui.users} items={users} />}
          {origins.length > 0 && <ProfileSection title={ui.origins} items={origins} />}
          {experts.length > 0 && <ProfileSection title={ui.experts} items={experts} />}

          {sections.filter(({ items }) => items.length > 0).map(({ type, items }) => (
            <section key={type}>
              <div className="flex items-end justify-between border-b border-border pb-3">
                <h2 className="text-sm font-bold tracking-[0.12em] text-foreground">{labels[type]}</h2>
                <span className="font-mono text-[10px] text-subtle">{items.length}</span>
              </div>
              {items.length === 0 ? (
                <p className="mt-5 text-xs text-subtle">{ui.emptyContent}</p>
              ) : (
                <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
                  {items.map((item) => (
                    <Link key={item.key} href={item.href} className="group min-w-0">
                      <article>
                        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-border bg-surface">
                          {item.imageUrl ? (
                            <Image src={item.imageUrl} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw" className="object-cover transition duration-500 group-hover:scale-[1.02]" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] tracking-widest text-subtle">NO IMAGE</div>
                          )}
                          <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-[9px] font-medium text-white backdrop-blur">{labels[type]}</span>
                        </div>
                        <div className="mt-3 min-w-0 px-0.5">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:underline">{item.title}</h3>
                          {item.summary && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-subtle">{item.summary}</p>}
                        </div>
                      </article>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </main>
  )
}
