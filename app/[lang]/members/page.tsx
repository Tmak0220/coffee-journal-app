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
    description: "記事やプロのレシピを含むすべてのコンテンツ閲覧は無料です。ドリップログの高度な分析や、プロフェッショナル・店舗としての情報発信・機能利用を行うためのプランをご用意しています。",
    unauthorized: "ログインセッションが切れたか、ログインしていません。もう一度ログインし直してください。",
    fetchError: "決済ページの読み込みに失敗しました",
    networkError: "通信エラーが発生しました",
    monthly: "月払い",
    yearly: "年払い (2ヶ月分お得)",
    periodMonthly: "/月",
    periodYearly: "/年",
    ownerNoticeTitle: "※ オーナープランの対象条件",
    ownerNoticeDesc: "過去・現在・未来のいずれかの時点において、コーヒーに関連する事業体の代表もしくは経営をしていた（する予定の）方に限ります。",
    userPlan: {
      nameJa: "ユーザープラン",
      desc: "コーヒーログの記録・詳細分析や、器具レビューの投稿で自身のコーヒー体験を深めたい方向け。",
      f1: "すべての記事・レシピ・プロフィールの無料閲覧",
      f2: "コーヒー抽出ログ・レシピの作成と管理",
      f3: "ログのアナリティクス・詳細データ分析チャート",
      f4: "愛用器具（Gear）のレビュー投稿・管理",
    },
    proPlan: {
      nameJa: "プロプラン（推奨）",
      desc: "バリスタ・研究者・インフルエンサーなど、自身の知見・レシピ・記事を発信したいプロフェッショナル向け。",
      f1: "ユーザープランの全機能",
      f2: "PRO専用プロフィールの作成・掲載",
      f3: "PRO限定レシピの公開・記事（ブログ）投稿",
      f4: "フォロワーへのブロードキャスト通知送信",
      f5: "ユーザーからの直接問い合わせ受付",
    },
    ownerPlan: {
      nameJa: "オーナープラン",
      desc: "自家焙煎店やカフェ経営者向け。店舗ブランディング、自社商品の掲載・販売告知を強力にサポート。",
      f1: "プロプランの全機能",
      f2: "店舗（Shop/Roastery）ページの作成・管理",
      f3: "ショップ取扱商品（Products）の登録・掲載",
      f4: "店舗からのブロードキャストお知らせ配信",
      f5: "お客様・ユーザーからの各種問い合わせ管理",
    },
    btnRegister: (name: string) => `${name}に登録する`
  },
  en: {
    title: "MEMBERSHIP",
    subtitle: "Membership Plans",
    description: "All content, including articles and pro recipes, is completely free to read. Choose a plan to unlock advanced drip analytics or publish as a professional/shop owner.",
    unauthorized: "Your session has expired or you are not logged in. Please log in again.",
    fetchError: "Failed to load checkout page.",
    networkError: "A network error occurred.",
    monthly: "Monthly",
    yearly: "Yearly (2 months free)",
    periodMonthly: "/mo",
    periodYearly: "/yr",
    ownerNoticeTitle: "※ Eligibility for Owner Plan",
    ownerNoticeDesc: "Restricted to individuals who are, were, or will be representatives/owners of a coffee-related business entity at any point in time.",
    userPlan: {
      nameJa: "USER PLAN",
      desc: "For coffee enthusiasts who want to track drip logs, analyze extraction data, and post gear reviews.",
      f1: "Free unlimited reading of all articles & recipes",
      f2: "Create & manage personal coffee drip logs",
      f3: "Access to coffee analytics & extraction charts",
      f4: "Post & manage coffee gear reviews",
    },
    proPlan: {
      nameJa: "PRO PLAN (Recommended)",
      desc: "For baristas and coffee professionals who want to publish recipes, articles, and build their personal brand.",
      f1: "All features in USER plan",
      f2: "Dedicated PRO Profile creation & listing",
      f3: "Publish PRO recipes & blog articles",
      f4: "Send broadcast notifications to followers",
      f5: "Receive direct inquiries from users",
    },
    ownerPlan: {
      nameJa: "OWNER PLAN",
      desc: "For roasters & cafe owners looking to promote their shop, feature coffee products, and engage customers.",
      f1: "All features in PRO plan",
      f2: "Create & manage Shop/Roastery profile",
      f3: "Register & showcase shop products",
      f4: "Send shop broadcast announcements",
      f5: "Manage customer inquiries & messages",
    },
    btnRegister: (name: string) => `Join ${name}`
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
      price: isYearly ? "¥5,800" : "¥580",
      period: isYearly ? t.periodYearly : t.periodMonthly,
      description: t.userPlan.desc,
      features: [t.userPlan.f1, t.userPlan.f2, t.userPlan.f3, t.userPlan.f4],
      button: t.btnRegister("USER"),
      disabled: false,
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
    <main className="min-h-screen max-w-6xl mx-auto p-6 sm:p-10 md:p-14 lg:p-16">
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
