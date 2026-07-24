"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useTransition } from "react"

type ToolType = "recipe" | "profile" | "cupping"
type ExpertStyle = "all" | "barista" | "brewer" | "roaster" | "cupper" | "buyer" | "coach" | "creator" | "geek"
type RoastLevel = "all" | "light" | "medium" | "dark"
type BeanSegment = "all" | "specialty" | "daily" | "experimental"

type Props = {
  totalCount: number
  styleCounts: Record<ExpertStyle, number>
}

export default function PeopleSearchManager({ totalCount, styleCounts }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const currentStyle = (searchParams.get("style") as ExpertStyle) || "all"
  const currentTool = searchParams.get("tool") || "all"
  const currentRoast = (searchParams.get("roast") as RoastLevel) || "all"
  const currentSegment = (searchParams.get("segment") as BeanSegment) || "all"
  const currentQuery = searchParams.get("q") || ""

  const updateFilters = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === "all" || value === "") {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })

    startTransition(() => {
      router.push(`/people?${params.toString()}`, { scroll: false })
    })
  }

  // グラデーションや絵文字を排除し、Originsの構造に最適化
  const styleCategories: { id: ExpertStyle; label: string; enLabel: string }[] = [
    { id: "barista", label: "バリスタ", enLabel: "BARISTA" },
    { id: "brewer", label: "ブリュワー", enLabel: "BREWER" },
    { id: "roaster", label: "ロースター", enLabel: "ROASTER" },
    { id: "cupper", label: "カッパー", enLabel: "CUPPER" },
    { id: "buyer", label: "バイヤー", enLabel: "BUYER" },
    { id: "coach", label: "コーチ", enLabel: "COACH" },
    { id: "creator", label: "クリエイター", enLabel: "CREATOR" },
    { id: "geek", label: "ギーク", enLabel: "GEEK" },
  ]

  return (
    <div className={`space-y-12 ${isPending ? "opacity-60" : ""} transition-opacity duration-300`}>
      
      {/* ── 🗺️ 職能別ゲート (Originsスタイルのクリーンな3列グリッド) ── */}
      <div className="space-y-4">
        <div className="flex justify-between items-baseline border-b border-zinc-100 pb-2">
          <h2 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">Filter by Expert Style</h2>
          <button
            onClick={() => updateFilters({ style: "all" })}
            className={`text-xs font-mono tracking-widest transition-colors ${
              currentStyle === "all" 
                ? "text-zinc-900 font-bold underline underline-offset-4" 
                : "text-zinc-400 hover:text-zinc-900"
            }`}
          >
            ALL CATEGORIES ({totalCount})
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {styleCategories.map((cat) => {
            const isSelected = currentStyle === cat.id
            const count = styleCounts[cat.id] || 0
            
            return (
              <button
                key={cat.id}
                onClick={() => updateFilters({ style: cat.id })}
                className={`text-left p-6 rounded-xl border transition-all duration-200 flex items-center justify-between group ${
                  isSelected 
                    ? "bg-zinc-50 border-zinc-900 shadow-sm" 
                    : "bg-white border-zinc-200/70 hover:border-zinc-400 hover:shadow-sm"
                }`}
              >
                <div className="space-y-1">
                  <span className="text-[9px] font-mono tracking-widest text-zinc-400 block uppercase">
                    STYLE
                  </span>
                  <div className="flex items-baseline gap-2">
                    <h3 className="text-base font-bold text-zinc-900 tracking-tight">{cat.label}</h3>
                    <span className="text-[10px] font-mono text-zinc-400 font-medium">({count})</span>
                  </div>
                </div>
                
                {/* Origins風の右矢印インジケーター */}
                <div className={`text-zinc-300 transition-transform duration-200 ${
                  isSelected ? "text-zinc-900 translate-x-0.5" : "group-hover:text-zinc-500 group-hover:translate-x-0.5"
                }`}>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── 🔍 検索・詳細属性コントロール（静かでミニマルなインターフェース） ── */}
      <div className="space-y-6 pt-4 border-t border-zinc-100">
        
        {/* キーワード検索入力 */}
        <div className="max-w-md relative">
          <input
            type="text"
            placeholder="Search experts by name, base, or keywords..."
            value={currentQuery}
            onChange={(e) => updateFilters({ q: e.target.value })}
            className="w-full bg-transparent border-b border-zinc-200 py-2 text-sm tracking-wide placeholder-zinc-300 focus:outline-none focus:border-zinc-900 transition-colors"
          />
        </div>

        {/* 各種インライン・テキストフィルター */}
        <div className="flex flex-col gap-4 text-[11px] text-zinc-500">
          
          {/* 公開ツール */}
          <div className="flex items-start gap-4 py-1">
            <span className="font-mono tracking-wider uppercase text-zinc-400 w-20 shrink-0 pt-0.5">Tool /</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[
                { id: "all", label: "ALL" },
                { id: "recipe", label: "RECIPE" },
                { id: "profile", label: "ROAST PROFILE" },
                { id: "cupping", label: "CUPPING LOG" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateFilters({ tool: item.id })}
                  className={`tracking-widest font-mono transition-colors ${
                    currentTool === item.id ? "text-zinc-900 font-bold underline underline-offset-4" : "hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 焙煎度 */}
          <div className="flex items-start gap-4 py-1">
            <span className="font-mono tracking-wider uppercase text-zinc-400 w-20 shrink-0 pt-0.5">Roast /</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[
                { id: "all", label: "ALL" },
                { id: "light", label: "LIGHT" },
                { id: "medium", label: "MEDIUM" },
                { id: "dark", label: "DARK" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateFilters({ roast: item.id })}
                  className={`tracking-widest font-mono transition-colors ${
                    currentRoast === item.id ? "text-zinc-900 font-bold underline underline-offset-4" : "hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 取扱豆 */}
          <div className="flex items-start gap-4 py-1">
            <span className="font-mono tracking-wider uppercase text-zinc-400 w-20 shrink-0 pt-0.5">Segment /</span>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {[
                { id: "all", label: "ALL" },
                { id: "specialty", label: "SPECIALTY" },
                { id: "daily", label: "DAILY / CLASSIC" },
                { id: "experimental", label: "EXPERIMENTAL" }
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateFilters({ segment: item.id })}
                  className={`tracking-widest font-mono transition-colors ${
                    currentSegment === item.id ? "text-zinc-900 font-bold underline underline-offset-4" : "hover:text-zinc-900"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}