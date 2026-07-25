"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

// 💡 型定義
type Roaster = {
  id: string
  name: string
  image_url: string | null
  location?: string
}

type Gear = {
  id: string
  name: string
  slug: string
  type: string
}

// 💡 トレンド・フレーバーの固定データ
const TRENDING_TAGS = [
  { label: "Anaerobic", query: "anaerobic", isHot: true },
  { label: "Geisha", query: "geisha", isHot: false },
  { label: "Carbonic Maceration", query: "carbonic", isHot: true },
  { label: "Thermal Shock", query: "thermal_shock", isHot: true },
  { label: "Washed", query: "washed", isHot: false },
]

const ALL_TASTES = [
  { id: "floral", label: "🌸 Floral" },
  { id: "citrus", label: "🍋 Citrus" },
  { id: "berry", label: "🍓 Berry" },
  { id: "stone_fruit", label: "🍑 Stone Fruit" },
  { id: "chocolatey", label: "🍫 Chocolatey" },
  { id: "nutty", label: "🥜 Nutty" },
  { id: "herbal", label: "🌿 Herbal" },
]

export default function SearchCategoryContent() {
  const router = useRouter()
  
  // 💡 状態管理（DBフェッチ用 ＆ 掛け合わせ用）
  const [roasters, setRoasters] = useState<Roaster[]>([])
  const [gears, setGears] = useState<Gear[]>([])
  const [selectedTastes, setSelectedTastes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // 💡 Supabaseからのデータ一括取得
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. 注目のロースター取得
        const { data: roasterData } = await supabase
          .from("origins")
          .select("id, name, image_url")
          .eq("category_type", "roaster")
          .limit(2)

        // 2. 器具マスターテーブルから取得
        const { data: gearData } = await supabase
          .from("gears")
          .select("id, name, slug, type")
          .order("type", { ascending: true })

        setRoasters(roasterData || [])
        setGears(gearData || [])
      } catch (err) {
        console.error("Portal fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // 💡 フレーバー掛け合わせ選択ロジック
  const toggleTaste = (id: string) => {
    if (selectedTastes.includes(id)) {
      setSelectedTastes(selectedTastes.filter((t) => t !== id))
    } else {
      if (selectedTastes.length < 2) {
        setSelectedTastes([...selectedTastes, id])
      }
    }
  }

  const handleFlavorSearch = () => {
    if (selectedTastes.length === 0) return
    router.push(`/search/result?tastes=${selectedTastes.join(",")}`)
  }

  if (loading) {
    return (
      <div aria-busy="true" className="animate-pulse space-y-8">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl border border-neutral-100 bg-neutral-50 shadow-sm" />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-14 rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-16">
      
      {/* ── ⭐ 1. RECOMMENDED ROASTERS (おすすめ) ── */}
      {roasters.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950 border-b border-neutral-100 pb-2">
            RECOMMENDED ROASTERS / 注目のロースター
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {roasters.map((roaster, idx) => {
              const fallbackImage = idx === 0 
                ? "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=300&auto=format&fit=crop"
                : "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=300&auto=format&fit=crop"
              
              return (
                <Link
                  key={roaster.id}
                  href={`/search/result?q=${roaster.name}`}
                  className="group flex gap-4 border border-border bg-surface rounded-2xl p-3.5 hover:border-neutral-300 transition duration-300 active:scale-[0.995]"
                >
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
                    <Image
                      src={roaster.image_url || fallbackImage}
                      alt={roaster.name}
                      fill
                      sizes="96px"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="flex flex-col justify-center py-0.5 min-w-0">
                    <span className="text-[9px] text-subtle font-medium">国内登録ショップ</span>
                    <h3 className="text-sm font-bold text-foreground truncate group-hover:underline mt-0.5">
                      {roaster.name}
                    </h3>
                    <span className="text-[9px] text-amber-800 font-mono font-bold mt-2">VIEW NOTES ➔</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* ── 🔥 2. TRENDING VARIETALS & PROCESS (トレンド) ── */}
      <section className="space-y-3">
        <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950 border-b border-neutral-100 pb-2">
          TRENDING VARIETALS & PROCESS / トレンド・精製
        </h2>
        <div className="flex flex-wrap gap-2">
          {TRENDING_TAGS.map((item) => (
            <Link
              key={item.query}
              href={`/search/result?q=${item.query}`}
              className={`pl-3 pr-2.5 py-2 border rounded-xl text-xs font-mono flex items-center gap-2 transition duration-200 active:scale-[0.97] ${
                item.isHot 
                  ? "bg-amber-950 text-amber-50 border-amber-950 font-bold shadow-sm" 
                  : "bg-surface border-border text-foreground hover:bg-neutral-50"
              }`}
            >
              <span>#{item.label}</span>
              {item.isHot && (
                <span className="text-[8px] bg-amber-800 text-amber-100 px-1 py-0.2 rounded font-sans font-bold">🔥 HOT</span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* ── 🧪 3. FLAVOR COMBINATION (掛け合わせ) ── */}
      <section className="space-y-4 bg-neutral-50/60 border border-neutral-100 rounded-2xl p-5">
        <div className="space-y-0.5">
          <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950">
            FLAVOR COMBINATION / フレーバーの掛け合わせ
          </h2>
          <p className="text-[11px] text-subtle">
            tastes配列から最大2つを選択。完全に両方の属性を持つログをAND絞り込みします。
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_TASTES.map((taste) => {
            const isChecked = selectedTastes.includes(taste.id)
            const isDisabled = selectedTastes.length >= 2 && !isChecked

            return (
              <label
                key={taste.id}
                className={`p-3 border rounded-xl text-xs font-bold text-center tracking-wide cursor-pointer select-none transition duration-200 bg-surface ${
                  isChecked ? "border-foreground shadow-sm bg-neutral-100" : "border-border text-foreground hover:bg-neutral-50"
                } ${isDisabled ? "opacity-30 cursor-not-allowed" : ""}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => toggleTaste(taste.id)}
                />
                {taste.label} {isChecked && "✓"}
              </label>
            )
          })}
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t border-dashed border-neutral-200">
          <div className="text-xs text-subtle font-mono">
            選択中: [ {selectedTastes.map(t => t.toUpperCase()).join(" × ") || "なし"} ]
          </div>
          <button
            onClick={handleFlavorSearch}
            disabled={selectedTastes.length === 0}
            className="bg-foreground text-background font-bold text-xs px-5 py-2.5 rounded-xl disabled:opacity-30 transition hover:bg-neutral-800"
          >
            この掛け合わせで探す
          </button>
        </div>
      </section>

      {/* ── 🛠️ 4. BREWING GEARS (抽出器具テーブル連動) ── */}
      {gears.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950 border-b border-neutral-100 pb-2">
            BREWING GEARS / 抽出器具から探す
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gears.map((gear) => (
              <Link
                key={gear.id}
                href={`/search/result?gear_slug=${gear.slug}`}
                className="border border-border bg-surface hover:bg-neutral-50 hover:border-neutral-300 rounded-xl p-3 flex flex-col gap-0.5 transition"
              >
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
                  {gear.type === "dripper" ? "☕ DRIPPER" : "🛠️ GEAR"}
                </span>
                <span className="text-xs font-bold text-foreground">{gear.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
