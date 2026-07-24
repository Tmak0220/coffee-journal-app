"use client"

import type { Post } from "./PostPageClient"

type Props = {
  post: Post
  lang: "ja" | "en"
}

const flavorLabels: Record<number, { ja: string; en: string }> = {
  5: { ja: "クリーン・クリア", en: "Clean & Clarity" },
  4: { ja: "バランス型", en: "Balanced" },
  3: { ja: "ボディ・コク重視", en: "Rich & Heavy Body" },
  2: { ja: "ユニーク・特殊抽出", en: "Unique Extraction" },
}

const dict = {
  ja: {
    badge: "GEAR REVIEW",
    untitled: "器具レビュー",
    gear: "レビュー対象",
    category: "カテゴリ",
    tendency: "抽出・味わいの傾向",
    setting: "設定・パラメータ",
    review: "レビュー",
    noGear: "器具情報が見つかりません。",
  },
  en: {
    badge: "GEAR REVIEW",
    untitled: "Gear Review",
    gear: "Reviewed Gear",
    category: "Category",
    tendency: "Flavor / Brewing Tendency",
    setting: "Setting / Parameters",
    review: "Review",
    noGear: "Gear information is unavailable.",
  },
}

export default function GearReviewDetails({ post, lang }: Props) {
  const t = dict[lang]
  const review = post.post_gears?.[0]
  const gear = review?.gears
  const gearName = gear
    ? lang === "en"
      ? gear.name || gear.name_ja
      : gear.name_ja || gear.name
    : null
  const brandName = gear
    ? lang === "en"
      ? gear.brand || gear.brand_ja
      : gear.brand_ja || gear.brand
    : null
  const rating = review?.rating == null ? null : Number(review.rating)
  const tendency = rating && flavorLabels[rating] ? flavorLabels[rating][lang] : null
  const comment = review?.comment || post.description

  return (
    <article className="w-full space-y-10 text-neutral-800">
      <header className="space-y-5">
        <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold tracking-[0.16em] text-emerald-700">
          {t.badge}
        </span>
        <h1 className="text-3xl font-semibold leading-tight tracking-[-0.03em] text-neutral-950 sm:text-[40px]">
          {post.title || t.untitled}
        </h1>
      </header>

      {gear ? (
        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white p-6 shadow-[0_16px_45px_-36px_rgba(5,150,105,0.35)] sm:p-8">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{t.gear}</p>
          <div className="mt-4">
            {brandName && <p className="text-xs font-semibold uppercase tracking-[0.1em] text-neutral-500">{brandName}</p>}
            <h2 className="mt-1 text-xl font-semibold text-neutral-900 sm:text-2xl">{gearName}</h2>
          </div>

          <dl className="mt-7 grid gap-6 border-t border-neutral-200 pt-6 sm:grid-cols-2">
            {gear.type && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{t.category}</dt>
                <dd className="mt-2 text-sm font-medium capitalize text-neutral-800">{gear.type.replaceAll("_", " ")}</dd>
              </div>
            )}
            {tendency && (
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{t.tendency}</dt>
                <dd className="mt-2 text-sm font-medium text-neutral-800">{tendency}</dd>
              </div>
            )}
            {review?.grind_setting && (
              <div className="sm:col-span-2">
                <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{t.setting}</dt>
                <dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{review.grind_setting}</dd>
              </div>
            )}
          </dl>
        </section>
      ) : (
        <p className="rounded-2xl border border-dashed border-neutral-200 px-5 py-6 text-sm text-neutral-400">{t.noGear}</p>
      )}

      {comment && (
        <section className="border-l-2 border-neutral-300 py-1 pl-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{t.review}</p>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-neutral-700 sm:text-[15px]">{comment}</p>
        </section>
      )}
    </article>
  )
}
