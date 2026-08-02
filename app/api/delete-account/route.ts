import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { r2 } from "@/lib/r2"

const service = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

type ImageRow = { image_urls: string[] | string | null }

function urlsFromRow(row: ImageRow): string[] {
  if (Array.isArray(row.image_urls)) return row.image_urls
  return typeof row.image_urls === "string" && row.image_urls.trim()
    ? [row.image_urls]
    : []
}

function r2KeyFromUrl(value: string): string | null {
  try {
    const url = new URL(value)
    const allowedHosts = [
      process.env.R2_PUBLIC_URL,
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    ]
      .filter(Boolean)
      .map((baseUrl) => new URL(baseUrl!).hostname)

    if (!allowedHosts.includes(url.hostname)) return null
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ""))
    return key && !key.includes("..") ? key : null
  } catch {
    return null
  }
}

async function collectReferencedR2Keys(userId: string): Promise<Set<string>> {
  const [posts, blogs, recipes, user] = await Promise.all([
    service.from("posts").select("image_urls").eq("user_id", userId),
    service.from("blogs").select("image_urls").eq("user_id", userId),
    service.from("pro_recipes").select("image_urls").eq("user_id", userId),
    service
      .from("users")
      .select("avatar_url, cover_url")
      .eq("id", userId)
      .maybeSingle(),
  ])

  for (const result of [posts, blogs, recipes, user]) {
    if (result.error) throw result.error
  }

  const urls = [
    ...(posts.data || []).flatMap(urlsFromRow),
    ...(blogs.data || []).flatMap(urlsFromRow),
    ...(recipes.data || []).flatMap(urlsFromRow),
    user.data?.avatar_url,
    user.data?.cover_url,
  ].filter((url): url is string => Boolean(url))

  return new Set(
    urls
      .map(r2KeyFromUrl)
      .filter((key): key is string => Boolean(key))
  )
}

async function collectUserOwnedR2Keys(userId: string): Promise<Set<string>> {
  const keys = await collectReferencedR2Keys(userId)
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error("R2_BUCKET_NAME is not configured")

  // Includes tmp files, committed post images, avatars, covers, and orphaned
  // uploads. Current upload keys retain the user UUID as a complete path part.
  let continuationToken: string | undefined
  do {
    const page = await r2.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
      })
    )

    for (const object of page.Contents || []) {
      if (!object.Key) continue
      const segments = object.Key.split("/")
      if (segments.includes(userId)) keys.add(object.Key)
    }
    continuationToken = page.IsTruncated
      ? page.NextContinuationToken
      : undefined
  } while (continuationToken)

  return keys
}

async function deleteR2Keys(keys: Set<string>) {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket || keys.size === 0) return

  const allKeys = Array.from(keys)
  for (let start = 0; start < allKeys.length; start += 1000) {
    const batch = allKeys.slice(start, start + 1000)
    const result = await r2.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: {
          Objects: batch.map((Key) => ({ Key })),
          Quiet: false,
        },
      })
    )
    if (result.Errors?.length) {
      throw new Error(
        `R2 deletion failed for ${result.Errors.length} object(s)`
      )
    }
  }
}

async function clearOriginOwnerProfile(userId: string) {
  // origins may be shared master data, so the row itself is retained. Remove
  // the deleted account's owner-only profile information before detaching it.
  const { error } = await service
    .from("origins")
    .update({
      user_id: null,
      links: [],
      headquarters: null,
      headquarters_en: null,
      branches: [],
      branches_en: [],
      display_name: null,
      display_name_en: null,
      pending_display_name: null,
      pending_display_name_en: null,
      is_approved: false,
      is_profile_completed: false,
      bio: null,
      bio_en: null,
      address: null,
      address_en: null,
      primary_specialty: null,
      primary_specialty_en: null,
      sub_specialties: [],
      sub_specialties_en: [],
      is_public: false,
    })
    .eq("user_id", userId)

  if (error) throw error
}

export async function POST(request: Request) {
  try {
    const auth = await createServerClient()
    const {
      data: { user: requester },
    } = await auth.auth.getUser()
    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const userId = typeof body?.userId === "string" ? body.userId : ""
    if (!userId) {
      return NextResponse.json({ error: "No userId" }, { status: 400 })
    }

    const { data: requesterProfile, error: requesterError } = await service
      .from("users")
      .select("role")
      .eq("id", requester.id)
      .maybeSingle()
    if (requesterError) throw requesterError

    const canDelete =
      requester.id === userId || requesterProfile?.role === "admin"
    if (!canDelete) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Collect first so database deletion cannot remove the URLs needed for
    // legacy objects whose key did not contain the user UUID.
    const r2Keys = await collectUserOwnedR2Keys(userId)

    // R2 is external to PostgreSQL and cannot share its transaction. Refuse to
    // delete the account if any object deletion fails.
    await deleteR2Keys(r2Keys)
    await clearOriginOwnerProfile(userId)

    const { error: authError } = await service.auth.admin.deleteUser(userId)
    if (authError) throw authError

    // Normally auth.users -> public.users ON DELETE CASCADE handles this.
    // Keeping the explicit delete makes the endpoint safe on older databases.
    const { error: databaseError } = await service
      .from("users")
      .delete()
      .eq("id", userId)
    if (databaseError) throw databaseError

    // Compatibility fallback for databases created before
    // pro_recipes.user_id received its ON DELETE CASCADE foreign key.
    // With the current constraint this is a harmless no-op.
    const { error: legacyProRecipesError } = await service
      .from("pro_recipes")
      .delete()
      .eq("user_id", userId)
    if (legacyProRecipesError) throw legacyProRecipesError

    return NextResponse.json({
      success: true,
      deletedR2Objects: r2Keys.size,
    })
  } catch (error) {
    console.error("Account deletion failed:", error)
    return NextResponse.json(
      { error: "Account deletion failed" },
      { status: 500 }
    )
  }
}
