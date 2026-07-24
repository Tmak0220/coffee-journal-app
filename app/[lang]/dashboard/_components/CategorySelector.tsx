"use client"

import React from "react"

// 選択状態の型を定義
export type CategorySelection = {
  main: string | null
  subs: string[]
}

type CategorySelectorProps = {
  value?: CategorySelection // 任意（optional）にしておくことで、undefined時もクラッシュを防ぐ
  onChange: (value: CategorySelection) => void
  label: string
  description?: string
  lang?: "ja" | "en" // ⭐️ lang を受け取れるように追加
}

// ⭐️ 日本語と英語のオプションを定義
const CATEGORY_OPTIONS_JA = [
  "バリスタ",
  "ブリュワー",
  "ロースター",
  "バイヤー",
  "コーチ",
  "カッパー",
  "テクニシャン",
  "メディア",
  "アカデミック",
  "ギーク"
]

const CATEGORY_OPTIONS_EN = [
  "Barista",
  "Brewer",
  "Roaster",
  "Buyer",
  "Coach",
  "Cupper",
  "Technician",
  "Media",
  "Academic",
  "Geek"
]

export default function CategorySelector({
  value = { main: null, subs: [] }, // 万が一渡されなかった場合のデフォルト値を設定
  onChange,
  label,
  description,
  lang = "ja" // ⭐️ デフォルトは日本語
}: CategorySelectorProps) {
  // 安全に分割代入を行う
  const { main = null, subs = [] } = value || {}

  // ⭐️ 言語に応じて選択肢を自動切り替え
  const options = lang === "en" ? CATEGORY_OPTIONS_EN : CATEGORY_OPTIONS_JA

  const handleSelect = (category: string) => {
    // 1. メインとして選択されている場合 -> メインを解除
    if (main === category) {
      onChange({
        main: null,
        subs: subs
      })
      return
    }

    // 2. サブとして選択されている場合
    if (subs.includes(category)) {
      // サブから解除する
      onChange({
        main,
        subs: subs.filter(c => c !== category)
      })
      return
    }

    // 3. 未選択の場合
    if (!main) {
      // メインが空なら、最初に選んだものをメインにする
      onChange({
        main: category,
        subs
      })
    } else {
      // すでにメインがあるなら、サブに追加する
      onChange({
        main,
        subs: [...subs, category]
      })
    }
  }

  // 「サブ」だけど「メイン」に変更したい、といった操作をシンプルに切り替え
  const setAsMain = (e: React.MouseEvent, category: string) => {
    e.stopPropagation() // ボタン全体のクリックイベントを防ぐ
    const newSubs = subs.filter(c => c !== category)
    if (main) {
      newSubs.push(main)
    }
    onChange({
      main: category,
      subs: newSubs
    })
  }

  return (
    <div className="space-y-2.5">
      <div>
        <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">
          {label}
        </label>
        {description && (
          <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5 whitespace-pre-line leading-relaxed">
            {description}
          </p>
        )}
      </div>
      
      <div className="flex flex-wrap gap-x-3 gap-y-4 items-start justify-start pt-1.5 select-none">
        {options.map((category) => {
          const isMain = main === category
          const isSub = subs.includes(category)

          return (
            <div
              key={category}
              onClick={() => handleSelect(category)}
              className={`text-[14px] md:text-[15px] px-5 py-2.5 rounded-full border tracking-wide transition-all duration-200 font-medium shadow-sm active:scale-[0.97] cursor-pointer flex items-center gap-2 ${
                isMain
                  ? "bg-neutral-900 border-neutral-900 text-white font-semibold"
                  : isSub
                  ? "bg-neutral-100 border-neutral-300 text-neutral-800 font-medium"
                  : "bg-white border-neutral-200 text-neutral-700 hover:border-neutral-400 hover:text-neutral-950"
              }`}
            >
              <span>{category}</span>
              
              {isMain && (
                <span className="text-[10px] bg-amber-500 text-white px-2 py-0.5 rounded-full font-bold">
                  {lang === "en" ? "MAIN" : "メイン"}
                </span>
              )}

              {isSub && (
                <button
                  type="button"
                  onClick={(e) => setAsMain(e, category)}
                  className="text-[10px] bg-neutral-300 hover:bg-neutral-400 text-neutral-800 px-2 py-0.5 rounded-full transition-all"
                  title={lang === "en" ? "Promote to main" : "メインに昇格"}
                >
                  {lang === "en" ? "SUB (Make Main)" : "サブ (メインにする)"}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
