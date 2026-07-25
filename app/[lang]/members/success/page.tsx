import Link from "next/link"
import { createClient } from "@/lib/supabase-server"
import { getStripeClient } from "@/lib/stripe-billing"
import { syncStripeSubscription } from "@/lib/stripe-subscription-sync"

type Props = {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ session_id?: string }>
}

export default async function MembersSuccessPage({ params, searchParams }: Props) {
  const { lang } = await params
  const { session_id: sessionId } = await searchParams
  const currentLang = lang === "en" ? "en" : "ja"
  const isEn = currentLang === "en"
  let activationError = false

  if (sessionId) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Authentication is required to activate membership")

      const stripe = getStripeClient()
      const session = await stripe.checkout.sessions.retrieve(sessionId)
      const checkoutUserId = session.metadata?.user_id || session.client_reference_id
      if (checkoutUserId !== user.id) throw new Error("Checkout session ownership mismatch")
      if (session.status !== "complete") throw new Error("Checkout session is not complete")

      const subscriptionId = typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id
      if (!subscriptionId) throw new Error("Checkout session has no subscription")

      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      await syncStripeSubscription(stripe, subscription, user.id)
    } catch (error) {
      activationError = true
      console.error("Membership activation from success page failed:", error)
    }
  } else {
    activationError = true
  }

  return (
    <main className="min-h-screen p-10 md:p-14 lg:p-16">
      <div className="max-w-2xl">
        <p className="type-label text-[11px] text-subtle tracking-[0.12em] pr-[0.12em]">
          MEMBERSHIP
        </p>

        <h1 className="mt-8 type-display text-5xl md:text-6xl text-foreground">
          {isEn ? "PAYMENT SUCCESS" : "決済完了"}
        </h1>

        <p className="mt-4 text-base tracking-[0.12em] text-muted font-medium">
          {isEn ? "Your payment is complete" : "決済が完了しました"}
        </p>

        {activationError ? (
          <div className="mt-10 rounded-2xl border border-red-200 bg-red-50/60 p-5 text-sm leading-7 text-red-700">
            {isEn
              ? "Your payment was received, but account activation could not be confirmed. Please contact support without making another payment."
              : "決済は受け付けられましたが、アカウントの有効化を確認できませんでした。重複して決済せず、運営へお問い合わせください。"}
          </div>
        ) : (
          <p className="mt-10 text-[15px] leading-8 text-muted">
            {isEn ? "Thank you for joining." : "MEMBERへの登録ありがとうございます。"}
            <br />
            {isEn ? "Your membership is now active." : "メンバーシップが有効になりました。"}
          </p>
        )}

        <div className="mt-14">
          <Link
            href={activationError ? `/${currentLang}/contact` : `/${currentLang}/dashboard`}
            className="inline-block border border-border bg-surface rounded-xl px-6 py-3 text-xs font-medium tracking-[0.1em] hover:bg-foreground hover:text-background transition-colors duration-300"
          >
            {activationError
              ? (isEn ? "CONTACT SUPPORT" : "運営へ問い合わせる")
              : (isEn ? "OPEN DASHBOARD" : "ダッシュボードを開く")}
          </Link>
        </div>
      </div>
    </main>
  )
}
