import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { serviceClient } from "@/lib/ec-integrations"

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: origin } = await supabase.from("origins").select("id").eq("user_id", user.id).eq("is_approved", true).eq("is_public", true).limit(1).maybeSingle()
  if (!origin) return NextResponse.json({ error: "Approved owner profile required" }, { status: 403 })
  const { data, error } = await serviceClient().from("shop_api_configs").select("platform_type, shop_url, store_domain, last_synced_at, last_sync_error, updated_at").eq("user_id", user.id)
  if (error) return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 })
  return NextResponse.json({ integrations: data || [] })
}
