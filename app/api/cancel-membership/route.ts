import { NextResponse } from "next/server"
import { createClient as createServiceClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase-server"
import { cancelUserSubscriptions } from "@/lib/stripe-billing"

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service credentials are not configured")
  return createServiceClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST() {
  try {
    const auth = await createServerClient()
    const { data: { user } } = await auth.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const service = serviceClient()
    const { data: profile, error: profileError } = await service
      .from("users")
      .select("id, email, role, stripe_customer_id, stripe_subscription_id")
      .eq("id", user.id)
      .maybeSingle()
    if (profileError) throw profileError
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const canceledSubscriptions = await cancelUserSubscriptions({
      userId: user.id,
      email: profile.email,
      customerId: profile.stripe_customer_id,
      subscriptionId: profile.stripe_subscription_id,
    })

    const now = new Date().toISOString()
    const { error: updateError } = await service
      .from("users")
      .update({
        // Membership cancellation does not suspend or delete the account.
        is_active: true,
        deactivated_at: null,
        deactivation_reason: null,
        membership_tier: "free",
        role: profile.role === "admin" ? "admin" : "user",
        stripe_subscription_status: "canceled",
        stripe_cancel_at_period_end: false,
        stripe_subscription_updated_at: now,
      })
      .eq("id", user.id)
    if (updateError) throw updateError

    return NextResponse.json({
      success: true,
      canceledSubscriptions,
    })
  } catch (error) {
    console.error("Membership cancellation failed:", error)
    return NextResponse.json(
      { error: "Membership cancellation failed" },
      { status: 500 }
    )
  }
}
