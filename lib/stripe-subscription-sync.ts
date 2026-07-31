import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import {
  isMembershipPlanKey,
  planAccess,
  planKeyFromPriceId,
  subscriptionGrantsAccess,
  subscriptionPeriodEnd,
} from "@/lib/stripe-billing"

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service credentials are not configured")
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function resolveUserId(stripe: Stripe, subscription: Stripe.Subscription) {
  if (subscription.metadata.user_id) return subscription.metadata.user_id

  const supabase = getServiceClient()
  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id

  const { data: bySubscription } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle()
  if (bySubscription?.id) return bySubscription.id

  const { data: byCustomer } = await supabase
    .from("users")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle()
  if (byCustomer?.id) return byCustomer.id

  const customer = await stripe.customers.retrieve(customerId)
  return !customer.deleted ? customer.metadata.user_id || null : null
}

export async function syncStripeSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  suppliedUserId?: string | null,
) {
  const supabase = getServiceClient()
  const userId = suppliedUserId || await resolveUserId(stripe, subscription)
  if (!userId) throw new Error(`No user_id found for subscription ${subscription.id}`)

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id
  const priceId = subscription.items.data[0]?.price.id || null
  const pricePlanKey = planKeyFromPriceId(priceId)
  const metadataPlanKey = subscription.metadata.plan_key
  if (metadataPlanKey && !isMembershipPlanKey(metadataPlanKey)) {
    throw new Error(`Invalid plan_key in Stripe metadata: ${metadataPlanKey}`)
  }
  if (metadataPlanKey && pricePlanKey && metadataPlanKey !== pricePlanKey) {
    throw new Error(
      `Stripe plan metadata (${metadataPlanKey}) does not match price (${pricePlanKey})`
    )
  }
  const planKey = metadataPlanKey || pricePlanKey
  if (!planKey) throw new Error(`No plan_key found for Stripe price ${priceId || "unknown"}`)

  const grantsAccess = subscriptionGrantsAccess(subscription.status)
  const access = planAccess(planKey)
  const periodEnd = subscriptionPeriodEnd(subscription)

  const { data: currentUser, error: currentUserError } = await supabase
    .from("users")
    .select("id, role, stripe_subscription_id, stripe_subscription_status")
    .eq("id", userId)
    .maybeSingle()
  if (currentUserError) throw currentUserError
  if (!currentUser) throw new Error(`Application user ${userId} was not found`)

  // A delayed cancellation for an older subscription must not revoke access
  // granted by a newer active subscription.
  if (
    !grantsAccess &&
    currentUser.stripe_subscription_id &&
    currentUser.stripe_subscription_id !== subscription.id &&
    ["active", "trialing", "past_due"].includes(
      currentUser.stripe_subscription_status || ""
    )
  ) {
    return {
      userId,
      membershipTier: null,
      status: subscription.status,
      ignoredAsStale: true,
    }
  }

  // Billing changes must never remove the administrator role. Admin accounts
  // may still hold a paid membership tier for feature access.
  const nextRole = currentUser.role === "admin"
    ? "admin"
    : grantsAccess
      ? access.role
      : "user"

  const { data: updatedUser, error } = await supabase
    .from("users")
    .update({
      role: nextRole,
      membership_tier: grantsAccess ? access.membershipTier : "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      stripe_price_id: priceId,
      stripe_plan_key: planKey,
      stripe_subscription_status: subscription.status,
      stripe_current_period_end: periodEnd
        ? new Date(periodEnd * 1000).toISOString()
        : null,
      stripe_cancel_at_period_end: subscription.cancel_at_period_end,
      stripe_subscription_updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id")
    .maybeSingle()

  if (error) throw error
  if (!updatedUser) throw new Error(`Application user ${userId} was not found`)

  const customer = await stripe.customers.retrieve(customerId)
  if (!customer.deleted && customer.metadata.user_id !== userId) {
    await stripe.customers.update(customerId, {
      metadata: { ...customer.metadata, user_id: userId },
    })
  }

  return {
    userId,
    membershipTier: grantsAccess ? access.membershipTier : "free",
    status: subscription.status,
  }
}

export function stripeInvoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription
  if (!subscription) return null
  return typeof subscription === "string" ? subscription : subscription.id
}
