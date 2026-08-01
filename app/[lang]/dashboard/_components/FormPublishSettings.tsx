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
  secondaryAction?: React.ReactNode
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
  statusMessage,
  secondaryAction,
}: Props) {
  
  const getTabButtonStyle = (isSelected: boolean) => `
    flex min-h-[52px] flex-1 items-center justify-center whitespace-normal px-3 py-3 text-center text-[11px] font-semibold leading-5 sm:py-3.5 sm:text-[13px] rounded-xl border transition-all duration-200 select-none min-w-[145px] md:min-w-0
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

      <div className="flex flex-col justify-end gap-3 pt-2 sm:flex-row sm:items-center">
        <button 
          type="submit" 
          disabled={submitting || disabled}
          className="min-w-[240px] w-full rounded-xl border border-transparent bg-neutral-950 px-10 py-3.5 text-sm font-medium tracking-wider text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-900 hover:shadow-md active:scale-[0.98] disabled:opacity-50 sm:w-auto"
        >
          {submitting 
            ? (dict?.submitting || "送信中...") 
            : (dict?.submitButton || "保存する")}
        </button>
        {secondaryAction}
      </div>
    </div>
  )
}
