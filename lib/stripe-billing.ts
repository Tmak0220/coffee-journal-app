import Stripe from "stripe"

export type MembershipTier = "free" | "standard" | "pro" | "business"
export type AccountRole = "user" | "barista" | "owner" | "admin"
export type MembershipPlanKey =
  | "user_monthly"
  | "user_yearly"
  | "pro_monthly"
  | "pro_yearly"
  | "owner_monthly"
  | "owner_yearly"

const priceEnvironmentKeys: Record<MembershipPlanKey, string> = {
  user_monthly: "STRIPE_USER_MONTHLY_PRICE_ID",
  user_yearly: "STRIPE_USER_YEARLY_PRICE_ID",
  pro_monthly: "STRIPE_PRO_MONTHLY_PRICE_ID",
  pro_yearly: "STRIPE_PRO_YEARLY_PRICE_ID",
  owner_monthly: "STRIPE_OWNER_MONTHLY_PRICE_ID",
  owner_yearly: "STRIPE_OWNER_YEARLY_PRICE_ID",
}

const expectedPrices: Record<
  MembershipPlanKey,
  { interval: "month" | "year"; currency: "jpy"; unitAmount: number }
> = {
  user_monthly: { interval: "month", currency: "jpy", unitAmount: 580 },
  user_yearly: { interval: "year", currency: "jpy", unitAmount: 5_800 },
  pro_monthly: { interval: "month", currency: "jpy", unitAmount: 1_580 },
  pro_yearly: { interval: "year", currency: "jpy", unitAmount: 15_800 },
  owner_monthly: { interval: "month", currency: "jpy", unitAmount: 2_580 },
  owner_yearly: { interval: "year", currency: "jpy", unitAmount: 25_800 },
}

export function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY
  if (!secretKey) throw new Error("STRIPE_SECRET_KEY is not configured")
  return new Stripe(secretKey)
}

export function isMembershipPlanKey(value: string): value is MembershipPlanKey {
  return Object.prototype.hasOwnProperty.call(priceEnvironmentKeys, value)
}

export function membershipPriceId(planKey: MembershipPlanKey) {
  const environmentKey = priceEnvironmentKeys[planKey]
  const priceId = process.env[environmentKey]?.trim()
  if (!priceId) {
    throw new Error(`${environmentKey} is not configured`)
  }
  return priceId
}

export async function validateMembershipPrice(
  stripe: Stripe,
  planKey: MembershipPlanKey
) {
  const priceId = membershipPriceId(planKey)
  const price = await stripe.prices.retrieve(priceId)

  if (!price.active) {
    throw new Error(`Stripe Price for ${planKey} is inactive`)
  }
  if (!price.recurring) {
    throw new Error(`Stripe Price for ${planKey} is not recurring`)
  }
  const expected = expectedPrices[planKey]
  if (price.recurring.interval !== expected.interval) {
    throw new Error(`Stripe billing interval mismatch for ${planKey}`)
  }
  if (
    price.currency.toLowerCase() !== expected.currency ||
    price.unit_amount !== expected.unitAmount
  ) {
    throw new Error(`Stripe currency or amount mismatch for ${planKey}`)
  }

  const secretIsLive = process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_") === true
  if (price.livemode !== secretIsLive) {
    throw new Error(`Stripe mode mismatch for ${planKey}`)
  }

  return price
}

export function planAccess(planKey?: string | null): {
  role: Exclude<AccountRole, "admin">
  membershipTier: Exclude<MembershipTier, "free">
} {
  if (!planKey || !isMembershipPlanKey(planKey)) {
    throw new Error(`Invalid membership plan key: ${planKey || "missing"}`)
  }
  const plan = planKey.split("_")[0]
  if (plan === "pro") return { role: "barista", membershipTier: "pro" }
  if (plan === "owner") return { role: "owner", membershipTier: "business" }
  return { role: "user", membershipTier: "standard" }
}

export function planKeyFromPriceId(priceId?: string | null) {
  if (!priceId) return null
  const planKeys = Object.keys(priceEnvironmentKeys) as MembershipPlanKey[]
  return planKeys.find((planKey) => {
    const environmentKey = priceEnvironmentKeys[planKey]
    return process.env[environmentKey]?.trim() === priceId
  }) || null
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
