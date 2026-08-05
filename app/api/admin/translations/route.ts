import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { isAdminUser, translateAdminResource, type TranslatableResource } from "@/lib/admin-content-translation"

const resources: TranslatableResource[] = ["posts", "blogs", "pro_recipes", "admin_journals"]
const PAGE_SIZE = 1000
const isResource = (value: unknown): value is TranslatableResource => typeof value === "string" && resources.includes(value as TranslatableResource)

type TranslationListRow = {
  id: string
  created_at: string | null
  translation_group_id: string | null
  [key: string]: unknown
}

async function fetchAllByLanguage(
  db: any,
  resource: TranslatableResource,
  fields: string,
  lang: "ja" | "en",
) {
  const rows: TranslationListRow[] = []

  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await db
      .from(resource)
      .select(fields)
      .eq("lang", lang)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    const page = (data || []) as unknown as TranslationListRow[]
    rows.push(...page)
    if (page.length < PAGE_SIZE) break
  }

  return rows
}

async function authenticate() {
  const auth = await createServerClient()
  const { data: { user } } = await auth.auth.getUser()
  return user && await isAdminUser(user.id) ? user : null
}

export async function GET() {
  if (!await authenticate()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const db = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const items: Array<{ resource: TranslatableResource; id: string; title: string; created_at: string | null }> = []
  for (const resource of resources) {
    const titleField = resource === "pro_recipes" ? "recipe_title" : "title"
    try {
      const [japaneseRows, englishRows] = await Promise.all([
        fetchAllByLanguage(db, resource, `id, ${titleField}, created_at, translation_group_id`, "ja"),
        fetchAllByLanguage(db, resource, "id, created_at, translation_group_id", "en"),
      ])
      const translatedGroupIds = new Set(
        englishRows.map(row => row.translation_group_id).filter((id): id is string => Boolean(id)),
      )

      for (const row of japaneseRows) {
        const hasEnglish = Boolean(row.translation_group_id && translatedGroupIds.has(row.translation_group_id))
        if (!hasEnglish) {
          items.push({
            resource,
            id: row.id,
            title: String(row[titleField] || "Untitled"),
            created_at: row.created_at,
          })
        }
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Failed to load translation candidates" },
        { status: 500 },
      )
    }
  }
  items.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  if (!await authenticate()) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const body = await request.json().catch(() => ({}))
  if (!isResource(body.resource) || typeof body.id !== "string") return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  try {
    return NextResponse.json(await translateAdminResource(body.resource, body.id))
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Translation failed" }, { status: 500 })
  }
}
