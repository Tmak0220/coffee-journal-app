"use client"

import React from "react"
import { RecipeFormData } from "./PublishProRecipeForm"

type Props = {
  data: RecipeFormData
  handleFieldChange: (field: string, value: any) => void
  ageingLabel: string | null
  currentLang: "ja" | "en"
}

export default function CoffeeBeansMetaForm({ data, handleFieldChange, ageingLabel, currentLang }: Props) {
  const t = currentLang === "en" ? {
    title: "COFFEE DETAILS",
    description: "Basic information about the coffee used in this verification.",
    bean: "Coffee Name",
    required: "Required",
    beanPlaceholder: "e.g., Ethiopia Yirgacheffe",
    lot: "Lot Number / Roast Level",
    lotPlaceholder: "e.g., Lot #2026-A / Light Roast",
    url: "Product URL (Purchase Link)",
    roastDate: "Roast Date",
  } : {
    title: "使用豆の情報",
    description: "この検証で使用したコーヒーの基本情報",
    bean: "コーヒー名",
    required: "必須",
    beanPlaceholder: "例: エチオピア イルガチェフェ",
    lot: "ロット番号 / 焙煎度など",
    lotPlaceholder: "例: Lot #2026-A / 浅煎り",
    url: "商品URL (購入リンク)",
    roastDate: "焙煎日",
  }
  const subLabelStyle = "mb-2 block text-[11px] font-bold uppercase tracking-[0.12em] text-neutral-600"
  const inputStyle = "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm outline-none transition-all placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-4 focus:ring-neutral-100"

  return (
    <section className="space-y-6 rounded-2xl border border-neutral-200 bg-neutral-50/45 p-5 shadow-sm sm:p-7">
      <header className="border-b border-neutral-200 pb-4">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.16em] text-neutral-800">{t.title}</h3>
        <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-500">{t.description}</p>
      </header>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={subLabelStyle}>
            {t.bean}
            <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">({t.required})</span>
          </label>
          <input 
            type="text" 
            required
            placeholder={t.beanPlaceholder}
            value={data.coffeeName} 
            onChange={(e) => handleFieldChange("coffeeName", e.target.value)} 
            className={inputStyle} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.lot}</label>
          <input 
            type="text" 
            placeholder={t.lotPlaceholder}
            value={data.coffeeLot} 
            onChange={(e) => handleFieldChange("coffeeLot", e.target.value)} 
            className={inputStyle} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.url}</label>
          <input 
            type="url" 
            placeholder="https://roastery-shop.com/..." 
            value={data.coffeeUrl || ""} 
            onChange={(e) => handleFieldChange("coffeeUrl", e.target.value)} 
            className={inputStyle} 
          />
        </div>
        <div className="sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className={subLabelStyle}>{t.roastDate}</label>
            {ageingLabel && (
              <span className="text-[10px] font-mono font-bold text-neutral-500 bg-neutral-200/60 px-2 py-0.5 rounded mb-1.5">
                {ageingLabel}
              </span>
            )}
          </div>
          <input 
            type="date" 
            value={data.roastDate} 
            onChange={(e) => handleFieldChange("roastDate", e.target.value)} 
            className={inputStyle} 
          />
        </div>
      </div>
    </section>
  )
}
