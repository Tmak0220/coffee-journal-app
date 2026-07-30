"use client"

import React, { useEffect, useState } from "react"
import { RecipeModuleData } from "./PublishProRecipeForm"
import { supabase } from "@/lib/supabase"
import UnitNumberInput from "@/components/ui/UnitNumberInput"

type Props = {
  slotId: string
  module: RecipeModuleData
  diffClasses?: {
    temp?: string
    grindSize?: string
    ratio?: string
    tds?: string
    bloomTime?: string
    totalTime?: string
    pourSteps?: string
    gears?: string
  }
  onUpdate: (updatedFields: Partial<RecipeModuleData>) => void
  onRemove: () => void
  lang?: "ja" | "en"
}

function calculateEY(tdsStr: string, ratioStr: string) {
  const tds = parseFloat(tdsStr)
  const ratio = parseFloat(ratioStr)
  if (isNaN(tds) || isNaN(ratio) || ratio === 0) {
    return { approx: "--", corrected: "--" }
  }
  const approxVal = tds * ratio
  const correctedVal = tds * (ratio - 0.9)

  return {
    approx: isNaN(approxVal) ? "--" : `${approxVal.toFixed(2)}%`,
    corrected: isNaN(correctedVal) ? "--" : `${correctedVal.toFixed(2)}%`
  }
}

export default function RecipeModuleForm({ slotId, module, diffClasses, onUpdate, onRemove, lang = "ja" }: Props) {
  const t = lang === "en" ? {
    remove: "Remove",
    gears: "Gears",
    gearsDescription: "Equipment used for brewing, such as drippers, servers, and filters.",
    gearPlaceholder: "Enter equipment name (e.g., Hario V60)",
    addGear: "Add Equipment",
    temperature: "Temperature",
    grind: "Grind Size",
    grindPlaceholder: "Medium / EK43: 11.5",
    ratio: "Brew Ratio",
    tds: "Measured TDS",
    approx: "Approximate",
    corrected: "Corrected Yield",
    bloom: "Bloom Time",
    total: "Total Time",
    pourSteps: "Pour / Process Steps",
    pourStepsDescription: "Record pour amounts and process stages, including AeroPress steps.",
    amountPlaceholder: "Amount / process (e.g. 60 ml / press)",
    timePlaceholder: "Time (e.g. 0:30)",
    addStep: "Add Step",
  } : {
    remove: "削除",
    gears: "Gears / 使用器具",
    gearsDescription: "抽出に使用した器具（ドリッパー、サーバー、ペーパーなど）の構成。",
    gearPlaceholder: "器具名を入力 (例: Hario V60)",
    addGear: "器具を追加",
    temperature: "Temperature / 湯温",
    grind: "Grind Size / 挽き目",
    grindPlaceholder: "中挽き / EK43: 11.5",
    ratio: "Brew Ratio / 抽出比率",
    tds: "Measured TDS / 測定 TDS",
    approx: "Approx / 近似値",
    corrected: "Corrected / 補正値",
    bloom: "Bloom Time / 蒸らし時間",
    total: "Total Time / 総抽出時間",
    pourSteps: "Pour / Process Steps",
    pourStepsDescription: "注湯回数や工程の記録（ドリップの注湯量、エアロプレスの工程など）",
    amountPlaceholder: "量・工程（例: 60 ml / プレス）",
    timePlaceholder: "時間（例: 0:30）",
    addStep: "ステップを追加",
  }
  const [gearOptions, setGearOptions] = useState<Array<{ id: number; name: string; name_ja: string | null; brand: string | null; brand_ja: string | null; search_keywords: string | null }>>([])
  const [activeGearIndex, setActiveGearIndex] = useState<number | null>(null)

  useEffect(() => {
    supabase.from("gears").select("id, name, name_ja, brand, brand_ja, search_keywords").order("name").then(({ data }) => {
      if (data) setGearOptions(data)
    })
  }, [])
  const { approx, corrected } = calculateEY(module.tds, module.ratio)

  const subLabelStyle = "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-600"
  const descStyle = "mb-3 -mt-1 block text-[11px] leading-relaxed text-neutral-500"
  const baseInputStyle = "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-4 focus:ring-neutral-100"
  const sanitizeTime = (value: string) => value
    .replace(/[０-９]/g, (character) => String(character.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":")
    .replace(/[^\d:]/g, "")
    .replace(/(:.*):/g, "$1")

  return (
    <section className="relative space-y-7 rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_12px_35px_-30px_rgba(0,0,0,0.35)] sm:p-7">
      
      {/* ヘッダー */}
      <header className="flex items-center justify-between border-b border-neutral-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-800">
            RECIPE COMPONENT
          </span>
        </div>
        <button 
          type="button" 
          onClick={onRemove} 
          className="rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
        >
          {t.remove}
        </button>
      </header>

      {/* 使用器具エリア */}
      <div className="space-y-2.5">
        <div>
          <label className={subLabelStyle}>{t.gears}</label>
          <p className={descStyle}>{t.gearsDescription}</p>
        </div>
        <div className="space-y-2">
          {(module.gears || [{ gearId: null, name: "" }]).map((gear, gIdx) => {
            const query = gear.name.trim().toLowerCase()
            const suggestions = query ? gearOptions.filter(option => {
              const localizedName = lang === "ja" ? option.name_ja : option.name
              const localizedBrand = lang === "ja" ? option.brand_ja : option.brand
              return [localizedName, localizedBrand, option.search_keywords]
                .filter(Boolean)
                .join(" ")
                .toLowerCase()
                .includes(query)
            }).slice(0, 8) : []
            return <div key={gIdx} className="flex items-center gap-2.5 max-w-xl group relative">
              <span className="w-8 h-[38px] border border-neutral-200 bg-neutral-50/50 rounded-xl flex items-center justify-center font-mono text-[11px] font-bold text-neutral-400 select-none">
                {String(gIdx + 1).padStart(2, "0")}
              </span>
              <input
                type="text"
                placeholder={t.gearPlaceholder}
                value={gear.name}
                onChange={(e) => {
                  const updatedGears = [...module.gears]
                  updatedGears[gIdx] = { gearId: null, name: e.target.value }
                  onUpdate({ gears: updatedGears })
                  setActiveGearIndex(gIdx)
                }}
                onFocus={() => setActiveGearIndex(gIdx)}
                className={`${baseInputStyle} ${diffClasses?.gears || ""}`}
              />
              {activeGearIndex === gIdx && suggestions.length > 0 && (
                <div className="absolute left-10 right-10 top-full mt-1 z-30 bg-white border border-neutral-200 rounded-xl shadow-xl p-1 max-h-52 overflow-y-auto">
                  {suggestions.map(option => <button key={option.id} type="button" onMouseDown={() => {
                    const updatedGears = [...module.gears]
                    updatedGears[gIdx] = { gearId: option.id, name: lang === "ja" ? (option.name_ja || option.name) : option.name }
                    onUpdate({ gears: updatedGears })
                    setActiveGearIndex(null)
                  }} className="block w-full text-left px-3 py-2 text-xs rounded-lg hover:bg-neutral-50">
                    <span className="font-semibold">{lang === "ja" ? (option.name_ja || option.name) : option.name}</span>
                    {(lang === "ja" ? (option.brand_ja || option.brand) : option.brand) && (
                      <span className="ml-2 text-neutral-400">{lang === "ja" ? (option.brand_ja || option.brand) : option.brand}</span>
                    )}
                  </button>)}
                </div>
              )}
              {module.gears.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const updatedGears = module.gears.filter((_, i) => i !== gIdx)
                    onUpdate({ gears: updatedGears })
                  }}
                  className="text-neutral-400 hover:text-red-500 text-xs transition-colors p-1.5 opacity-60 group-hover:opacity-100"
                >
                  {t.remove}
                </button>
              )}
            </div>
          })}
        </div>
        <button 
          type="button" 
          onClick={() => onUpdate({ gears: [...(module.gears || []), { gearId: null, name: "" }] })} 
          className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-700 transition-colors inline-block mt-1"
        >
          {t.addGear}
        </button>
      </div>

      {/* 湯温・挽き目 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={subLabelStyle}>{t.temperature}</label>
          <UnitNumberInput
            min="0"
            step="0.1"
            placeholder="92"
            value={module.temp}
            unit="°C"
            onValueChange={(value) => onUpdate({ temp: value })}
            className={diffClasses?.temp || ""}
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.grind}</label>
          <input 
            type="text" 
            placeholder={t.grindPlaceholder}
            value={module.grindSize} 
            onChange={(e) => onUpdate({ grindSize: e.target.value })} 
            className={`${baseInputStyle} ${diffClasses?.grindSize || ""}`} 
          />
        </div>
      </div>

      {/* 比率・TDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={subLabelStyle}>{t.ratio}</label>
          <UnitNumberInput
            min="0"
            step="0.1"
            placeholder="15.0"
            value={module.ratio}
            prefix="1 :"
            onValueChange={(value) => onUpdate({ ratio: value })}
            className={diffClasses?.ratio || ""}
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.tds}</label>
          <UnitNumberInput
            min="0"
            step="0.01"
            placeholder="1.35"
            value={module.tds}
            unit="%"
            onValueChange={(value) => onUpdate({ tds: value })}
            className={diffClasses?.tds || ""}
          />
        </div>
      </div>

      {/* 収率表示カード (EY) */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1 border-b border-neutral-200/60 pb-2">
          <span className="text-[11px] font-bold text-neutral-700 tracking-wider font-mono uppercase">Extraction Yield (EY)</span>
          <span className="text-[9px] font-mono text-neutral-400">Formula: TDS × (Target Vol / Dose)</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-3 text-center shadow-sm">
            <span className="text-[9px] font-bold text-neutral-400 tracking-widest block mb-0.5 uppercase font-mono">{t.approx}</span>
            <span className="text-lg font-mono font-bold text-neutral-900 tracking-tight">{approx}</span>
          </div>
          <div className="rounded-xl bg-neutral-900 p-3 text-center text-white shadow-sm">
            <span className="text-[9px] font-bold text-neutral-400 tracking-widest block mb-0.5 uppercase font-mono">{t.corrected}</span>
            <span className="text-lg font-mono font-bold text-white tracking-tight">{corrected}</span>
          </div>
        </div>
      </div>

      {/* 蒸らし・総抽出時間 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={subLabelStyle}>{t.bloom}</label>
          <UnitNumberInput
            min="0"
            step="1"
            placeholder="45"
            value={module.bloomTime}
            unit={lang === "en" ? "sec" : "秒"}
            onValueChange={(value) => onUpdate({ bloomTime: value })}
            className={diffClasses?.bloomTime || ""}
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.total}</label>
          <input 
            type="text" 
            placeholder="2:45" 
            value={module.totalTime} 
            inputMode="numeric"
            onChange={(e) => onUpdate({ totalTime: sanitizeTime(e.target.value) })} 
            className={`${baseInputStyle} ${diffClasses?.totalTime || ""}`} 
          />
        </div>
      </div>

      <div className={`space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/40 p-4 ${diffClasses?.pourSteps || ""}`}>
        <div>
          <label className={subLabelStyle}>{t.pourSteps}</label>
          <p className={descStyle}>{t.pourStepsDescription}</p>
        </div>
        {(module.pourSteps || []).map((step, index) => (
          <div key={step.id} className="grid grid-cols-[2rem_1fr_1fr_auto] items-center gap-2">
            <span className="text-center font-mono text-[10px] text-neutral-400">{String(index + 1).padStart(2, "0")}</span>
            <input
              type="text"
              value={step.amount}
              placeholder={t.amountPlaceholder}
              onChange={(event) => onUpdate({ pourSteps: module.pourSteps.map((item) => item.id === step.id ? { ...item, amount: event.target.value } : item) })}
              className={baseInputStyle}
            />
            <input
              type="text"
              value={step.time}
              placeholder={t.timePlaceholder}
              onChange={(event) => onUpdate({ pourSteps: module.pourSteps.map((item) => item.id === step.id ? { ...item, time: event.target.value } : item) })}
              className={baseInputStyle}
            />
            <button
              type="button"
              disabled={module.pourSteps.length <= 1}
              onClick={() => onUpdate({ pourSteps: module.pourSteps.filter((item) => item.id !== step.id) })}
              className="px-2 text-xs text-neutral-400 transition hover:text-red-500 disabled:opacity-30"
            >
              {t.remove}
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => onUpdate({ pourSteps: [...(module.pourSteps || []), { id: `step-${Date.now()}`, amount: "", time: "" }] })}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-medium text-neutral-700 transition hover:border-neutral-400"
        >
          + {t.addStep}
        </button>
      </div>
    </section>
  )
}
