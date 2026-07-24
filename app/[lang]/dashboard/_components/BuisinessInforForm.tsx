"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

type Props = {
  profile: any
  onUpdated: () => void
  lang?: string // 🔥 これまでのやり取りを考慮して多言語パラメータを追加
}

// 🌐 各種テキスト、プレースホルダー、ボタン名の日英辞書
const formDict = {
  ja: {
    labelName: "ロースター / 農園名",
    labelAddress: "ロケーション・住所",
    placeholderAddress: "例: 東京都渋谷区... / コロンビア ウィラ県",
    labelWebsite: "公式サイト / SNS リンク",
    labelBio: "ストーリー・紹介文",
    placeholderBio: "コーヒー作りへのこだわりやコンセプトを記入してください。",
    saving: "保存中...",
    saveButton: "ブランド情報を保存"
  },
  en: {
    labelName: "Roastery / Farm Name",
    labelAddress: "Location / Address",
    placeholderAddress: "e.g. Shibuya, Tokyo... / Huila, Colombia",
    labelWebsite: "Official Website / SNS Link",
    labelBio: "Story / Biography",
    placeholderBio: "Please describe your coffee philosophy, concept, or brand story.",
    saving: "Saving...",
    saveButton: "Save Brand Information"
  }
}

export default function BusinessInfoForm({ profile, onUpdated, lang = "ja" }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = formDict[currentLang]

  const [displayName, setDisplayName] = useState(profile.display_name || "")
  const [address, setAddress] = useState(profile.address || "")
  const [website, setWebsite] = useState(profile.website || "")
  const [bio, setBio] = useState(profile.bio || "")
  const [loading, setLoading] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase
      .from("users")
      .update({
        display_name: displayName.trim(),
        address: address.trim() || null,
        website: website.trim() || null,
        bio: bio.trim() || null,
      })
      .eq("id", profile.id)

    setLoading(false)
    if (!error) onUpdated()
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        {/* 💡 各UIテキストを辞書データオブジェクトから動的に参照 */}
        <label className="text-[10px] font-semibold text-subtle block mb-1">{t.labelName}</label>
        <input 
          type="text" 
          value={displayName} 
          onChange={(e) => setDisplayName(e.target.value)} 
          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-foreground/30" 
          required 
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-subtle block mb-1">{t.labelAddress}</label>
        <input 
          type="text" 
          value={address} 
          placeholder={t.placeholderAddress} 
          onChange={(e) => setAddress(e.target.value)} 
          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-foreground/30" 
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-subtle block mb-1">{t.labelWebsite}</label>
        <input 
          type="url" 
          value={website} 
          placeholder="https://..." 
          onChange={(e) => setWebsite(e.target.value)} 
          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-foreground/30" 
        />
      </div>
      <div>
        <label className="text-[10px] font-semibold text-subtle block mb-1">{t.labelBio}</label>
        <textarea 
          value={bio} 
          rows={4} 
          placeholder={t.placeholderBio} 
          onChange={(e) => setBio(e.target.value)} 
          className="w-full bg-background border border-border rounded-xl p-2.5 text-xs focus:outline-none focus:border-foreground/30 resize-none" 
        />
      </div>
      <button 
        type="submit" 
        disabled={loading} 
        className="w-full bg-foreground text-background text-xs py-2.5 rounded-xl font-semibold hover:opacity-90 transition-opacity"
      >
        {loading ? t.saving : t.saveButton}
      </button>
    </form>
  )
}