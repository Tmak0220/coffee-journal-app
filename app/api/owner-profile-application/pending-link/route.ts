import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { serviceClient } from "@/lib/ec-integrations"

const INITIAL_OWNER_REQUEST_TYPES = new Set(["claim_origin", "new_owner_profile_activation"])

export async function POST(request: Request) {
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => null)
  const requestId = typeof body?.requestId === "string" ? body.requestId : ""
  if (!requestId) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const admin = serviceClient()
  const { data: application, error: applicationError } = await admin
    .from("admin_notifications")
    .select("id, user_id, type, status, request_payload")
    .eq("id", requestId)
    .eq("user_id", user.id)
    .maybeSingle()

  if (applicationError) return NextResponse.json({ error: applicationError.message }, { status: 500 })
  if (
    !application ||
    application.status !== "pending" ||
    !INITIAL_OWNER_REQUEST_TYPES.has(application.type)
  ) {
    return NextResponse.json({ error: "Pending owner application not found" }, { status: 404 })
  }

  const payload = application.request_payload && typeof application.request_payload === "object"
    ? application.request_payload as Record<string, unknown>
    : {}
  const originId = Number(payload.origin_id)
  if (!Number.isInteger(originId) || originId <= 0) {
    return NextResponse.json({ error: "Target origin was not found" }, { status: 404 })
  }

  // 初回申請中のレコードは審査対象IDで追跡し、所有権は承認時にだけ設定する。
  const { data: origin, error: originError } = await admin
    .from("origins")
    .select("id, user_id")
    .eq("id", originId)
    .maybeSingle()
  if (originError) return NextResponse.json({ error: originError.message }, { status: 500 })
  if (!origin) return NextResponse.json({ error: "Target origin was not found" }, { status: 404 })
  if (origin.user_id && origin.user_id !== user.id) {
    return NextResponse.json({ error: "This origin belongs to another account" }, { status: 409 })
  }

  const { data: updatedOrigin, error: updateError } = await admin
    .from("origins")
    .update({ user_id: null, is_profile_completed: true, is_approved: false, is_public: false })
    .eq("id", originId)
    .select("id, user_id")
    .single()
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })
  if (updatedOrigin.user_id !== null) {
    return NextResponse.json({ error: "Temporary owner link could not be removed" }, { status: 500 })
  }

  return NextResponse.json({ success: true, originId })
}
