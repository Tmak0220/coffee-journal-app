"use server"

import { createClient } from "@/lib/supabase-server"
import {
  getStripeClient,
  isMembershipPlanKey,
  validateMembershipPrice,
} from "@/lib/stripe-billing"

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

    if (!isMembershipPlanKey(planKey)) {
      console.error(`Invalid membership plan: ${planKey}`)
      return { error: "Invalid Plan" }
    }

    // Checkoutを作る前に、公開環境の秘密鍵からPriceが参照できること、
    // 有効な定期課金でありlive/testモードが一致することを検証する。
    const price = await validateMembershipPrice(stripe, planKey)

    const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim()
    const returnOrigin = configuredOrigin
      ? new URL(configuredOrigin).origin
      : new URL(origin).origin

    let reusableCustomerId: string | null = null
    if (profile.stripe_customer_id) {
      try {
        const customer = await stripe.customers.retrieve(profile.stripe_customer_id)
        if (!customer.deleted) reusableCustomerId = customer.id
      } catch (error) {
        // A stale Customer ID (for example after changing Stripe mode/account)
        // must not prevent a new checkout. Other Checkout validation still
        // happens against the currently configured secret key and Price.
        console.warn("Stored Stripe customer could not be reused:", error)
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      success_url: `${returnOrigin}/${lang}/members/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnOrigin}/${lang}/members`,
      client_reference_id: user.id,
      ...(reusableCustomerId
        ? { customer: reusableCustomerId }
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
  } catch (error: unknown) {
    console.error("Stripe Session Creation Error:", error)
    return { error: "Checkout Configuration Error" }
  }
}
