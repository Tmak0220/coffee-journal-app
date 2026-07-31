import { DeleteObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase-server"

type ContentType = "tasting" | "event" | "gear" | "blog" | "verification"
type ContentRecord = {
  id: string
  user_id: string
  image_urls: unknown
  type?: string | null
}

const TABLE_BY_TYPE: Record<ContentType, "posts" | "blogs" | "pro_recipes"> = {
  tasting: "posts",
  event: "posts",
  gear: "posts",
  blog: "blogs",
  verification: "pro_recipes",
}

const isContentType = (value: unknown): value is ContentType =>
  typeof value === "string" && value in TABLE_BY_TYPE

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const r2KeyFromUrl = (value: string): string | null => {
  try {
    const url = new URL(value)
    const allowedOrigins = [
      process.env.R2_PUBLIC_URL,
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    ].filter(Boolean).map(item => new URL(item!).origin)
    if (!allowedOrigins.includes(url.origin)) return null
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""))
  } catch {
    return null
  }
}

async function deleteRows(table: string, column: string, id: string) {
  const { error } = await admin.from(table).delete().eq(column, id)
  if (error) throw error
}

export async function POST(request: NextRequest) {
  try {
    const { id, type } = await request.json()
    if (typeof id !== "string" || !isContentType(type)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const auth = await createServerClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const table = TABLE_BY_TYPE[type]
    const result = table === "posts"
      ? await admin.from("posts").select("id, user_id, image_urls, type").eq("id", id).maybeSingle()
      : table === "blogs"
        ? await admin.from("blogs").select("id, user_id, image_urls").eq("id", id).maybeSingle()
        : await admin.from("pro_recipes").select("id, user_id, image_urls").eq("id", id).maybeSingle()
    const record = result.data as ContentRecord | null
    const fetchError = result.error

    if (fetchError) throw fetchError
    if (!record) return NextResponse.json({ error: "Content not found" }, { status: 404 })
    if (record.user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    if (type === "tasting" && (record.type === "event" || record.type === "gear_review")) return NextResponse.json({ error: "Content type mismatch" }, { status: 400 })
    if (type === "event" && record.type !== "event") return NextResponse.json({ error: "Content type mismatch" }, { status: 400 })
    if (type === "gear" && record.type !== "gear_review") return NextResponse.json({ error: "Content type mismatch" }, { status: 400 })

    if (table === "posts") {
      for (const childTable of ["likes", "bookmarks", "post_views", "post_tastes", "post_gears", "post_processes", "post_varieties", "origin_post_links", "expert_post_links", "recipes"]) {
        await deleteRows(childTable, "post_id", id)
      }
    } else if (table === "blogs") {
      await deleteRows("blog_bookmarks", "blog_id", id)
    } else {
      await deleteRows("pro_recipe_bookmarks", "pro_recipe_id", id)
      await deleteRows("pro_recipe_gears", "pro_recipe_id", id)
    }

    await deleteRows(table, "id", id)

    const imageUrls = Array.isArray(record.image_urls)
      ? record.image_urls.filter((url: unknown): url is string => typeof url === "string")
      : []
    const failedImageUrls: string[] = []
    for (const imageUrl of imageUrls) {
      const key = r2KeyFromUrl(imageUrl)
      if (!key) continue
      try {
        await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }))
      } catch {
        failedImageUrls.push(imageUrl)
      }
    }

    return NextResponse.json({ success: true, failedImageUrls })
  } catch (error) {
    console.error("Delete content error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    )
  }
}
