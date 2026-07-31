import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { serviceClient } from "@/lib/ec-integrations"

export async function POST() {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const admin = serviceClient()
  const { data: account, error: accountError } = await admin
    .from("users")
    .select("membership_tier, role")
    .eq("id", user.id)
    .maybeSingle()

  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 500 })
  if (account?.membership_tier !== "business" && account?.role !== "admin") {
    return NextResponse.json({ error: "Business membership required" }, { status: 403 })
  }

  const { data: latestRequest, error: latestRequestError } = await admin
    .from("admin_notifications")
    .select("type, status, request_payload, created_at")
    .eq("user_id", user.id)
    .in("type", ["claim_origin", "new_owner_profile_activation"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (latestRequestError) return NextResponse.json({ error: latestRequestError.message }, { status: 500 })
  if (!latestRequest) return NextResponse.json({ repaired: false }, { status: 404 })

  const payload = latestRequest.request_payload && typeof latestRequest.request_payload === "object"
    ? latestRequest.request_payload as Record<string, unknown>
    : {}
  const originId = Number(payload.origin_id)
  if (!Number.isInteger(originId) || originId <= 0) {
    return NextResponse.json({ repaired: false }, { status: 404 })
  }

  const { data: origin, error: originError } = await admin
    .from("origins")
    .select("id, user_id")
    .eq("id", originId)
    .maybeSingle()
  if (originError) return NextResponse.json({ error: originError.message }, { status: 500 })
  if (!origin && latestRequest.status === "rejected" && latestRequest.type === "new_owner_profile_activation") {
    return NextResponse.json({
      repaired: false,
      originId,
      applicationStatus: latestRequest.status,
      deletedApplicationRecord: true,
    })
  }
  if (!origin || (origin.user_id && origin.user_id !== user.id)) {
    return NextResponse.json({ repaired: false }, { status: 409 })
  }

  const isNewOriginApplication =
    latestRequest.type === "new_owner_profile_activation" ||
    payload.application_kind === "new_origin" ||
    payload.is_new_origin === true

  // 新規作成申請の見送りでは審査用originを残さない。
  // 入力内容はadmin_notifications.request_payloadに残るため、再申請フォームは復元できる。
  if (latestRequest.status === "rejected" && isNewOriginApplication) {
    const { data: deletedOrigin, error: deleteError } = await admin
      .from("origins")
      .delete()
      .eq("id", originId)
      .select("id")
      .maybeSingle()
    if (deleteError) {
      return NextResponse.json({
        error: `Rejected owner application record could not be deleted: ${deleteError.message}`,
      }, { status: 500 })
    }
    if (!deletedOrigin) {
      const { data: remainingOrigin, error: verifyError } = await admin
        .from("origins")
        .select("id")
        .eq("id", originId)
        .maybeSingle()
      if (verifyError) return NextResponse.json({ error: verifyError.message }, { status: 500 })
      if (remainingOrigin) {
        return NextResponse.json({
          error: "Rejected owner application record is still present",
        }, { status: 409 })
      }
    }
    return NextResponse.json({
      repaired: true,
      originId,
      applicationStatus: latestRequest.status,
      deletedApplicationRecord: true,
    })
  }

  const statePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (latestRequest.status === "approved") {
    statePayload.user_id = user.id
    statePayload.is_profile_completed = true
    statePayload.is_approved = true
    statePayload.is_public = true
    statePayload.pending_display_name = null
    statePayload.pending_display_name_en = null

    const lang = payload.lang === "en" ? "en" : "ja"
    const hasPayloadField = (key: string) => Object.prototype.hasOwnProperty.call(payload, key)
    if (Array.isArray(payload.links)) statePayload.links = payload.links

    if (lang === "en") {
      if (typeof payload.display_name === "string" && payload.display_name.trim()) {
        statePayload.display_name_en = payload.display_name.trim()
      }
      if (hasPayloadField("bio")) statePayload.bio_en = payload.bio ?? null
      if (hasPayloadField("headquarters")) statePayload.headquarters_en = payload.headquarters ?? null
      if (Array.isArray(payload.branches)) statePayload.branches_en = payload.branches
    } else {
      if (typeof payload.display_name === "string" && payload.display_name.trim()) {
        statePayload.display_name = payload.display_name.trim()
      }
      if (hasPayloadField("bio")) statePayload.bio = payload.bio ?? null
      if (hasPayloadField("headquarters")) statePayload.headquarters = payload.headquarters ?? null
      if (Array.isArray(payload.branches)) statePayload.branches = payload.branches
    }
  } else if (latestRequest.status === "pending") {
    statePayload.user_id = null
    statePayload.is_profile_completed = true
    statePayload.is_approved = false
    statePayload.is_public = false
  } else {
    statePayload.user_id = null
    statePayload.is_profile_completed = false
    statePayload.is_approved = false
    statePayload.is_public = false
    statePayload.pending_display_name = null
    statePayload.pending_display_name_en = null
  }

  const { error: updateError } = await admin
    .from("origins")
    .update(statePayload)
    .eq("id", originId)
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  if (latestRequest.status === "approved") {
    const userPayload: Record<string, unknown> = {}
    if (typeof payload.avatar_url === "string") userPayload.avatar_url = payload.avatar_url
    if (typeof payload.cover_url === "string") userPayload.cover_url = payload.cover_url
    if (Object.keys(userPayload).length > 0) {
      const { error: userUpdateError } = await admin.from("users").update(userPayload).eq("id", user.id)
      if (userUpdateError) return NextResponse.json({ error: userUpdateError.message }, { status: 500 })
    }

  }

  return NextResponse.json({ repaired: true, originId, applicationStatus: latestRequest.status })
}
