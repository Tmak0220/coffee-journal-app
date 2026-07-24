import Stripe from "stripe"

export type MembershipTier = "free" | "standard" | "pro" | "business"
export type AccountRole = "user" | "barista" | "owner"

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured")
  return new Stripe(secretKey)
}

export function planAccess(planKey?: string | null): {
  role: AccountRole
  membershipTier: Exclude<MembershipTier, "free">
} {
  const plan = planKey?.split("_")[0]
  if (plan === "pro") return { role: "barista", membershipTier: "pro" }
  if (plan === "owner") return { role: "owner", membershipTier: "business" }
  return { role: "user", membershipTier: "standard" }
}

export function planKeyFromPriceId(priceId?: string | null) {
  if (!priceId) return null
  const entries = [
    ["user_monthly", process.env.STRIPE_USER_MONTHLY_PRICE_ID],
    ["user_yearly", process.env.STRIPE_USER_YEARLY_PRICE_ID],
    ["pro_monthly", process.env.STRIPE_PRO_MONTHLY_PRICE_ID],
    ["pro_yearly", process.env.STRIPE_PRO_YEARLY_PRICE_ID],
    ["owner_monthly", process.env.STRIPE_OWNER_MONTHLY_PRICE_ID],
    ["owner_yearly", process.env.STRIPE_OWNER_YEARLY_PRICE_ID],
  ] as const
  return entries.find(([, configuredPrice]) => configuredPrice === priceId)?.[0] || null
}

export function subscriptionPeriodEnd(subscription: Stripe.Subscription) {
  const periodEnds = subscription.items.data
    .map((item) => item.current_period_end)
    .filter((value): value is number => Number.isFinite(value))
  return periodEnds.length > 0 ? Math.max(...periodEnds) : null
}

export function subscriptionGrantsAccess(status: Stripe.Subscription.Status) {
  // Keep access during Stripe's configured retry window. Revoke it for
  // incomplete, unpaid, paused, or canceled subscriptions.
  return status === "active" || status === "trialing" || status === "past_due"
}

type BillingLookup = {
  userId: string
  email?: string | null
  customerId?: string | null
  subscriptionId?: string | null
}

const terminalStatuses = new Set<Stripe.Subscription.Status>([
  "canceled",
  "incomplete_expired",
])

export async function cancelUserSubscriptions({
  userId,
  email,
  customerId,
  subscriptionId,
}: BillingLookup) {
  const stripe = getStripeClient()
  const subscriptionIds = new Set<string>()

  if (subscriptionId) subscriptionIds.add(subscriptionId)

  const customerIds = new Set<string>()
  if (customerId) customerIds.add(customerId)

  // Legacy Checkout sessions did not persist the Customer ID. Recover those
  // customers by the authenticated account email, then verify subscription
  // metadata before canceling anything.
  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 100 })
    customers.data.forEach((customer) => customerIds.add(customer.id))
  }

  for (const id of Array.from(customerIds)) {
    const subscriptions = await stripe.subscriptions.list({
      customer: id,
      status: "all",
      limit: 100,
    })
    subscriptions.data.forEach((subscription) => {
      if (
        subscription.id === subscriptionId ||
        subscription.metadata.user_id === userId
      ) {
        subscriptionIds.add(subscription.id)
      }
    })
  }

  const canceled: string[] = []
  for (const id of Array.from(subscriptionIds)) {
    const subscription = await stripe.subscriptions.retrieve(id)
    if (terminalStatuses.has(subscription.status)) continue
    if (
      subscription.metadata.user_id &&
      subscription.metadata.user_id !== userId
    ) {
      throw new Error("Stripe subscription ownership mismatch")
    }
    await stripe.subscriptions.cancel(id, {
      invoice_now: false,
      prorate: false,
    })
    canceled.push(id)
  }

  return canceled
}
