"use client"

import { useState, use } from "react"
import { createCheckoutSession } from "./action"

type StatusMessage = {
  text: string
  type: "error" | "success"
}

type Props = {
  params: Promise<{
    lang: string
  }>
}

type BillingCycle = "monthly" | "yearly"

const membersDict = {
  ja: {
    title: "MEMBERSHIP",
    subtitle: "メンバーシッププラン",
    description: "コーヒーの記録、投稿、フォロー、ブックマークなどの基本機能は無料で利用できます。専門家としての発信や、店舗・ブランド運営に必要な機能を利用する場合は、PROまたはOWNERプランをお選びください。",
    unauthorized: "ログインセッションが切れたか、ログインしていません。もう一度ログインし直してください。",
    fetchError: "決済ページの読み込みに失敗しました",
    networkError: "通信エラーが発生しました",
    monthly: "月払い",
    yearly: "年払い (2ヶ月分お得)",
    periodMonthly: "/月",
    periodYearly: "/年",
    ownerNoticeTitle: "※ オーナープランの対象条件",
    ownerNoticeDesc: "コーヒーに関わる店舗・ブランド・農園・イベントなどを運営している方、または開業・活動開始を予定している方が対象です。",
    userPlan: {
      nameJa: "ユーザープラン",
      desc: "コーヒーの記録と共有を楽しむための基本プランです。アカウントを作成すると、無料で利用を開始できます。",
      f1: "公開記事・レシピ・プロフィールの閲覧",
      f2: "テイスト・イベント・器具レビューの投稿と編集",
      f3: "抽出レシピの記録・管理とアナリティクス",
      f4: "アカウントのフォロー、いいね、ブックマーク",
      available: "無料で利用できます",
    },
    proPlan: {
      nameJa: "プロプラン",
      desc: "コーヒーに関する専門性、研究、技術、活動を、個人の専門プロフィールから継続的に発信したい方向けです。",
      f1: "ユーザープランのすべての機能",
      f2: "専門分野を掲載できるEXPERTSプロフィール",
      f3: "ブログ・公開レシピ・検証記事の投稿",
      f4: "フォロワーへのお知らせ配信",
      f5: "ビジネス問い合わせの送信と継続的なやり取り",
    },
    ownerPlan: {
      nameJa: "オーナープラン",
      desc: "コーヒーに関わる店舗、ブランド、農園、イベントなどの活動拠点を公開し、情報発信や事業者間のつながりを管理するためのプランです。",
      f1: "プロプランのすべての機能",
      f2: "ORIGINSプロフィールと活動拠点の管理",
      f3: "ECショップ連携と取扱商品の掲載",
      f4: "フォロワーへの店舗・ブランドのお知らせ配信",
      f5: "ビジネス問い合わせの受付とメッセージ管理",
    },
    btnRegister: (name: string) => `${name}プランを選ぶ`
  },
  en: {
    title: "MEMBERSHIP",
    subtitle: "Membership Plans",
    description: "Core features—including coffee logs, posting, follows, and bookmarks—are free to use. Choose PRO or OWNER when you need tools for professional publishing or shop and brand management.",
    unauthorized: "Your session has expired or you are not logged in. Please log in again.",
    fetchError: "Failed to load checkout page.",
    networkError: "A network error occurred.",
    monthly: "Monthly",
    yearly: "Yearly (2 months free)",
    periodMonthly: "/mo",
    periodYearly: "/yr",
    ownerNoticeTitle: "※ Eligibility for Owner Plan",
    ownerNoticeDesc: "Available to people who operate—or plan to launch—a coffee-related shop, brand, farm, event, or other business activity.",
    userPlan: {
      nameJa: "USER PLAN",
      desc: "The free foundation for recording and sharing your coffee experiences. Create an account to get started at no cost.",
      f1: "View public articles, recipes, and profiles",
      f2: "Create and edit tasting, event, and gear review posts",
      f3: "Record and manage brew recipes and analytics",
      f4: "Follow accounts, like posts, and save bookmarks",
      available: "Available for free",
    },
    proPlan: {
      nameJa: "PRO PLAN",
      desc: "For people who want to publish their coffee expertise, research, techniques, and activities through a dedicated professional profile.",
      f1: "Everything in the USER plan",
      f2: "EXPERTS profile with professional categories",
      f3: "Publish blogs, recipes, and verification articles",
      f4: "Send updates to followers",
      f5: "Start and continue business inquiries",
    },
    ownerPlan: {
      nameJa: "OWNER PLAN",
      desc: "For managing and presenting coffee shops, brands, farms, events, and other business activities, with tools for publishing and business connections.",
      f1: "Everything in the PRO plan",
      f2: "Manage an ORIGINS profile and business locations",
      f3: "Connect an online store and showcase products",
      f4: "Send shop or brand updates to followers",
      f5: "Receive and manage business inquiries",
    },
    btnRegister: (name: string) => `Choose ${name}`
  }
}

export default function MembersPage({ params }: Props) {
  const { lang } = use(params)
  const currentLang = lang === "en" ? "en" : "ja"
  const t = membersDict[currentLang]

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly")
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null)

  const handleCheckout = async (planId: string) => {
    if (checkoutLoading) return
    try {
      setStatusMessage(null)
      setCheckoutLoading(planId)
      const currentOrigin = window.location.origin
      
      // プラン識別子と請求サイクル（例: "pro_monthly", "owner_yearly"）を送る構成
      const planKey = `${planId}_${billingCycle}`
      const data = await createCheckoutSession(currentOrigin, planKey, currentLang)

      if (data.error) {
        if (data.error === "Unauthorized") {
          setStatusMessage({ text: t.unauthorized, type: "error" })
        } else if (data.error === "Active Subscription Exists") {
          setStatusMessage({
            text: currentLang === "en"
              ? "An active subscription is already linked to this account."
              : "このアカウントには有効なメンバーシップがすでに登録されています。",
            type: "error",
          })
        } else if (data.error === "Account Inactive") {
          setStatusMessage({
            text: currentLang === "en"
              ? "This account is currently suspended."
              : "このアカウントは現在停止されています。",
            type: "error",
          })
        } else {
          setStatusMessage({ text: t.fetchError, type: "error" })
        }
        return
      }

      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error(error)
      setStatusMessage({ text: t.networkError, type: "error" })
    } finally {
      setCheckoutLoading(null)
    }
  }

  const isYearly = billingCycle === "yearly"

  const plans = [
    {
      id: "user",
      name: "USER",
      nameJa: t.userPlan.nameJa,
      price: "¥0",
      period: "",
      description: t.userPlan.desc,
      features: [t.userPlan.f1, t.userPlan.f2, t.userPlan.f3, t.userPlan.f4],
      button: t.userPlan.available,
      disabled: true,
    },
    {
      id: "pro",
      name: "PRO",
      nameJa: t.proPlan.nameJa,
      price: isYearly ? "¥15,800" : "¥1,580",
      period: isYearly ? t.periodYearly : t.periodMonthly,
      description: t.proPlan.desc,
      features: [t.proPlan.f1, t.proPlan.f2, t.proPlan.f3, t.proPlan.f4, t.proPlan.f5],
      button: t.btnRegister("PRO"),
      disabled: false,
      highlight: true,
    },
    {
      id: "owner",
      name: "OWNER",
      nameJa: t.ownerPlan.nameJa,
      price: isYearly ? "¥25,800" : "¥2,580",
      period: isYearly ? t.periodYearly : t.periodMonthly,
      description: t.ownerPlan.desc,
      features: [t.ownerPlan.f1, t.ownerPlan.f2, t.ownerPlan.f3, t.ownerPlan.f4, t.ownerPlan.f5],
      button: t.btnRegister("OWNER"),
      disabled: false,
      isOwner: true,
    },
  ]

  return (
    <main className="public-page-shell mx-auto max-w-6xl p-6 sm:p-10 md:p-14 lg:p-16">
      <div className="max-w-3xl">
        <p className="type-label text-[11px] text-subtle tracking-[0.12em] uppercase font-medium">
          Membership
        </p>
        <h1 className="mt-4 sm:mt-6 text-4xl sm:text-5xl md:text-6xl tracking-[0.05em] text-foreground font-light break-words">
          {t.title}
        </h1>
        <p className="mt-2 text-xs sm:text-sm tracking-[0.12em] text-muted font-medium">
          {t.subtitle}
        </p>
        <p className="mt-6 sm:mt-8 text-xs sm:text-[14px] md:text-[15px] leading-relaxed sm:leading-7 md:leading-8 text-muted">
          {t.description}
        </p>
      </div>

      {/* 月払い / 年払い 切り替えスイッチ */}
      <div className="mt-8 sm:mt-12 flex justify-start">
        <div className="inline-flex items-center bg-neutral-100 p-1 rounded-2xl border border-neutral-200">
          <button
            type="button"
            onClick={() => setBillingCycle("monthly")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 select-none ${
              !isYearly
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            {t.monthly}
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle("yearly")}
            className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 select-none flex items-center gap-1.5 ${
              isYearly
                ? "bg-neutral-950 text-white shadow-sm"
                : "text-neutral-500 hover:text-neutral-900"
            }`}
          >
            <span>{t.yearly}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className={`mt-8 sm:mt-12 text-xs p-4 rounded-xl border ${
          statusMessage.type === "error" 
            ? "text-red-500 bg-red-50/50 border-red-200" 
            : "text-foreground bg-neutral-50 border-border"
        }`}>
          {statusMessage.text}
        </div>
      )}

      <section className="mt-8 sm:mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`
              border rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-surface flex flex-col justify-between transition h-full
              ${plan.highlight ? "border-neutral-900 shadow-md ring-1 ring-neutral-900" : "border-border"}
            `}
          >
            <div>
              <div>
                <p className="type-label text-[10px] sm:text-[11px] text-subtle tracking-[0.12em] font-medium">{plan.nameJa}</p>
                <h2 className="mt-2 sm:mt-4 text-3xl sm:text-4xl font-medium tracking-[0.02em]">{plan.name}</h2>
              </div>

              <div className="mt-6 sm:mt-8 flex items-end gap-1.5">
                <span className="text-4xl sm:text-5xl font-medium leading-none tracking-tight">{plan.price}</span>
                <span className="pb-0.5 text-xs sm:text-sm text-muted font-medium">{plan.period}</span>
              </div>

              <p className="mt-4 text-xs sm:text-sm text-muted leading-relaxed min-h-[48px]">{plan.description}</p>
            </div>

            <div>
              <div className="mt-6 sm:mt-8">
                {plan.disabled ? (
                  <div className="w-full border border-border rounded-xl px-5 py-3.5 text-center text-xs sm:text-sm text-subtle bg-neutral-50 font-medium">
                    {plan.button}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleCheckout(plan.id)}
                    disabled={Boolean(checkoutLoading)}
                    className="block w-full border border-black bg-black text-white rounded-xl px-5 py-3.5 text-center text-xs sm:text-sm tracking-[0.08em] font-medium transition hover:bg-neutral-800 active:scale-[0.99] select-none disabled:cursor-wait disabled:opacity-50"
                  >
                    {checkoutLoading === plan.id
                      ? (currentLang === "en" ? "OPENING CHECKOUT..." : "決済ページを準備中...")
                      : plan.button}
                  </button>
                )}
              </div>

              {/* オーナープラン専用の赤字注意書き */}
              {plan.isOwner && (
                <div className="mt-6 p-3.5 bg-rose-50/60 border border-rose-200/80 rounded-xl space-y-1">
                  <p className="text-[11px] font-bold text-rose-600 tracking-wide">
                    {t.ownerNoticeTitle}
                  </p>
                  <p className="text-[11px] text-rose-600/90 leading-relaxed font-medium">
                    {t.ownerNoticeDesc}
                  </p>
                </div>
              )}

              <div className="mt-6 sm:mt-8 space-y-3.5 sm:space-y-4 border-t border-dashed border-border pt-6 sm:pt-8">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-start gap-2.5 sm:gap-3">
                    <div className="mt-[6px] sm:mt-[7px] h-[4px] w-[4px] sm:h-[5px] sm:w-[5px] rounded-full bg-foreground shrink-0" />
                    <p className="text-[11px] sm:text-xs md:text-sm leading-relaxed text-muted">{feature}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}
