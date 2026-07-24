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
    title: "USED COFFEE BEANS",
    bean: "Coffee Beans Used",
    beanPlaceholder: "e.g., Ethiopia Yirgacheffe",
    lot: "Lot Number / Roast Level",
    lotPlaceholder: "e.g., Lot #2026-A / Light Roast",
    url: "Product URL (Purchase Link)",
    roastDate: "Roast Date",
  } : {
    title: "使用したコーヒー豆",
    bean: "使用したコーヒー豆",
    beanPlaceholder: "例: エチオピア イルガチェフェ",
    lot: "ロット番号 / 焙煎度など",
    lotPlaceholder: "例: Lot #2026-A / 浅煎り",
    url: "商品URL (購入リンク)",
    roastDate: "焙煎日",
  }
  const subLabelStyle = "text-[11px] font-bold tracking-widest text-neutral-400 uppercase block mb-1.5"
  const inputStyle = "w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 bg-white text-neutral-900 text-sm focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400/60 transition-all shadow-sm"

  return (
    <div className="bg-neutral-50/50 border border-neutral-200 rounded-[20px] p-5 sm:p-6 space-y-4">
      <h3 className="text-[11px] font-mono font-bold tracking-widest text-neutral-400 uppercase border-b border-neutral-200/60 pb-2">{t.title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className={subLabelStyle}>{t.bean}</label>
          <input 
            type="text" 
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
          <div className="flex justify-between items-center">
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
    </div>
  )
}
