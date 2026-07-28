import type { MetadataRoute } from "next"
import { createClient } from "@supabase/supabase-js"
import { SITE_URL } from "@/lib/site"

export const revalidate = 3600

const siteUrl = SITE_URL
const languages = ["ja", "en"] as const
const pageSize = 1000

type DatedRow = {
  updated_at?: string | null
  created_at?: string | null
}

type ContentRow = DatedRow & {
  id: string
  lang?: string | null
}

type PostRow = ContentRow & {
  type?: string | null
  market_origin?: Array<{ slug: string | null }> | { slug: string | null } | null
  source_origin?: Array<{ slug: string | null }> | { slug: string | null } | null
  post_gears?: Array<{
    gears?: Array<{ slug: string | null }> | { slug: string | null } | null
  }> | null
}

type OriginRow = DatedRow & {
  slug: string
}

type UserRow = DatedRow & {
  id: string
  username: string | null
}

type ExpertRow = DatedRow & {
  user_id: string
}

function asDate(value?: string | null): Date | undefined {
  if (!value) return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date
}

function contentLanguage(value?: string | null): (typeof languages)[number] {
  return value === "en" ? "en" : "ja"
}

function relationSlug(
  relation?: Array<{ slug: string | null }> | { slug: string | null } | null,
): string | null {
  if (Array.isArray(relation)) return relation[0]?.slug || null
  return relation?.slug || null
}

function postGearSlug(postGears?: PostRow["post_gears"]): string | null {
  for (const postGear of postGears || []) {
    const slug = relationSlug(postGear.gears)
    if (slug) return slug
  }
  return null
}

function entry(
  path: string,
  options: {
    lastModified?: Date
    changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"]
    priority?: number
  } = {},
): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`,
    ...options,
  }
}

async function collectRows<T>(
  loadPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message?: string } | null }>,
): Promise<T[]> {
  const rows: T[] = []

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await loadPage(from, from + pageSize - 1)
    if (error) throw new Error(error.message || "Failed to build sitemap")

    const page = data || []
    rows.push(...page)
    if (page.length < pageSize) break
  }

  return rows
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = languages.flatMap((lang) => [
    entry(`/${lang}`, { changeFrequency: "daily", priority: 1 }),
    entry(`/${lang}/origins`, { changeFrequency: "weekly", priority: 0.9 }),
    entry(`/${lang}/experts`, { changeFrequency: "weekly", priority: 0.9 }),
    entry(`/${lang}/journal`, { changeFrequency: "daily", priority: 0.8 }),
    entry(`/${lang}/search`, { changeFrequency: "weekly", priority: 0.7 }),
    entry(`/${lang}/members`, { changeFrequency: "monthly", priority: 0.6 }),
    entry(`/${lang}/guide`, { changeFrequency: "monthly", priority: 0.5 }),
    entry(`/${lang}/contact`, { changeFrequency: "yearly", priority: 0.3 }),
    entry(`/${lang}/terms`, { changeFrequency: "yearly", priority: 0.2 }),
    entry(`/${lang}/privacy`, { changeFrequency: "yearly", priority: 0.2 }),
    entry(`/${lang}/legal`, { changeFrequency: "yearly", priority: 0.2 }),
  ])

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnonKey) return staticPages

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  try {
    const [posts, blogs, recipes, origins, users, experts] = await Promise.all([
      collectRows<PostRow>((from, to) =>
        supabase
          .from("posts")
          .select(`
            id,
            lang,
            type,
            updated_at,
            created_at,
            market_origin:origins!posts_market_origin_id_fkey(slug),
            source_origin:origins!posts_source_origin_id_fkey(slug),
            post_gears(
              gears(slug)
            )
          `)
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
      collectRows<ContentRow>((from, to) =>
        supabase
          .from("blogs")
          .select("id, lang, updated_at, created_at")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
      collectRows<ContentRow>((from, to) =>
        supabase
          .from("pro_recipes")
          .select("id, lang, updated_at, created_at")
          .eq("visibility", "public")
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
      collectRows<OriginRow>((from, to) =>
        supabase
          .from("origins")
          .select("slug, updated_at, created_at")
          .not("slug", "is", null)
          .order("id", { ascending: true })
          .range(from, to),
      ),
      collectRows<UserRow>((from, to) =>
        supabase
          .from("users")
          .select("id, username, updated_at, created_at")
          .eq("is_active", true)
          .not("username", "is", null)
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
      collectRows<ExpertRow>((from, to) =>
        supabase
          .from("experts")
          .select("user_id, updated_at, created_at")
          .eq("is_public", true)
          .order("created_at", { ascending: false })
          .range(from, to),
      ),
    ])

    const postPages = posts.map((post) => {
      const segments = (
        post.type === "gear_review"
          ? [postGearSlug(post.post_gears), post.id]
          : [relationSlug(post.market_origin), relationSlug(post.source_origin), post.id]
      ).filter((segment): segment is string => Boolean(segment))

      return entry(`/${contentLanguage(post.lang)}/posts/${segments.map(encodeURIComponent).join("/")}`, {
        lastModified: asDate(post.updated_at || post.created_at),
        changeFrequency: "monthly",
        priority: 0.8,
      })
    })

    const blogPages = blogs.map((blog) =>
      entry(`/${contentLanguage(blog.lang)}/blogs/${blog.id}`, {
        lastModified: asDate(blog.updated_at || blog.created_at),
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    )

    const recipePages = recipes.map((recipe) =>
      entry(`/${contentLanguage(recipe.lang)}/recipes/${recipe.id}`, {
        lastModified: asDate(recipe.updated_at || recipe.created_at),
        changeFrequency: "monthly",
        priority: 0.7,
      }),
    )

    const originPages = origins.flatMap((origin) =>
      languages.map((lang) =>
        entry(`/${lang}/origins/${encodeURIComponent(origin.slug)}`, {
          lastModified: asDate(origin.updated_at || origin.created_at),
          changeFrequency: "monthly",
          priority: 0.7,
        }),
      ),
    )

    const activeUsers = new Map(
      users
        .filter((user): user is UserRow & { username: string } => Boolean(user.username))
        .map((user) => [user.id, user]),
    )

    const userPages = Array.from(activeUsers.values()).flatMap((user) =>
      languages.map((lang) =>
        entry(`/${lang}/users/${encodeURIComponent(user.username)}`, {
          lastModified: asDate(user.updated_at || user.created_at),
          changeFrequency: "weekly",
          priority: 0.5,
        }),
      ),
    )

    const expertPages = experts.flatMap((expert) => {
      const user = activeUsers.get(expert.user_id)
      if (!user?.username) return []

      return languages.map((lang) =>
        entry(`/${lang}/experts/${encodeURIComponent(user.username!)}`, {
          lastModified: asDate(expert.updated_at || expert.created_at || user.updated_at),
          changeFrequency: "weekly",
          priority: 0.7,
        }),
      )
    })

    return [
      ...staticPages,
      ...originPages,
      ...expertPages,
      ...userPages,
      ...postPages,
      ...blogPages,
      ...recipePages,
    ]
  } catch (error) {
    console.error("Failed to generate dynamic sitemap:", error)
    return staticPages
  }
}
