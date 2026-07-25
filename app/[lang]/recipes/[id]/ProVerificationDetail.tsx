"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import RelatedContent from "@/components/RelatedContent"

type Recipe = {
  id: string
  user_id: string
  recipe_title: string
  bean_name: string
  image_urls: string[] | string | null
  water_name: string | null
  gh: number | string | null
  kh: number | string | null
  minerals: string | null
  selected_variables: string[] | null
  log_purpose: string | null
  log_process: string | null
  log_conclusion: string | null
  temp: number | string | null
  grind_size: string | null
  ratio: number | string | null
  tds: number | string | null
  bloom_time: string | null
  total_time: string | null
  pour_steps: Array<{ id?: string; amount?: string; time?: string }> | null
  water_profile: Record<string, unknown> | null
  roast_profile: Record<string, unknown> | null
  cupping_profile: Record<string, unknown> | null
  verification_patterns?: Array<{
    id: string
    title: string
    isBest?: boolean
    modules: Array<Record<string, unknown> & { id: string; type: "recipe" | "water" | "roast" | "cupping" }>
  }> | null
  visibility: string | null
  created_at: string
}

type Author = {
  id: string
  username: string | null
  display_name: string | null
  display_name_en: string | null
  avatar_url: string | null
} | null

type Gear = {
  id: number
  type: string | null
  name: string
  name_ja: string | null
  brand: string | null
  brand_ja: string | null
}

type Props = {
  recipe: Recipe
  author: Author
  gears: Gear[]
  isOwner: boolean
  currentUserId: string | null
  viewerIsTierMember: boolean
  lang: "ja" | "en"
}

const dict = {
  ja: {
    badge: "VERIFICATION ARTICLE",
    author: "検証・執筆",
    bean: "使用豆",
    variables: "検証した変数",
    extraction: "抽出条件",
    temperature: "湯温",
    grind: "挽き目",
    ratio: "抽出比率",
    tds: "TDS",
    bloom: "蒸らし時間",
    total: "抽出時間",
    pourSteps: "注湯・工程",
    amount: "量・工程",
    time: "時間",
    gear: "使用器具",
    water: "水質プロファイル",
    waterName: "水・調合名",
    minerals: "ミネラル・調整内容",
    roast: "焙煎プロファイル",
    cupping: "カッピング評価",
    purpose: "1. 検証の目的・仮説",
    process: "2. 検証内容・プロセス",
    conclusion: "3. 考察と結論",
    draft: "下書き",
    private: "非公開",
    members: "会員限定",
    save: "保存する",
    saved: "保存済み",
    membershipRequired: "保存機能の利用には会員登録が必要です。",
    patterns: "検証パターン",
    bestPattern: "ベストパターン",
  },
  en: {
    badge: "VERIFICATION ARTICLE",
    author: "Research & Author",
    bean: "Coffee",
    variables: "Variables",
    extraction: "Extraction Conditions",
    temperature: "Temperature",
    grind: "Grind Size",
    ratio: "Brew Ratio",
    tds: "TDS",
    bloom: "Bloom Time",
    total: "Total Time",
    pourSteps: "Pour / Process Steps",
    amount: "Amount / Process",
    time: "Time",
    gear: "Equipment",
    water: "Water Profile",
    waterName: "Water / Blend",
    minerals: "Minerals / Adjustment",
    roast: "Roast Profile",
    cupping: "Cupping Evaluation",
    purpose: "1. Purpose & Hypothesis",
    process: "2. Method & Process",
    conclusion: "3. Findings & Conclusion",
    draft: "Draft",
    private: "Private",
    members: "Members Only",
    save: "SAVE",
    saved: "SAVED",
    membershipRequired: "Membership is required to save this article.",
    patterns: "Verification Patterns",
    bestPattern: "Best Pattern",
  },
}

export default function ProVerificationDetail({ recipe, author, gears, isOwner, currentUserId, viewerIsTierMember, lang }: Props) {
  const t = dict[lang]
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!currentUserId || !viewerIsTierMember) return
    supabase
      .from("pro_recipe_bookmarks")
      .select("id")
      .eq("user_id", currentUserId)
      .eq("pro_recipe_id", recipe.id)
      .maybeSingle()
      .then(({ data }) => setBookmarked(Boolean(data)))
  }, [currentUserId, recipe.id, viewerIsTierMember])

  const handleBookmark = async () => {
    setStatusMessage(null)
    if (!currentUserId || !viewerIsTierMember) {
      setStatusMessage(t.membershipRequired)
      return
    }
    if (bookmarkLoading) return
    setBookmarkLoading(true)
    const { error } = bookmarked
      ? await supabase.from("pro_recipe_bookmarks").delete().eq("user_id", currentUserId).eq("pro_recipe_id", recipe.id)
      : await supabase.from("pro_recipe_bookmarks").insert({ user_id: currentUserId, pro_recipe_id: recipe.id })
    if (!error) setBookmarked((value) => !value)
    setBookmarkLoading(false)
  }
  const images = Array.isArray(recipe.image_urls)
    ? recipe.image_urls.filter(Boolean).slice(0, 3)
    : typeof recipe.image_urls === "string" && recipe.image_urls.trim()
      ? [recipe.image_urls.trim()]
      : []
  const displayName = lang === "en"
    ? author?.display_name_en || author?.display_name || author?.username
    : author?.display_name || author?.username
  const visibilityLabel = recipe.visibility === "draft"
    ? t.draft
    : recipe.visibility === "private"
      ? t.private
      : recipe.visibility === "members"
        ? t.members
        : null
  const parameters = [
    { label: t.temperature, value: recipe.temp != null ? `${recipe.temp}°C` : null },
    { label: t.grind, value: recipe.grind_size },
    { label: t.ratio, value: recipe.ratio != null ? `1 : ${recipe.ratio}` : null },
    { label: t.tds, value: recipe.tds != null ? `${recipe.tds}%` : null },
    { label: t.bloom, value: recipe.bloom_time },
    { label: t.total, value: recipe.total_time },
  ].filter((item) => item.value)
  const hasVerificationPatterns = Array.isArray(recipe.verification_patterns) && recipe.verification_patterns.length > 0
  const profileEntries = (profile: Record<string, unknown> | null) => Object.entries(profile || {})
    .filter(([key, value]) => !["id", "type"].includes(key) && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0))

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_3%,rgba(180,112,32,0.07),transparent_28%),radial-gradient(circle_at_92%_10%,rgba(71,127,151,0.07),transparent_27%)] px-6 py-10 sm:px-10 md:px-14 md:py-14 lg:px-16">
      <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="space-y-6 lg:sticky lg:top-28 lg:col-span-5">
          {images.length > 0 ? images.map((url, index) => (
            <div key={`${url}-${index}`} className="relative aspect-[4/5] overflow-hidden rounded-[28px] border border-neutral-200 bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.28)]">
              <Image src={url} alt={recipe.recipe_title} fill sizes="(max-width: 1024px) 100vw, 42vw" priority={index === 0} className="object-cover" />
            </div>
          )) : (
            <div className="flex aspect-[4/5] items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 text-[10px] tracking-[0.16em] text-neutral-400">NO IMAGE</div>
          )}
        </div>

        <article className="space-y-12 rounded-[28px] border border-white/80 bg-white/85 p-6 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:p-10 lg:col-span-7">
          <header className="space-y-5 border-b border-neutral-200 pb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold tracking-[0.15em] text-sky-700">{t.badge}</span>
              {visibilityLabel && isOwner && <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-semibold text-neutral-500">{visibilityLabel}</span>}
            </div>
            <h1 className="text-3xl font-semibold leading-[1.15] tracking-[-0.035em] text-neutral-950 sm:text-5xl">{recipe.recipe_title}</h1>
            <p className="text-sm font-medium text-neutral-500"><span className="mr-3 text-[10px] uppercase tracking-[0.14em] text-neutral-400">{t.bean}</span>{recipe.bean_name}</p>

            {author && (
              <Link href={author.username ? `/${lang}/users/${author.username}` : `/${lang}/experts`} className="flex w-fit items-center gap-3 pt-2">
                <div className="relative size-10 overflow-hidden rounded-full border border-neutral-200 bg-neutral-50">
                  {author.avatar_url && <Image src={author.avatar_url} alt="" fill sizes="40px" className="object-cover" />}
                </div>
                <div>
                  <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{t.author}</p>
                  <p className="mt-0.5 text-sm font-semibold text-neutral-800">{displayName || "—"}</p>
                </div>
              </Link>
            )}
          </header>

          {recipe.selected_variables && recipe.selected_variables.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.variables}</h2>
              <div className="mt-4 flex flex-wrap gap-2">{recipe.selected_variables.map((variable) => <span key={variable} className="rounded-full border border-amber-200 bg-amber-50/70 px-3 py-1.5 text-xs font-medium text-amber-800">{variable}</span>)}</div>
            </section>
          )}

          {hasVerificationPatterns && (
            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.patterns}</h2>
              <div className="mt-5 space-y-5">
                {recipe.verification_patterns!.map((pattern, patternIndex) => (
                  <article key={pattern.id || patternIndex} className="rounded-3xl border border-neutral-200 bg-neutral-50/45 p-5 sm:p-7">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4">
                      <h3 className="text-base font-semibold text-neutral-900">{pattern.title || `${t.patterns} ${patternIndex + 1}`}</h3>
                      {pattern.isBest && <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-semibold text-amber-700">{t.bestPattern}</span>}
                    </div>
                    <div className="mt-5 space-y-5">
                      {(pattern.modules || []).map((module, moduleIndex) => {
                        const entries = Object.entries(module).filter(([key, value]) =>
                          !["id", "type", "gears", "pourSteps"].includes(key) &&
                          value !== null && value !== "" && (!Array.isArray(value) || value.length > 0)
                        )
                        const pourSteps = Array.isArray(module.pourSteps) ? module.pourSteps as Array<{ amount?: string; time?: string }> : []
                        const moduleLabel = module.type === "recipe" ? t.extraction : module.type === "water" ? t.water : module.type === "roast" ? t.roast : t.cupping
                        return (
                          <div key={module.id || moduleIndex} className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
                            <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">{moduleLabel}</h4>
                            {entries.length > 0 && <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                              {entries.map(([key, value]) => (
                                <div key={key}>
                                  <dt className="text-[10px] uppercase tracking-wide text-neutral-400">{key.replaceAll(/([A-Z])/g, " $1").replaceAll("_", " ")}</dt>
                                  <dd className="mt-1 whitespace-pre-wrap text-sm font-medium text-neutral-800">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                                </div>
                              ))}
                            </dl>}
                            {pourSteps.length > 0 && <ol className="mt-4 space-y-2">
                              {pourSteps.map((step, index) => (
                                <li key={index} className="grid grid-cols-[2rem_1fr_auto] gap-3 rounded-xl bg-neutral-50 px-3 py-2 text-xs">
                                  <span className="font-mono text-neutral-400">{index + 1}</span>
                                  <span>{step.amount || "—"}</span>
                                  <span className="font-mono text-neutral-500">{step.time || "—"}</span>
                                </li>
                              ))}
                            </ol>}
                          </div>
                        )
                      })}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {!hasVerificationPatterns && parameters.length > 0 && (
            <section className="rounded-3xl border border-sky-100 bg-gradient-to-br from-sky-50/70 to-white p-6 shadow-[0_18px_55px_-44px_rgba(14,116,144,0.4)] sm:p-8">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.extraction}</h2>
              <dl className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">{parameters.map((item) => <div key={item.label}><dt className="text-[10px] text-neutral-400">{item.label}</dt><dd className="mt-1 text-sm font-semibold text-neutral-900">{item.value}</dd></div>)}</dl>
            </section>
          )}

          {!hasVerificationPatterns && recipe.pour_steps && recipe.pour_steps.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.pourSteps}</h2>
              <ol className="mt-4 space-y-2">
                {recipe.pour_steps.map((step, index) => (
                  <li key={step.id || index} className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm">
                    <span className="font-mono text-[10px] text-neutral-400">{String(index + 1).padStart(2, "0")}</span>
                    <span className="text-neutral-800">{step.amount || "—"}</span>
                    <span className="font-mono text-xs text-neutral-500">{step.time || "—"}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {gears.length > 0 && (
            <section>
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.gear}</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">{gears.map((gear) => <div key={gear.id} className="rounded-2xl border border-neutral-200 px-4 py-4"><p className="text-[9px] uppercase tracking-wider text-neutral-400">{lang === "ja" ? gear.brand_ja || gear.brand : gear.brand || gear.brand_ja}</p><p className="mt-1 text-sm font-semibold text-neutral-800">{lang === "ja" ? gear.name_ja || gear.name : gear.name}</p></div>)}</div>
            </section>
          )}

          {!hasVerificationPatterns && (recipe.water_name || recipe.gh != null || recipe.kh != null || recipe.minerals || profileEntries(recipe.water_profile).length > 0) && (
            <section className="rounded-3xl border border-cyan-100 bg-gradient-to-br from-cyan-50/45 to-white p-6 sm:p-8">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.water}</h2>
              <dl className="mt-6 grid gap-5 sm:grid-cols-3">
                {recipe.water_name && <div><dt className="text-[10px] text-neutral-400">{t.waterName}</dt><dd className="mt-1 text-sm font-semibold">{recipe.water_name}</dd></div>}
                {recipe.gh != null && <div><dt className="text-[10px] text-neutral-400">GH</dt><dd className="mt-1 text-sm font-semibold">{recipe.gh}</dd></div>}
                {recipe.kh != null && <div><dt className="text-[10px] text-neutral-400">KH</dt><dd className="mt-1 text-sm font-semibold">{recipe.kh}</dd></div>}
                {recipe.minerals && <div className="sm:col-span-3"><dt className="text-[10px] text-neutral-400">{t.minerals}</dt><dd className="mt-2 whitespace-pre-wrap text-sm leading-7 text-neutral-700">{recipe.minerals}</dd></div>}
                {profileEntries(recipe.water_profile)
                  .filter(([key]) => !["name", "gh", "kh", "minerals"].includes(key))
                  .map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-[10px] uppercase tracking-wide text-neutral-400">{key.replaceAll("_", " ")}</dt>
                      <dd className="mt-1 text-sm font-semibold">{typeof value === "object" ? JSON.stringify(value) : String(value)}</dd>
                    </div>
                  ))}
              </dl>
            </section>
          )}

          {!hasVerificationPatterns && profileEntries(recipe.roast_profile).length > 0 && (
            <section className="rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-50/45 to-white p-6 sm:p-8">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.roast}</h2>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                {profileEntries(recipe.roast_profile).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[10px] uppercase tracking-wide text-neutral-400">{key.replaceAll("_", " ")}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-neutral-800">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {!hasVerificationPatterns && profileEntries(recipe.cupping_profile).length > 0 && (
            <section className="rounded-3xl border border-rose-100 bg-gradient-to-br from-rose-50/40 to-white p-6 sm:p-8">
              <h2 className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{t.cupping}</h2>
              <dl className="mt-6 grid gap-5 sm:grid-cols-2">
                {profileEntries(recipe.cupping_profile).map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-[10px] uppercase tracking-wide text-neutral-400">{key.replaceAll("_", " ")}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm font-semibold text-neutral-800">
                      {typeof value === "object" ? JSON.stringify(value) : String(value)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="space-y-8 border-t border-neutral-200 pt-10">
            {recipe.log_purpose && <div><h2 className="text-sm font-semibold text-neutral-900">{t.purpose}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-neutral-600">{recipe.log_purpose}</p></div>}
            {recipe.log_process && <div><h2 className="text-sm font-semibold text-neutral-900">{t.process}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-neutral-600">{recipe.log_process}</p></div>}
            {recipe.log_conclusion && <div><h2 className="text-sm font-semibold text-neutral-900">{t.conclusion}</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-8 text-neutral-600">{recipe.log_conclusion}</p></div>}
          </section>

          <section className="border-t border-neutral-200 pt-8">
            <button type="button" onClick={handleBookmark} disabled={bookmarkLoading} className={`w-full rounded-2xl border px-6 py-4 text-xs font-semibold tracking-[0.12em] transition disabled:opacity-50 ${bookmarked ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400"}`}>
              {bookmarked ? t.saved : t.save}
            </button>
            {statusMessage && <div className="mt-3 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-600"><span>{statusMessage}</span><Link href={`/${lang}/members`} className="shrink-0 font-semibold underline underline-offset-2">MEMBERSHIP</Link></div>}
          </section>

          <p className="border-t border-neutral-100 pt-6 text-[10px] tracking-wide text-neutral-400">{new Date(recipe.created_at).toLocaleDateString(lang === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "long", day: "numeric" })}</p>
        </article>
      </div>
      <RelatedContent
        source="pro_recipes"
        currentId={recipe.id}
        authorId={recipe.user_id}
        lang={lang}
      />
    </main>
  )
}
