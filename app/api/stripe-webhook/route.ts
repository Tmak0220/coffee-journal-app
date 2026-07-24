import { NextResponse } from "next/server"
import Stripe from "stripe"
import { createClient } from "@supabase/supabase-js"
import {
  getStripeClient,
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

async function resolveUserId(
  stripe: Stripe,
  subscription: Stripe.Subscription
) {
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

async function syncSubscription(
  stripe: Stripe,
  subscription: Stripe.Subscription,
  suppliedUserId?: string | null
) {
  const supabase = getServiceClient()
  const userId = suppliedUserId || await resolveUserId(stripe, subscription)
  if (!userId) throw new Error(`No user_id found for subscription ${subscription.id}`)

  const customerId = typeof subscription.customer === "string"
    ? subscription.customer
    : subscription.customer.id
  const priceId = subscription.items.data[0]?.price.id || null
  const planKey = subscription.metadata.plan_key || planKeyFromPriceId(priceId)
  const grantsAccess = subscriptionGrantsAccess(subscription.status)
  const access = planAccess(planKey)
  const periodEnd = subscriptionPeriodEnd(subscription)

  const { error } = await supabase
    .from("users")
    .update({
      role: grantsAccess ? access.role : "user",
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

  if (error) throw error

  // This metadata provides a recovery path for legacy database rows.
  const customer = await stripe.customers.retrieve(customerId)
  if (!customer.deleted && customer.metadata.user_id !== userId) {
    await stripe.customers.update(customerId, {
      metadata: { ...customer.metadata, user_id: userId },
    })
  }
}

function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const subscription = invoice.parent?.subscription_details?.subscription
  if (!subscription) return null
  return typeof subscription === "string" ? subscription : subscription.id
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature")
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!signature || !webhookSecret) {
    return new NextResponse("Webhook is not configured", { status: 400 })
  }

  let event: Stripe.Event
  let stripe: Stripe
  try {
    stripe = getStripeClient()
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    )
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error)
    return new NextResponse("Invalid signature", { status: 400 })
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const subscriptionId = typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id
        if (!subscriptionId) throw new Error("Checkout session has no subscription")
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        await syncSubscription(
          stripe,
          subscription,
          session.metadata?.user_id || session.client_reference_id
        )
        break
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        await syncSubscription(
          stripe,
          event.data.object as Stripe.Subscription
        )
        break
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const subscriptionId = invoiceSubscriptionId(
          event.data.object as Stripe.Invoice
        )
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await syncSubscription(stripe, subscription)
        }
        break
      }
      default:
        break
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error(`Stripe webhook handler failed for ${event.type}:`, error)
    // A non-2xx response asks Stripe to retry the event.
    return new NextResponse("Webhook processing failed", { status: 500 })
  }
}
