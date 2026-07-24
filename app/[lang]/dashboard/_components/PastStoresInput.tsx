"use client"

import React from "react"

type Props = {
  stores: string[]
  onChange: (stores: string[]) => void
  label: string
  description?: string
  placeholder?: string
  addLabel: string
}

export default function PastStoresInput({
  stores,
  onChange,
  label,
  description,
  placeholder = "例: CAFE",
  addLabel
}: Props) {
  
  const handleAddStore = () => {
    onChange([...stores, ""])
  }

  const handleStoreChange = (index: number, value: string) => {
    const updated = [...stores]
    updated[index] = value
    onChange(updated)
  }

  const handleRemoveStore = (index: number) => {
    onChange(stores.filter((_, i) => i !== index))
  }

  const inputStyle = "w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 text-neutral-900 focus:outline-none focus:border-neutral-400 focus:bg-white placeholder:text-neutral-400 transition-all duration-200"

  return (
    <div className="space-y-3 w-full">
      <div>
        <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900">
          {label}
        </label>
        {description && (
          <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      {/* 既存店舗の入力フィールドリスト */}
      <div className="space-y-2">
        {stores.map((store, index) => (
          <div key={index} className="flex items-center gap-2">
            <input
              type="text"
              value={store}
              onChange={(e) => handleStoreChange(index, e.target.value)}
              placeholder={placeholder}
              className={inputStyle}
            />
            <button
              type="button"
              onClick={() => handleRemoveStore(index)}
              className="text-[13px] font-medium text-red-500 hover:text-red-700 px-2 py-1 transition-colors"
            >
              削除
            </button>
          </div>
        ))}
      </div>

      {/* 🌟 完全に同じスタイルにした「所属店舗を追加」ボタン */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleAddStore}
          className="w-full text-[14px] font-semibold border-2 border-dashed border-[#e5e5e5] rounded-[14px] py-4 bg-white text-[#161616] hover:bg-neutral-50 hover:border-[#b5b5b5] transition-all text-center"
        >
          {addLabel}
        </button>
      </div>
    </div>
  )
}