"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Post } from "./PostPageClient"

type DetailsProps = {
  post: Post | null | undefined
  lang: "ja" | "en"
}

const TASTE_STYLE_MAP = {
  flavor: {
    bg: "bg-amber-50/80",
    border: "border-amber-200",
    text: "text-amber-900"
  },
  mouthfeel: {
    bg: "bg-orange-50/80",
    border: "border-orange-200",
    text: "text-orange-900"
  },
  aftertaste: {
    bg: "bg-rose-50/80",
    border: "border-rose-200",
    text: "text-rose-900"
  },
  default: {
    bg: "bg-neutral-50",
    border: "border-neutral-200",
    text: "text-neutral-700"
  }
} as const

export default function CoffeeDetails({ post, lang }: DetailsProps) {
  const currentLang = lang === "en" ? "en" : "ja"
  
  // 1. フレーバータグの取得
  const flavorTags = useMemo(() => {
    if (!post || !Array.isArray(post.post_tastes)) return []

    return post.post_tastes
      .map((item) => {
        const t = item?.tastes
        if (!t) return null
        
        const rawType = t.attribute_type || "default"
        const typeKey = (rawType in TASTE_STYLE_MAP ? rawType : "default") as keyof typeof TASTE_STYLE_MAP
        
        return {
          name: currentLang === "en" ? t.name : t.name_ja,
          type: typeKey
        }
      })
      .filter((t): t is { name: string; type: keyof typeof TASTE_STYLE_MAP } => !!t)
  }, [post, currentLang])

  // 💡 2. 複数品種（post_varieties）の取得・整形
  const varietiesString = useMemo(() => {
    if (!post || !Array.isArray(post.post_varieties) || post.post_varieties.length === 0) return null
    
    return post.post_varieties
      .map((pv) => {
        const v = pv?.varieties
        if (!v) return null
        return currentLang === "ja" ? v.name_ja || v.name : v.name || v.name_ja
      })
      .filter(Boolean)
      .join(", ")
  }, [post, currentLang])

  // 💡 3. 複数精製方法（post_processes）の取得・整形
  const processesString = useMemo(() => {
    if (!post || !Array.isArray(post.post_processes) || post.post_processes.length === 0) return null

    return post.post_processes
      .map((pp) => {
        const p = pp?.processes
        if (!p) return null
        return currentLang === "ja" ? p.name_ja || p.name : p.name || p.name_ja
      })
      .filter(Boolean)
      .join(", ")
  }, [post, currentLang])

  const getOriginName = (origin: any, fallbackId: number | null | undefined) => {
    if (!origin) return fallbackId ? `ID: ${fallbackId}` : null
    return currentLang === "ja" 
      ? origin.name_ja || origin.display_name || origin.name 
      : origin.display_name_en || origin.name
  }

  const formatSeconds = (seconds: number | null | undefined) => {
    if (seconds == null) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m === 0 ? `${s}秒` : `${m}分${s}秒`
  }

  const recipe = post?.recipes
  const hasRecipeData = !!(
    recipe &&
    (recipe.temperature ||
      recipe.grind_size ||
      recipe.brew_ratio ||
      recipe.tds ||
      recipe.bloom_time_seconds ||
      recipe.total_time_seconds ||
      recipe.notes)
  )

  const bloomTime = formatSeconds(recipe?.bloom_time_seconds)
  const totalTime = formatSeconds(recipe?.total_time_seconds)

  const approxEY = recipe?.extraction_yield_approx 
    ? `${Number(recipe.extraction_yield_approx).toFixed(2)}%`
    : recipe?.tds && recipe?.brew_ratio 
      ? `${(recipe.tds * recipe.brew_ratio).toFixed(2)}%` 
      : null

  const correctedEY = recipe?.extraction_yield_corrected
    ? `${Number(recipe.extraction_yield_corrected).toFixed(2)}%`
    : recipe?.tds && recipe?.brew_ratio
      ? `${((recipe.tds * recipe.brew_ratio) / (1 - recipe.tds / 100)).toFixed(2)}%`
      : null

  const sourceName = getOriginName(post?.source_origin, post?.source_origin_id)
  const marketName = getOriginName(post?.market_origin, post?.market_origin_id)

  if (!post) {
    return (
      <div aria-busy="true" className="animate-pulse space-y-5 py-8">
        <div className="h-4 w-32 rounded bg-neutral-100" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-xl border border-neutral-100 p-4">
              <div className="h-3 w-16 rounded bg-neutral-100" />
              <div className="mt-3 h-4 w-3/4 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-12 text-neutral-800 antialiased">
      
      {/* 1. タイトル & フレーバータグ */}
      <div className="space-y-6">
        <h1 className="text-3xl font-semibold sm:text-[42px] tracking-[-0.035em] text-neutral-950 leading-[1.18]">
          {post.title || "Untitled Coffee"}
        </h1>
        
        {flavorTags.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {flavorTags.map((tag, idx) => {
              const style = TASTE_STYLE_MAP[tag.type] || TASTE_STYLE_MAP.default
              return (
                <span 
                  key={idx} 
                  className={`${style.bg} ${style.border} ${style.text} text-[12px] font-medium tracking-wide px-3.5 py-1.5 rounded-full border border-opacity-60 transition-all duration-200 select-none`}
                >
                  {tag.name}
                </span>
              )
            })}
          </div>
        )}
      </div>

      {/* 2. 味わいの説明文 (Taste Profile) */}
      {post.tastes && typeof post.tastes === "string" && (
        <div className="relative rounded-3xl border border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-white p-6 shadow-[0_16px_45px_-32px_rgba(14,116,144,0.45)] sm:p-7">
          <span className="text-[10px] text-sky-800/60 font-bold tracking-[0.2em] uppercase block mb-3">
            — Taste Profile
          </span>
          <p className="text-neutral-900 text-[15px] sm:text-[16px] leading-relaxed tracking-wide font-medium whitespace-pre-line">
            {post.tastes}
          </p>
        </div>
      )}

      {/* 3. ストーリー説明文 (Description) */}
      {post.description && (
        <div className="relative my-10 border-l-2 border-amber-400/60 py-1 pl-6">
          <span className="text-[10px] text-neutral-400 font-bold tracking-[0.2em] uppercase block mb-3">
            Story & Notes
          </span>
          <p className="text-neutral-600 text-sm sm:text-[15px] leading-relaxed tracking-wide whitespace-pre-line font-normal">
            {post.description}
          </p>
        </div>
      )}

      {/* 4. コーヒープロファイル */}
      <div className="pt-6 border-t border-neutral-100 space-y-6">
        <span className="text-[10px] text-neutral-400 font-bold tracking-[0.2em] uppercase block">
          Coffee Profile
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-8 gap-y-6">
          
          {/* 産地 / 農園 (リンク付き) */}
          {sourceName && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">産地 / 農園</span>
              {post.source_origin?.slug ? (
                <Link 
                  href={`/${currentLang}/origins/${post.source_origin.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-bold text-neutral-900 text-[14px] leading-snug group transition-all duration-200"
                >
                  <span className="border-b border-transparent group-hover:border-neutral-900 transition-all">
                    {sourceName}
                  </span>
                  <span className="text-[10px] ml-1 text-neutral-400 font-normal inline-block opacity-0 group-hover:opacity-100 transform translate-y-[-1px] transition-all">↗</span>
                </Link>
              ) : (
                <p className="font-bold text-neutral-900 text-[14px] leading-snug">{sourceName}</p>
              )}
            </div>
          )}

          {/* ロースター (リンク付き) */}
          {marketName && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">ロースター</span>
              {post.market_origin?.slug ? (
                <Link 
                  href={`/${currentLang}/origins/${post.market_origin.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block font-bold text-neutral-900 text-[14px] leading-snug group transition-all duration-200"
                >
                  <span className="border-b border-transparent group-hover:border-neutral-900 transition-all">
                    {marketName}
                  </span>
                  <span className="text-[10px] ml-1 text-neutral-400 font-normal inline-block opacity-0 group-hover:opacity-100 transform translate-y-[-1px] transition-all">↗</span>
                </Link>
              ) : (
                <p className="font-bold text-neutral-900 text-[14px] leading-snug">{marketName}</p>
              )}
            </div>
          )}

          {/* 💡 複数品種のカンマ区切り表示 */}
          {varietiesString && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">品種</span>
              <p className="font-bold text-neutral-800 text-[14px] leading-snug break-words">{varietiesString}</p>
            </div>
          )}

          {/* 💡 複数精製方法のカンマ区切り表示 */}
          {processesString && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">精製方法</span>
              <p className="font-bold text-neutral-800 text-[14px] leading-snug break-words">{processesString}</p>
            </div>
          )}

        </div>
      </div>

      {/* 5. 抽出レシピ領域 */}
      {hasRecipeData && recipe && (
        <div className="border border-neutral-200/80 rounded-3xl p-6 sm:p-8 bg-neutral-50/40 space-y-6 max-w-xl shadow-[0_10px_30px_-10px_rgba(0,0,0,0.03)]">
          <div className="flex items-center justify-between border-b border-neutral-200/60 pb-4">
            <h3 className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">Brew Record</h3>
            <span className="text-[9px] tracking-widest px-2.5 py-1 bg-white border border-neutral-200 text-neutral-500 rounded-md font-bold uppercase">
              RECIPE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[13px]">
            {recipe.temperature && (
              <div className="space-y-1">
                <span className="text-neutral-400 font-medium">抽出湯温</span>
                <p className="font-bold text-neutral-900 text-base">{recipe.temperature}<span className="text-xs ml-0.5 font-normal text-neutral-500">°C</span></p>
              </div>
            )}
            {recipe.grind_size && (
              <div className="space-y-1">
                <span className="text-neutral-400 font-medium">挽き目</span>
                <p className="font-bold text-neutral-900 text-[15px] break-words">{recipe.grind_size}</p>
              </div>
            )}
            {recipe.brew_ratio && (
              <div className="space-y-1">
                <span className="text-neutral-400 font-medium">Brew Ratio</span>
                <p className="font-bold text-neutral-900 text-base">1 : {recipe.brew_ratio}</p>
              </div>
            )}
            {recipe.tds && (
              <div className="space-y-1">
                <span className="text-neutral-400 font-medium">TDS</span>
                <p className="font-bold text-neutral-900 text-base">{recipe.tds}<span className="text-xs ml-0.5 font-normal text-neutral-500">%</span></p>
              </div>
            )}
            {bloomTime && (
              <div className="space-y-1">
                <span className="text-neutral-400 font-medium">蒸らし時間</span>
                <p className="font-bold text-neutral-900 text-[15px]">{bloomTime}</p>
              </div>
            )}
            {totalTime && (
              <div className="space-y-1">
                <span className="text-neutral-400 font-medium">全体時間</span>
                <p className="font-bold text-neutral-900 text-[15px]">{totalTime}</p>
              </div>
            )}
          </div>

          {/* EY (収率) */}
          {(approxEY || correctedEY) && (
            <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 space-y-3 shadow-3xs">
              <span className="text-[10px] text-neutral-400 font-bold tracking-[0.1em] block">収率 (Extraction Yield)</span>
              <div className="grid grid-cols-2 gap-4 text-left">
                {approxEY && (
                  <div>
                    <div className="text-[10px] text-neutral-400 font-medium">近似値 (Approx)</div>
                    <div className="text-sm font-bold mt-0.5 text-neutral-800">{approxEY}</div>
                  </div>
                )}
                {correctedEY && (
                  <div className="border-l border-neutral-100 pl-4">
                    <div className="text-[10px] text-neutral-400 font-medium">補正値 (Corrected)</div>
                    <div className="text-sm font-bold mt-0.5 text-neutral-900">{correctedEY}</div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          {recipe.notes && (
            <div className="text-[13px] pt-4 border-t border-neutral-200/60 space-y-1.5">
              <span className="text-neutral-400 font-medium block">抽出メモ</span>
              <p className="text-neutral-600 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-neutral-200/60 shadow-3xs">
                {recipe.notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
