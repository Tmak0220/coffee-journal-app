"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

const TASTES_LIST = [
  { id: "floral", label: "🌸 Floral" },
  { id: "citrus", label: "🍋 Citrus" },
  { id: "berry", label: "🍓 Berry" },
  { id: "stone_fruit", label: "🍑 Stone Fruit" },
  { id: "chocolatey", label: "🍫 Chocolatey" },
  { id: "nutty", label: "🥜 Nutty" },
  { id: "herbal", label: "🌿 Herbal" },
  { id: "spicy", label: "🌶️ Spicy" },
  { id: "caramel", label: "🍮 Caramel" },
]

export default function FlavorCombinator() {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  const toggleTaste = (id: string) => {
    if (selected.includes(id)) {
      setSelected(selected.filter((t) => t !== id))
    } else {
      if (selected.length < 2) {
        setSelected([...selected, id])
      }
    }
  }

  const handleSearch = () => {
    if (selected.length === 0) return
    router.push(`/search/result?tastes=${selected.join(",")}`)
  }

  return (
    <section className="space-y-4 bg-neutral-50/60 border border-neutral-100 rounded-2xl p-5">
      <div className="space-y-0.5">
        <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950">
          FLAVOR COMBINATION / フレーバーの掛け合わせ
        </h2>
        <p className="text-[11px] text-subtle">
          tastes配列タグから最大2つを選択。完全に両方の属性を持つログをAND絞り込みします。
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {TASTES_LIST.map((taste) => {
          const isChecked = selected.includes(taste.id)
          const isDisabled = selected.length >= 2 && !isChecked

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
          選択中: [ {selected.map(t => t.toUpperCase()).join(" × ") || "なし"} ]
        </div>
        <button
          onClick={handleSearch}
          disabled={selected.length === 0}
          className="bg-foreground text-background font-bold text-xs px-5 py-2.5 rounded-xl disabled:opacity-30 transition hover:bg-neutral-800"
        >
          この掛け合わせで探す
        </button>
      </div>
    </section>
  )
}