"use client"

import { useMemo } from "react"
import Link from "next/link"
import { ArrowUpRight } from "lucide-react" // 💡 よりミニマルでモダンな斜め右上矢印を採用
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

// 多言語用辞書
const dict = {
  ja: {
    origin: "産地 / 農園",
    roaster: "ロースター",
    variety: "品種",
    process: "精製方法",
    equipment: "使用器具",
    brewRecord: "Brew Record",
    recipe: "RECIPE",
    temp: "抽出湯温",
    grind: "挽き目",
    brewRatio: "Brew Ratio",
    tds: "TDS",
    bloomTime: "蒸らし時間",
    totalTime: "全体時間",
    ey: "収率 (Extraction Yield)",
    approx: "近似値 (Approx)",
    corrected: "補正値 (Corrected)",
    notes: "抽出メモ",
    provider: "提供者",
    shop: "提供元",
    servingStyle: "提供形態・メニュー",
    processSteps: "Pour / Process Steps",
    min: "分",
    sec: "秒"
  },
  en: {
    origin: "Origin / Farm",
    roaster: "Roaster",
    variety: "Variety",
    process: "Process",
    equipment: "Equipment",
    brewRecord: "Brew Record",
    recipe: "RECIPE",
    temp: "Water Temp",
    grind: "Grind Size",
    brewRatio: "Brew Ratio",
    tds: "TDS",
    bloomTime: "Bloom Time",
    totalTime: "Total Time",
    ey: "Extraction Yield",
    approx: "Approx",
    corrected: "Corrected",
    notes: "Brew Notes",
    provider: "Provider",
    shop: "Shop",
    servingStyle: "Serving Style / Menu",
    processSteps: "Pour / Process Steps",
    min: "m ",
    sec: "s"
  }
}

export default function CoffeeDetails({ post, lang }: DetailsProps) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = dict[currentLang]
  
  // 1. フレーバータグの取得
  const flavorTags = useMemo(() => {
    if (!post || !Array.isArray(post.post_tastes)) return []

    return post.post_tastes
      .map((item) => {
        const tItem = item?.tastes
        if (!tItem) return null
        
        const rawType = tItem.attribute_type || "default"
        const typeKey = (rawType in TASTE_STYLE_MAP ? rawType : "default") as keyof typeof TASTE_STYLE_MAP
        
        return {
          name: currentLang === "en" ? tItem.name : (tItem.name_ja || tItem.name),
          type: typeKey
        }
      })
      .filter((tItem): tItem is { name: string; type: keyof typeof TASTE_STYLE_MAP } => !!tItem)
  }, [post, currentLang])

  // 2. 複数品種（post_varieties）の取得・整形
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

  // 3. 複数精製方法（post_processes）の取得・整形
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

  const equipmentNames = useMemo(() => {
    if (!post || !Array.isArray(post.post_gears)) return []
    return post.post_gears
      .map((item: any) => {
        const gear = item?.gears
        if (!gear) return null
        const name = currentLang === "ja" ? (gear.name_ja || gear.name) : gear.name
        const brand = currentLang === "ja" ? (gear.brand_ja || gear.brand) : gear.brand
        return [brand, name].filter(Boolean).join(" ")
      })
      .filter((name: string | null): name is string => Boolean(name))
  }, [post, currentLang])

  const getOriginName = (origin: any, fallbackId: number | null | undefined) => {
    if (!origin) return fallbackId ? `ID: ${fallbackId}` : null
    return currentLang === "ja" 
      ? origin.display_name || origin.name_ja || origin.name 
      : origin.display_name_en || origin.display_name || origin.name
  }

  const formatSeconds = (seconds: number | null | undefined) => {
    if (seconds == null) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m === 0 ? `${s}${t.sec}` : `${m}${t.min}${s}${t.sec}`
  }

  const recipes = (
    Array.isArray(post?.recipes)
      ? post.recipes
      : post?.recipes
        ? [post.recipes]
        : []
  )
    .filter(recipe => recipe?.mode !== "none")
    .sort((a, b) => (a?.sort_order || 0) - (b?.sort_order || 0))

  const recipeDetails = recipes
    .filter(recipe => (
      recipe.temperature ||
      recipe.grind_size ||
      recipe.brew_ratio ||
      recipe.tds ||
      recipe.bloom_time_seconds ||
      recipe.total_time_seconds ||
      (Array.isArray(recipe.pour_steps) && recipe.pour_steps.length > 0) ||
      recipe.notes ||
      recipe.shop_name ||
      recipe.serving_style ||
      recipe.barista ||
      recipe.mode === "barista"
    ))
    .map(recipe => ({
      recipe,
      providerName: currentLang === "en"
        ? (recipe.barista?.display_name_en || recipe.barista?.display_name || recipe.barista?.username || null)
        : (recipe.barista?.display_name || recipe.barista?.username || null),
      bloomTime: formatSeconds(recipe.bloom_time_seconds),
      totalTime: formatSeconds(recipe.total_time_seconds),
      approxEY: recipe.extraction_yield_approx
        ? `${Number(recipe.extraction_yield_approx).toFixed(2)}%`
        : recipe.tds && recipe.brew_ratio
          ? `${(recipe.tds * recipe.brew_ratio).toFixed(2)}%`
          : null,
      correctedEY: recipe.extraction_yield_corrected
        ? `${Number(recipe.extraction_yield_corrected).toFixed(2)}%`
        : recipe.tds && recipe.brew_ratio
          ? `${((recipe.tds * recipe.brew_ratio) / (1 - recipe.tds / 100)).toFixed(2)}%`
          : null,
    }))

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
        <div className="relative rounded-2xl border border-sky-200/60 bg-sky-50/30 p-6 shadow-sm sm:p-7">
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
        <div className="public-reading-block relative my-10">
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
          
          {/* 産地 / 農園 (洗練された別タブ用リンク) */}
          {sourceName && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">{t.origin}</span>
              {post.source_origin?.slug ? (
                <Link 
                  href={`/${currentLang}/origins/${post.source_origin.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-baseline gap-0.5 font-bold text-neutral-900 text-[14px] leading-snug transition-colors duration-200 hover:text-neutral-600"
                >
                  <span className="border-b border-transparent group-hover:border-neutral-600 transition-all">
                    {sourceName}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 opacity-60 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:text-neutral-900 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 shrink-0 self-center" />
                </Link>
              ) : (
                <p className="font-bold text-neutral-900 text-[14px] leading-snug">{sourceName}</p>
              )}
            </div>
          )}

          {/* ロースター (洗練された別タブ用リンク) */}
          {marketName && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">{t.roaster}</span>
              {post.market_origin?.slug ? (
                <Link 
                  href={`/${currentLang}/origins/${post.market_origin.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-baseline gap-0.5 font-bold text-neutral-900 text-[14px] leading-snug transition-colors duration-200 hover:text-neutral-600"
                >
                  <span className="border-b border-transparent group-hover:border-neutral-600 transition-all">
                    {marketName}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-neutral-400 opacity-60 transition-all duration-200 ease-out group-hover:opacity-100 group-hover:text-neutral-900 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 shrink-0 self-center" />
                </Link>
              ) : (
                <p className="font-bold text-neutral-900 text-[14px] leading-snug">{marketName}</p>
              )}
            </div>
          )}

          {/* 複数品種 */}
          {varietiesString && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">{t.variety}</span>
              <p className="font-bold text-neutral-800 text-[14px] leading-snug break-words">{varietiesString}</p>
            </div>
          )}

          {/* 複数精製方法 */}
          {processesString && (
            <div className="space-y-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">{t.process}</span>
              <p className="font-bold text-neutral-800 text-[14px] leading-snug break-words">{processesString}</p>
            </div>
          )}

          {equipmentNames.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <span className="text-[11px] text-neutral-400 font-medium block tracking-wider">{t.equipment}</span>
              <p className="font-bold text-neutral-800 text-[14px] leading-snug break-words">
                {equipmentNames.join(", ")}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* 5. 抽出レシピ領域 */}
      {recipeDetails.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {recipeDetails.map(({ recipe, providerName, bloomTime, totalTime, approxEY, correctedEY }, index) => (
            <div
              key={recipe.id || index}
              className="space-y-6 rounded-2xl border border-neutral-200 bg-neutral-50/40 p-6 shadow-sm sm:p-8"
            >
              <div className="flex items-center justify-between border-b border-neutral-200/60 pb-4">
                <h3 className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
                  {t.brewRecord}{recipeDetails.length > 1 ? ` ${index + 1}` : ""}
                </h3>
                <span className="text-[9px] tracking-widest px-2.5 py-1 bg-white border border-neutral-200 text-neutral-500 rounded-md font-bold uppercase">
                  {t.recipe}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-5 text-[13px]">
                {recipe.temperature != null && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.temp}</span>
                    <p className="font-bold text-neutral-900 text-base">{recipe.temperature}<span className="text-xs ml-0.5 font-normal text-neutral-500">°C</span></p>
                  </div>
                )}
                {recipe.grind_size && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.grind}</span>
                    <p className="font-bold text-neutral-900 text-[15px] break-words">{recipe.grind_size}</p>
                  </div>
                )}
                {recipe.brew_ratio != null && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.brewRatio}</span>
                    <p className="font-bold text-neutral-900 text-base">1 : {recipe.brew_ratio}</p>
                  </div>
                )}
                {recipe.tds != null && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.tds}</span>
                    <p className="font-bold text-neutral-900 text-base">{recipe.tds}<span className="text-xs ml-0.5 font-normal text-neutral-500">%</span></p>
                  </div>
                )}
                {bloomTime && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.bloomTime}</span>
                    <p className="font-bold text-neutral-900 text-[15px]">{bloomTime}</p>
                  </div>
                )}
                {totalTime && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.totalTime}</span>
                    <p className="font-bold text-neutral-900 text-[15px]">{totalTime}</p>
                  </div>
                )}
                {providerName && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.provider}</span>
                    <p className="font-bold text-neutral-900 text-[15px]">{providerName}</p>
                  </div>
                )}
                {recipe.shop_name && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.shop}</span>
                    <p className="font-bold text-neutral-900 text-[15px]">{recipe.shop_name}</p>
                  </div>
                )}
                {recipe.serving_style && (
                  <div className="space-y-1">
                    <span className="text-neutral-400 font-medium">{t.servingStyle}</span>
                    <p className="font-bold text-neutral-900 text-[15px]">{recipe.serving_style}</p>
                  </div>
                )}
              </div>

              {(approxEY || correctedEY) && (
                <div className="bg-white border border-neutral-200/60 rounded-2xl p-4 space-y-3 shadow-3xs">
                  <span className="text-[10px] text-neutral-400 font-bold tracking-[0.1em] block">{t.ey}</span>
                  <div className="grid grid-cols-2 gap-4 text-left">
                    {approxEY && <div><div className="text-[10px] text-neutral-400 font-medium">{t.approx}</div><div className="text-sm font-bold mt-0.5 text-neutral-800">{approxEY}</div></div>}
                    {correctedEY && <div className="border-l border-neutral-100 pl-4"><div className="text-[10px] text-neutral-400 font-medium">{t.corrected}</div><div className="text-sm font-bold mt-0.5 text-neutral-900">{correctedEY}</div></div>}
                  </div>
                </div>
              )}

              {Array.isArray(recipe.pour_steps) && recipe.pour_steps.length > 0 && (
                <div className="text-[13px] pt-4 border-t border-neutral-200/60 space-y-3">
                  <span className="text-neutral-400 font-medium block">{t.processSteps}</span>
                  <div className="space-y-2">
                    {recipe.pour_steps.map((step: any, stepIndex: number) => (
                      <div key={step.id || stepIndex} className="rounded-xl border border-neutral-200/60 bg-white px-4 py-3 text-neutral-700">
                        <span className="mr-3 text-[10px] font-bold text-neutral-400">{stepIndex + 1}</span>
                        {[step.time, step.amount, step.description || step.note].filter(Boolean).join(" / ")}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {recipe.notes && (
                <div className="text-[13px] pt-4 border-t border-neutral-200/60 space-y-1.5">
                  <span className="text-neutral-400 font-medium block">{t.notes}</span>
                  <p className="text-neutral-600 leading-relaxed whitespace-pre-line bg-white p-4 rounded-xl border border-neutral-200/60 shadow-3xs">{recipe.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
