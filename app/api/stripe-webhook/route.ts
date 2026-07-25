import { NextResponse } from "next/server"
import Stripe from "stripe"
import { getStripeClient } from "@/lib/stripe-billing"
import {
  stripeInvoiceSubscriptionId,
  syncStripeSubscription,
} from "@/lib/stripe-subscription-sync"

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
        await syncStripeSubscription(
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
        await syncStripeSubscription(
          stripe,
          event.data.object as Stripe.Subscription
        )
        break
      }
      case "invoice.paid":
      case "invoice.payment_failed": {
        const subscriptionId = stripeInvoiceSubscriptionId(
          event.data.object as Stripe.Invoice
        )
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          await syncStripeSubscription(stripe, subscription)
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
