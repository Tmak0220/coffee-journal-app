import { NextRequest, NextResponse } from "next/server"
import { DeleteObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { r2 } from "@/lib/r2"

const ITEMS_PER_PAGE = 24

type ImageReference = {
  type: "post" | "blog" | "verification" | "avatar" | "cover"
  id: string
  userId: string
  href: string | null
  label: string
}

const service = () => createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

async function requireAdmin() {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await service().from("users").select("role").eq("id", user.id).maybeSingle()
  return profile?.role === "admin" ? user : null
}

async function findReferences(url: string): Promise<ImageReference[]> {
  const admin = service()
  const [posts, blogs, recipes, avatars, covers] = await Promise.all([
    admin.from("posts").select("id, user_id, title, lang").contains("image_urls", [url]),
    admin.from("blogs").select("id, user_id, title, lang").contains("image_urls", [url]),
    admin.from("pro_recipes").select("id, user_id, recipe_title, lang").contains("image_urls", [url]),
    admin.from("users").select("id, username, display_name").eq("avatar_url", url),
    admin.from("users").select("id, username, display_name").eq("cover_url", url),
  ])

  return [
    ...(posts.data || []).map((row: any) => ({
      type: "post" as const,
      id: row.id,
      userId: row.user_id,
      href: `/${row.lang || "ja"}/posts/${row.id}`,
      label: row.title || "Post",
    })),
    ...(blogs.data || []).map((row: any) => ({
      type: "blog" as const,
      id: row.id,
      userId: row.user_id,
      href: `/${row.lang || "ja"}/blogs/${row.id}`,
      label: row.title || "Blog",
    })),
    ...(recipes.data || []).map((row: any) => ({
      type: "verification" as const,
      id: row.id,
      userId: row.user_id,
      href: `/${row.lang || "ja"}/recipes/${row.id}`,
      label: row.recipe_title || "Verification",
    })),
    ...(avatars.data || []).map((row: any) => ({
      type: "avatar" as const,
      id: row.id,
      userId: row.id,
      href: row.username ? `/ja/users/${row.username}` : null,
      label: row.display_name || row.username || "Avatar",
    })),
    ...(covers.data || []).map((row: any) => ({
      type: "cover" as const,
      id: row.id,
      userId: row.id,
      href: row.username ? `/ja/users/${row.username}` : null,
      label: row.display_name || row.username || "Cover",
    })),
  ]
}

export async function GET(request: NextRequest) {
  try {
    if (!await requireAdmin()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(0, parseInt(searchParams.get("page") || "0", 10))
    const sortOrder = searchParams.get("sortOrder") === "oldest" ? "oldest" : "newest"
    const selectedYearMonth = searchParams.get("selectedYearMonth") || "all"
    const bucketName = process.env.R2_BUCKET_NAME!

    let allObjects: any[] = []
    let continuationToken: string | undefined
    do {
      const response = await r2.send(new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1000,
        ContinuationToken: continuationToken,
      }))
      allObjects.push(...(response.Contents || []))
      continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined
    } while (continuationToken)

    const baseUrl = (process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL)!.replace(/\/$/, "")
    let images = allObjects
      .filter((item) => /\.(jpg|jpeg|png|webp|gif|avif)$/i.test(item.Key || ""))
      .map((item) => {
        const key = item.Key || ""
        const pathParts = key.split("/")
        const yearIndex = pathParts.findIndex((part: string) => /^\d{4}$/.test(part))
        const hasPathDate = yearIndex >= 0 && /^\d{2}$/.test(pathParts[yearIndex + 1] || "")
        const sourceDate = item.LastModified ? new Date(item.LastModified) : new Date()
        const filterYearMonth = hasPathDate
          ? `${pathParts[yearIndex]}-${pathParts[yearIndex + 1]}`
          : sourceDate.toISOString().slice(0, 7)
        return {
          key,
          url: `${baseUrl}/${key}`,
          size: item.Size || 0,
          lastModified: sourceDate.toISOString(),
          filterYearMonth,
          timestamp: sourceDate.getTime(),
          isTemporary: key.startsWith("tmp/"),
        }
      })

    if (selectedYearMonth !== "all") {
      images = images.filter((image) => image.filterYearMonth === selectedYearMonth)
    }
    images.sort((a, b) => sortOrder === "newest" ? b.timestamp - a.timestamp : a.timestamp - b.timestamp)

    const from = page * ITEMS_PER_PAGE
    const paginatedImages = images.slice(from, from + ITEMS_PER_PAGE)
    const enrichedImages = await Promise.all(paginatedImages.map(async (image) => ({
      ...image,
      references: image.isTemporary ? [] : await findReferences(image.url),
    })))

    return NextResponse.json({
      images: enrichedImages,
      totalCount: images.length,
      hasMore: from + ITEMS_PER_PAGE < images.length,
    })
  } catch (error: any) {
    console.error("R2 fetch error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!await requireAdmin()) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    const { action, key, message } = await request.json()
    if (!key || !["delete", "warn"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const baseUrl = (process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_R2_PUBLIC_URL)!.replace(/\/$/, "")
    const url = `${baseUrl}/${key}`
    const references = await findReferences(url)
    const admin = service()

    if (action === "warn") {
      const warning = String(message || "").trim()
      if (!warning) return NextResponse.json({ error: "Message is required" }, { status: 400 })
      const userIds = Array.from(new Set(references.map((reference) => reference.userId)))
      if (!userIds.length) return NextResponse.json({ error: "Image owner not found" }, { status: 404 })
      const { error } = await admin.from("admin_notifications").insert(userIds.map((userId) => ({
        user_id: userId,
        type: "content_warning",
        requested_display_name: "投稿に関する運営からの警告",
        admin_comment: warning,
        status: "approved",
      })))
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // DB参照を先に外し、削除後に壊れた画像URLが残らないようにする。
    for (const reference of references) {
      if (reference.type === "post" || reference.type === "blog" || reference.type === "verification") {
        const table = reference.type === "post" ? "posts" : reference.type === "blog" ? "blogs" : "pro_recipes"
        const { data: row } = await admin.from(table).select("image_urls").eq("id", reference.id).maybeSingle()
        const nextUrls = Array.isArray(row?.image_urls) ? row.image_urls.filter((item: string) => item !== url) : []
        const { error } = await admin.from(table).update({ image_urls: nextUrls }).eq("id", reference.id)
        if (error) throw error
      } else {
        const column = reference.type === "avatar" ? "avatar_url" : "cover_url"
        const { error } = await admin.from("users").update({ [column]: null }).eq("id", reference.userId)
        if (error) throw error
      }
    }

    await r2.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }))
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("R2 admin action error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
