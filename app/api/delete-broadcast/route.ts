import { createClient as createAdminClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"
import { createClient as createServerClient } from "@/lib/supabase-server"

const admin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } },
)

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json()
    if (typeof id !== "string" || !id) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const auth = await createServerClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data: notification, error: fetchError } = await admin
      .from("notifications")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle()

    if (fetchError) throw fetchError
    if (!notification) return NextResponse.json({ error: "Notification not found" }, { status: 404 })
    if (notification.user_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { error: deleteError } = await admin
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id)
    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete broadcast error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 },
    )
  }
}
