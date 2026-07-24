"use client"

import React from "react"

type VisibilityType = "draft" | "private" | "members" | "public"
type TargetCategoryType = "experts" | "origins" | "both"

type Props = {
  dict: any
  normalizedTier: string | undefined
  visibility: VisibilityType
  setVisibility: (type: VisibilityType) => void
  targetCategory: TargetCategoryType
  setTargetCategory: (type: TargetCategoryType) => void
  submitting: boolean
  disabled?: boolean
  statusMessage: { type: "success" | "error"; text: string } | null
}

export default function FormPublishSettings({
  dict,
  normalizedTier,
  visibility,
  setVisibility,
  targetCategory,
  setTargetCategory,
  submitting,
  disabled = false,
  statusMessage
}: Props) {
  
  const getTabButtonStyle = (isSelected: boolean) => `
    whitespace-nowrap px-4 py-3 sm:py-3.5 text-[11px] sm:text-[13px] font-semibold rounded-xl border text-center transition-all duration-200 select-none flex-1 min-w-[145px] md:min-w-0
    ${isSelected 
      ? "bg-white border-neutral-900 text-neutral-900 shadow-sm ring-1 ring-neutral-900" 
      : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/50"}
  `

  return (
    <div className="pt-6 border-t border-neutral-100 space-y-6 sm:space-y-8">
      {statusMessage && (
        <div className={`text-xs sm:text-sm p-3.5 sm:p-4 rounded-xl border w-full sm:max-w-xl transition-all duration-300 ${
          statusMessage.type === "error" 
            ? "text-red-600 bg-red-50/40 border-red-200" 
            : "text-neutral-900 bg-neutral-50 border-neutral-200"
        }`}>
          {statusMessage.text}
        </div>
      )}

      {/* 公開設定 */}
      <div className="space-y-3 text-left">
        <label className="text-xs sm:text-[14px] font-bold text-neutral-900 tracking-wide block">
          {/* 💡 dict が undefined の場合のエラーを回避 */}
          {dict?.labelVisibility || "公開設定"}
        </label>
        <div className="w-full overflow-x-auto no-scrollbar scroll-smooth -mx-2 px-2 py-1">
          <div className="flex flex-nowrap md:grid md:grid-cols-4 gap-3 min-w-max md:min-w-0">
            {(["draft", "private", "members", "public"] as VisibilityType[]).map((type) => {
              const labelMap = {
                draft: dict?.statusDraft || "下書き",
                private: dict?.statusPrivate || "非公開",
                members: dict?.statusMembers || "限定公開",
                public: dict?.statusPublic || "全体公開",
              }
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setVisibility(type)}
                  className={getTabButtonStyle(visibility === type)}
                >
                  {labelMap[type]}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 投稿先カテゴリー（ビジネスプランのみ表示） */}
      {normalizedTier === "business" && (
        <div className="space-y-3 pt-2 text-left">
          <label className="text-xs sm:text-[14px] font-bold text-neutral-900 tracking-wide block">
            {dict?.labelPublishTarget || "投稿先カテゴリー"}
          </label>
          <div className="w-full overflow-x-auto no-scrollbar scroll-smooth -mx-2 px-2 py-1">
            <div className="flex flex-nowrap md:grid md:grid-cols-3 gap-3 min-w-max md:min-w-0">
              {(["experts", "origins", "both"] as TargetCategoryType[]).map((type) => {
                const labelMap = {
                  experts: dict?.targetExperts || "専門家",
                  origins: dict?.targetOrigins || "原産地",
                  both: dict?.targetBoth || "両方のカテゴリー",
                }
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setTargetCategory(type)}
                    className={getTabButtonStyle(targetCategory === type)}
                  >
                    {labelMap[type]}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end pt-2">
        <button 
          type="submit" 
          disabled={submitting || disabled}
          className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-900 text-white border border-transparent px-10 py-3.5 rounded-full text-sm font-medium tracking-wider transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50 min-w-[240px]"
        >
          {submitting 
            ? (dict?.submitting || "送信中...") 
            : (dict?.submitButton || "保存する")}
        </button>
      </div>
    </div>
  )
}
