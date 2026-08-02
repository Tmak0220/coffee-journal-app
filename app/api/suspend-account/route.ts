import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase-server"

function serviceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}

export async function POST(request: Request) {
  try {
    const auth = await createServerClient()
    const { data: { user: requester } } = await auth.auth.getUser()
    if (!requester) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const userId = typeof body?.userId === "string" ? body.userId : ""
    if (!userId) {
      return NextResponse.json({ error: "No userId" }, { status: 400 })
    }

    const service = serviceClient()
    const [{ data: requesterProfile, error: requesterError }, { data: target, error: targetError }] =
      await Promise.all([
        service.from("users").select("role").eq("id", requester.id).maybeSingle(),
        service
          .from("users")
          .select("id")
          .eq("id", userId)
          .maybeSingle(),
      ])

    if (requesterError) throw requesterError
    if (targetError) throw targetError
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 })
    if (requester.id !== userId && requesterProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const now = new Date().toISOString()
    const { error: updateError } = await service
      .from("users")
      .update({
        is_active: false,
        deactivated_at: now,
        deactivation_reason: "account_suspended",
      })
      .eq("id", userId)
    if (updateError) throw updateError

    // A suspended account must not be able to create a new authenticated
    // session while its data and posts remain intact.
    const { error: banError } = await service.auth.admin.updateUserById(userId, {
      ban_duration: "876000h",
    })
    if (banError) throw banError

    return NextResponse.json({
      success: true,
    })
  } catch (error) {
    console.error("Account suspension failed:", error)
    return NextResponse.json(
      { error: "Account suspension failed" },
      { status: 500 }
    )
  }
}
