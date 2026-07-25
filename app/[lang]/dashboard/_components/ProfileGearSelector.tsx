"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Gear = { id: number; name: string; name_ja: string | null; brand: string | null; brand_ja: string | null; search_keywords: string | null }

export default function ProfileGearSelector({ value, onChange, lang }: { value: number[]; onChange: (ids: number[]) => void; lang: "ja" | "en" }) {
  const [gears, setGears] = useState<Gear[]>([])
  const [query, setQuery] = useState("")

  useEffect(() => {
    supabase.from("gears").select("id, name, name_ja, brand, brand_ja, search_keywords").order("brand").order("name").then(({ data, error }) => {
      if (error) console.error("Failed to load profile gears:", error)
      setGears((data || []) as Gear[])
    })
  }, [])

  const displayName = (gear: Gear) => {
    const brand = lang === "ja" ? (gear.brand_ja || gear.brand) : gear.brand
    const name = lang === "ja" ? (gear.name_ja || gear.name) : gear.name
    return [brand, name].filter(Boolean).join(" ")
  }
  const selected = gears.filter((gear) => value.includes(gear.id))
  
  const suggestions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return []
    // 💡 .slice(0, 8) を削除し、ヒットするものを全件返すように変更
    return gears.filter((gear) => 
      !value.includes(gear.id) && 
      [gear.name, gear.name_ja, gear.brand, gear.brand_ja, gear.search_keywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    )
  }, [gears, query, value])

  return (
    <div className="space-y-3">
      <div>
        <label className="font-mono text-[14px] font-bold tracking-[0.05em] text-neutral-900">{lang === "ja" ? "普段使用しているコーヒー器具" : "COFFEE GEAR YOU REGULARLY USE"}</label>
        <p className="mt-0.5 text-[12px] tracking-wide text-neutral-400">{lang === "ja" ? "器具名・ブランド名で検索して複数選択できます（任意）" : "Search by gear or brand name and select multiple items (optional)."}</p>
      </div>
      {selected.length > 0 && <div className="flex flex-wrap gap-2">{selected.map((gear) => <button key={gear.id} type="button" onClick={() => onChange(value.filter((id) => id !== gear.id))} className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[12px] text-neutral-700 transition hover:border-neutral-400">{displayName(gear)} <span className="ml-1 text-neutral-400">×</span></button>)}</div>}
      <div className="relative">
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "ja" ? "器具名・ブランド名で検索..." : "Search gear or brand..."} className="w-full rounded-xl border border-neutral-200/80 bg-neutral-50/30 px-4 py-3 text-[14px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white" />
        {query.trim() && (
          <div className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-neutral-200 bg-white shadow-xl">
            {suggestions.length > 0 ? (
              suggestions.map((gear) => (
                <button key={gear.id} type="button" onClick={() => { onChange([...value, gear.id]); setQuery("") }} className="block w-full border-b border-neutral-100 px-4 py-3 text-left text-[13px] text-neutral-700 transition last:border-0 hover:bg-neutral-50">
                  {displayName(gear)}
                </button>
              ))
            ) : (
              <p className="px-4 py-3 text-[12px] text-neutral-400">{lang === "ja" ? "該当する登録器具がありません。" : "No registered gear found."}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}