"use server"

import { createClient } from "@/lib/supabase-server"
import { getStripeClient } from "@/lib/stripe-billing"

// プラン名と請求サイクルに応じた Stripe Price ID のマッピング
const PRICE_IDS: Record<string, string | undefined> = {
  // USER プラン
  user_monthly: process.env.STRIPE_USER_MONTHLY_PRICE_ID,
  user_yearly: process.env.STRIPE_USER_YEARLY_PRICE_ID,
  // PRO プラン
  pro_monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
  pro_yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
  // OWNER プラン
  owner_monthly: process.env.STRIPE_OWNER_MONTHLY_PRICE_ID,
  owner_yearly: process.env.STRIPE_OWNER_YEARLY_PRICE_ID,
}

export async function createCheckoutSession(origin: string, planKey: string, lang: "ja" | "en") {
  try {
    const stripe = getStripeClient()
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return { error: "Unauthorized" }
    }

    // 認証情報だけが存在し、アプリ側のユーザーレコードがない状態では決済させない。
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, email, is_active, stripe_customer_id, stripe_subscription_id, stripe_subscription_status")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile) {
      console.error("Checkout profile validation failed:", profileError)
      return { error: "Profile Not Found" }
    }

    if (profile.is_active === false) {
      return { error: "Account Inactive" }
    }

    if (
      profile.stripe_subscription_id &&
      ["active", "trialing", "past_due"].includes(profile.stripe_subscription_status || "")
    ) {
      return { error: "Active Subscription Exists" }
    }

    // 選択されたプランに対応する Price ID を取得
    const priceId = PRICE_IDS[planKey]

    if (!priceId) {
      console.error(`Invalid planKey or missing Price ID for: ${planKey}`)
      return { error: "Invalid Plan" }
    }

    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim()
    const returnOrigin = configuredOrigin
      ? new URL(configuredOrigin).origin
      : new URL(origin).origin

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${returnOrigin}/${lang}/members/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnOrigin}/${lang}/members`,
      client_reference_id: user.id,
      ...(profile.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: user.email || profile.email || undefined }),
      metadata: {
        user_id: user.id,
        plan_key: planKey,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          plan_key: planKey,
        },
      },
    })

    return { url: session.url }
  } catch (error: any) {
    console.error("Stripe Session Creation Error:", error)
    return { error: error.message || "Stripe Error" }
  }
}
