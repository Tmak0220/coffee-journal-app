"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

type Category = { id: string; name: string; slug: string }

type Props = { 
  categories: Category[] 
  ownerId: string 
  onCategoryChanged: () => void 
  lang?: string // 🔥 これまでのやり取りを考慮して多言語パラメータを追加
}

// 🌐 フォーム各種テキスト・プレースホルダーの日英辞書
const managerDict = {
  ja: {
    placeholderName: "名前 (例: 浅煎り)",
    placeholderSlug: "スラッグ (例: light)",
    adding: "追加中...",
    addButton: "+ カテゴリーを追加"
  },
  en: {
    placeholderName: "Name (e.g. Light Roast)",
    placeholderSlug: "Slug (e.g. light)",
    adding: "Adding...",
    addButton: "+ Add Category"
  }
}

export default function CategoryManager({ categories, ownerId, onCategoryChanged, lang = "ja" }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = managerDict[currentLang]

  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) return
    setAdding(true)

    const { error } = await supabase.from("coffee_categories").insert({
      owner_id: ownerId,
      name: name.trim(),
      slug: slug.trim().toLowerCase()
    })

    setAdding(false)
    if (!error) {
      setName("")
      setSlug("")
      onCategoryChanged()
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coffee_categories").delete().eq("id", id)
    if (!error) onCategoryChanged()
  }

  return (
    <div className="space-y-4">
      {/* 既存カテゴリーのバッジ表示 */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat) => (
          <span key={cat.id} className="inline-flex items-center gap-1.5 bg-background border text-[11px] px-2.5 py-1 rounded-lg">
            {cat.name}
            <button type="button" onClick={() => handleDelete(cat.id)} className="text-subtle hover:text-red-500 font-bold">×</button>
          </span>
        ))}
      </div>

      {/* 新規追加フォーム */}
      <form onSubmit={handleAdd} className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2">
        {/* 💡 プレースホルダーとボタンテキストを辞書データから動的参照に変更 */}
        <input 
          type="text" 
          placeholder={t.placeholderName} 
          value={name} 
          onChange={(e) => setName(e.target.value)} 
          className="bg-background border border-border rounded-xl p-2 text-[11px] focus:outline-none" 
          required 
        />
        <input 
          type="text" 
          placeholder={t.placeholderSlug} 
          value={slug} 
          onChange={(e) => setSlug(e.target.value)} 
          className="bg-background border border-border rounded-xl p-2 text-[11px] focus:outline-none" 
          required 
        />
        <button type="submit" disabled={adding} className="col-span-2 bg-foreground text-background text-[11px] py-1.5 rounded-lg font-semibold mt-1">
          {adding ? t.adding : t.addButton}
        </button>
      </form>
    </div>
  )
}