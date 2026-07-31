import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { serviceClient } from "@/lib/ec-integrations"

const OWNER_REQUEST_TYPES = new Set([
  "claim_origin",
  "display_name_change",
  "owner_display_name_change",
  "new_owner_profile_activation",
])

export async function POST(request: Request) {
  try {
    const auth = await createClient()
    const { data: { user }, error: authError } = await auth.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({
        error: authError?.message || "管理者としてログインしていることを確認してください。",
      }, { status: 401 })
    }

    const admin = serviceClient()
    const { data: operator, error: operatorError } = await admin
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()
    if (operatorError) {
      return NextResponse.json({
        error: `管理者権限を確認できませんでした: ${operatorError.message}`,
      }, { status: 500 })
    }
    if (operator?.role !== "admin") {
      return NextResponse.json({
        error: "この操作には管理者アカウントでのログインが必要です。",
      }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const requestId = typeof body?.requestId === "string" ? body.requestId : ""
    const status = body?.status === "approved" || body?.status === "rejected" ? body.status : null
    const adminComment = typeof body?.adminComment === "string" && body.adminComment.trim()
      ? body.adminComment.trim()
      : null
    if (!requestId || !status) return NextResponse.json({ error: "Invalid request" }, { status: 400 })

  const { data: application, error: applicationError } = await admin
    .from("admin_notifications")
    .select("id, user_id, type, requested_display_name, requested_display_name_en, request_payload, status")
    .eq("id", requestId)
    .maybeSingle()

  if (applicationError) return NextResponse.json({ error: applicationError.message }, { status: 500 })
  if (!application || !OWNER_REQUEST_TYPES.has(application.type)) {
    return NextResponse.json({ error: "Owner profile application not found" }, { status: 404 })
  }

  const payload = application.request_payload && typeof application.request_payload === "object"
    ? application.request_payload as Record<string, unknown>
    : {}
  const isNewOriginApplication =
    application.type === "new_owner_profile_activation" ||
    payload.application_kind === "new_origin" ||
    payload.is_new_origin === true
  const parsedOriginId = Number(payload.origin_id)
  let originId = Number.isInteger(parsedOriginId) && parsedOriginId > 0 ? parsedOriginId : null

  if (!originId) {
    const { data: ownedOrigin } = await admin
      .from("origins")
      .select("id")
      .eq("user_id", application.user_id)
      .order("is_public", { ascending: false })
      .order("is_approved", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    originId = ownedOrigin?.id ?? null
  }
  if (!originId) return NextResponse.json({ error: "Target origin was not found" }, { status: 404 })

  let { data: origin, error: originError } = await admin
    .from("origins")
    .select("id, user_id, slug, name, name_ja, display_name, display_name_en, type, is_approved, is_public")
    .eq("id", originId)
    .maybeSingle()
  if (originError) return NextResponse.json({ error: originError.message }, { status: 500 })
  if (!origin) return NextResponse.json({ error: "Target origin was not found" }, { status: 404 })
  if (origin.user_id && origin.user_id !== application.user_id) {
    return NextResponse.json({ error: "This origin belongs to another account" }, { status: 409 })
  }

  const requestedName = (
    (typeof payload.display_name === "string" && payload.display_name) ||
    application.requested_display_name_en ||
    application.requested_display_name ||
    ""
  ).trim()
  const existingOriginNames = [
    origin.name,
    origin.name_ja,
    origin.display_name,
    origin.display_name_en,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    .map((value) => value.trim().toLocaleLowerCase())
  const newApplicationPointsToDifferentOrigin =
    isNewOriginApplication &&
    requestedName.length > 0 &&
    !existingOriginNames.includes(requestedName.toLocaleLowerCase())

  if (status === "approved") {
    // 過去の見送り申請から誤って既存origin IDを引き継いだ新規申請をここで修復する。
    // 既存マスタを上書きせず、承認対象となる新しい審査用レコードを作る。
    if (newApplicationPointsToDifferentOrigin) {
      const requestedType =
        typeof payload.origin_type === "string" &&
        ["market", "source", "event"].includes(payload.origin_type)
          ? payload.origin_type
          : "market"
      const slugBase = requestedName
        .toLocaleLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "") || `origin-${Date.now()}`
      let slug = slugBase
      const { data: slugCollision } = await admin
        .from("origins")
        .select("id")
        .eq("slug", slug)
        .maybeSingle()
      if (slugCollision) slug = `${slugBase}-${Date.now().toString(36)}`

      const lang = payload.lang === "en" ? "en" : "ja"
      const { data: createdOrigin, error: createOriginError } = await admin
        .from("origins")
        .insert({
          slug,
          name: requestedName,
          name_ja: lang === "ja" ? requestedName : null,
          search_keywords: requestedName,
          type: requestedType,
          user_id: null,
          is_profile_completed: true,
          is_approved: false,
          is_public: false,
        })
        .select("id, user_id, slug, name, name_ja, display_name, display_name_en, type, is_approved, is_public")
        .single()
      if (createOriginError) {
        return NextResponse.json({
          error: `新規店舗レコードを作成できませんでした: ${createOriginError.message}`,
        }, { status: 500 })
      }

      originId = createdOrigin.id
      origin = createdOrigin
      const repairedPayload = { ...payload, origin_id: originId }
      const { error: repairNotificationError } = await admin
        .from("admin_notifications")
        .update({ request_payload: repairedPayload })
        .eq("id", application.id)
      if (repairNotificationError) {
        await admin.from("origins").delete().eq("id", originId)
        return NextResponse.json({
          error: `申請データの対象店舗を更新できませんでした: ${repairNotificationError.message}`,
        }, { status: 500 })
      }
    }

    if (!origin.slug?.trim() || !origin.name?.trim()) {
      return NextResponse.json({
        error: "承認前に対象レコードのslugとnameを入力してください。",
      }, { status: 422 })
    }
    if (!["market", "source", "event"].includes(origin.type || "")) {
      return NextResponse.json({
        error: "対象レコードのtypeはmarket、source、eventのいずれかに設定してください。",
      }, { status: 422 })
    }

    const lang = payload.lang === "en" ? "en" : "ja"
    const originPayload: Record<string, unknown> = {
      user_id: application.user_id,
      is_profile_completed: true,
      is_approved: true,
      is_public: true,
      links: Array.isArray(payload.links) ? payload.links : [],
      updated_at: new Date().toISOString(),
    }
    if (
      isNewOriginApplication &&
      typeof payload.origin_type === "string" &&
      ["market", "source", "event"].includes(payload.origin_type)
    ) {
      originPayload.type = payload.origin_type
    }
    if (application.requested_display_name) {
      originPayload.display_name = application.requested_display_name
      originPayload.pending_display_name = null
    }
    if (application.requested_display_name_en) {
      originPayload.display_name_en = application.requested_display_name_en
      originPayload.pending_display_name_en = null
    }
    if (lang === "en") {
      originPayload.bio_en = payload.bio ?? null
      originPayload.headquarters_en = payload.headquarters ?? null
      originPayload.branches_en = Array.isArray(payload.branches) ? payload.branches : []
    } else {
      originPayload.bio = payload.bio ?? null
      originPayload.headquarters = payload.headquarters ?? null
      originPayload.branches = Array.isArray(payload.branches) ? payload.branches : []
    }

    const { data: updatedOrigin, error: updateError } = await admin
      .from("origins")
      .update(originPayload)
      .eq("id", originId)
      .select("id, user_id, is_profile_completed, is_approved, is_public")
      .maybeSingle()
    if (updateError) {
      return NextResponse.json({
        error: `オーナープロフィールを承認できませんでした（origins更新）: ${updateError.message}`,
      }, { status: 500 })
    }
    if (!updatedOrigin) {
      return NextResponse.json({
        error: `承認対象の店舗レコード（ID: ${originId}）を更新できませんでした。レコードが存在するか確認してください。`,
      }, { status: 404 })
    }
    if (
      updatedOrigin.user_id !== application.user_id ||
      !updatedOrigin.is_profile_completed ||
      !updatedOrigin.is_approved ||
      !updatedOrigin.is_public
    ) {
      return NextResponse.json({ error: "Owner profile approval was not applied" }, { status: 500 })
    }

    const userPayload: Record<string, unknown> = {}
    if (typeof payload.avatar_url === "string") userPayload.avatar_url = payload.avatar_url
    if (typeof payload.cover_url === "string") userPayload.cover_url = payload.cover_url
    if (Object.keys(userPayload).length > 0) {
      const { error } = await admin.from("users").update(userPayload).eq("id", application.user_id)
      if (error) {
        return NextResponse.json({
          error: `プロフィール画像情報を反映できませんでした: ${error.message}`,
        }, { status: 500 })
      }
    }

    if (Array.isArray(payload.gear_ids)) {
      const gearIds = payload.gear_ids.filter((id): id is number => typeof id === "number")
      const { error: deleteError } = await admin
        .from("profile_gears")
        .delete()
        .eq("user_id", application.user_id)
        .eq("profile_type", "owner")
      if (deleteError) {
        return NextResponse.json({
          error: `使用器具の既存設定を整理できませんでした: ${deleteError.message}`,
        }, { status: 500 })
      }
      if (gearIds.length > 0) {
        const { error: insertError } = await admin.from("profile_gears").insert(
          gearIds.map((gear_id) => ({ user_id: application.user_id, profile_type: "owner", gear_id }))
        )
        if (insertError) {
          return NextResponse.json({
            error: `使用器具を保存できませんでした: ${insertError.message}`,
          }, { status: 500 })
        }
      }
    }
  } else {
    if (isNewOriginApplication) {
      // サジェストを選ばず作成した審査専用レコードは、見送り時に削除する。
      // 再申請用の入力値は admin_notifications.request_payload に残る。
      // 旧不具合で別の既存origin IDを指している申請では、その既存マスタを削除しない。
      if (!newApplicationPointsToDifferentOrigin) {
        const { data: deletedOrigin, error } = await admin
          .from("origins")
          .delete()
          .eq("id", originId)
          .select("id")
          .maybeSingle()
        if (error) return NextResponse.json({
          error: `新規申請レコードを削除できませんでした: ${error.message}`,
        }, { status: 500 })
        if (!deletedOrigin) {
          const { data: remainingOrigin, error: remainingError } = await admin
          .from("origins")
          .select("id")
          .eq("id", originId)
          .maybeSingle()
          if (remainingError) {
            return NextResponse.json({
              error: `新規申請レコードの削除結果を確認できませんでした: ${remainingError.message}`,
            }, { status: 500 })
          }
          if (remainingOrigin) {
            return NextResponse.json({
              error: "新規申請レコードを削除できませんでした。関連データまたは削除制約を確認してください。",
            }, { status: 409 })
          }
        }
      }
    } else {
      const rejectionPayload: Record<string, unknown> = {
        pending_display_name: null,
        pending_display_name_en: null,
        updated_at: new Date().toISOString(),
      }
      if (application.type === "claim_origin") {
        rejectionPayload.is_approved = false
        rejectionPayload.is_public = false
        rejectionPayload.user_id = null
        rejectionPayload.is_profile_completed = false
      }
      const { error } = await admin.from("origins").update(rejectionPayload).eq("id", originId)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  const { error: notificationError } = await admin
    .from("admin_notifications")
    .update({ status, admin_comment: adminComment })
    .eq("id", application.id)
  if (notificationError) return NextResponse.json({ error: notificationError.message }, { status: 500 })

    return NextResponse.json({ success: true, originId })
  } catch (error) {
    console.error("Owner profile request route failed:", error)
    return NextResponse.json({
      error: error instanceof Error
        ? `オーナープロフィール申請を処理できませんでした: ${error.message}`
        : "オーナープロフィール申請を処理できませんでした。",
    }, { status: 500 })
  }
}
