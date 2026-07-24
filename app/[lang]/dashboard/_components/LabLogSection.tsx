"use client"

import React from "react"

type LabLogSectionProps = {
  data: {
    selectedVariables?: string[]
    logPurpose?: string
    logProcess?: string
    logConclusion?: string
  }
  onChangeField: (field: string, value: any) => void
  onToggleVariableTag: (variable: string) => void
  onAddCustomVariableTag: () => void
  customVariableInput: string
  setCustomVariableInput: (value: string) => void
  presetVariables: string[]
  t: any
  currentUserEmail?: string
  lang?: "ja" | "en"
}

export default function LabLogSection({
  data,
  onChangeField,
  onToggleVariableTag,
  onAddCustomVariableTag,
  customVariableInput,
  setCustomVariableInput,
  presetVariables = [],
  t,
  currentUserEmail = "",
  lang = "ja"
}: LabLogSectionProps) {
  
  const ADMIN_EMAIL = "rivu65622252@example.com"
  const isAdmin = currentUserEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase()
  const MAX_CHARS = 500

  const coffeeVariables = lang === "en" ? [
    "Pour Rate", "Brew Temperature", "Grind Size", "Agitation Count", "Brew Ratio", "Bloom Time", "Total Brew Time", "Gears",
    "GH", "KH", "Mineral Composition",
    "Roast Degree", "Roast Profile", "Drum Speed", "DTR", "RoR",
    "Cupping Score"
  ] : [
    "注湯速度", "抽出温度", "挽き目（粒度）", "攪拌回数（抽出）", "粉水比", "蒸らし時間", "総抽出時間", "器具",
    "総硬度（GH）", "炭酸塩硬度（KH）", "ミネラル配合",
    "焙煎度", "焙煎プロファイル", "回転数（焙煎）", "DTR（発達時間比率）", "RoR（変化率）",
    "カッピングスコア"
  ]

  const extendedVariables = Array.from(new Set([...presetVariables, ...coffeeVariables]))

  const subLabelStyle = "text-[13px] font-bold tracking-wide text-neutral-900 block mb-1.5"
  const textareaStyle = "w-full text-sm border border-neutral-200 rounded-xl p-4 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400/70 transition-colors shadow-sm resize-y min-h-[100px] leading-relaxed"

  const handleTextChange = (field: "logPurpose" | "logProcess" | "logConclusion", value: string) => {
    if (!isAdmin && value.length > MAX_CHARS) {
      onChangeField(field, value.slice(0, MAX_CHARS))
    } else {
      onChangeField(field, value)
    }
  }

  const renderCharCounter = (text: string = "") => {
    if (isAdmin) return null
    const isCloseToLimit = text.length >= MAX_CHARS - 20
    return (
      <div className={`text-[11px] mt-1 text-right font-mono ${isCloseToLimit ? "text-red-500 font-bold" : "text-neutral-400"}`}>
        {text.length} / {MAX_CHARS} {lang === "en" ? "characters" : "文字"}
      </div>
    )
  }

  return (
    <div className="border border-neutral-200 rounded-xl p-6 sm:p-8 bg-white shadow-[0_4px_24px_rgba(0,0,0,0.01)] space-y-6">
      <div className="border-b border-neutral-100 pb-4">
        <h2 className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase">
          {t.sectionVerification}
        </h2>
        <p className="text-[13px] font-normal tracking-wide text-neutral-500 mt-1">
          {t.subSectionVerification}
        </p>
      </div>

      {/* 検証変数の選択 */}
      <div className="space-y-3">
        <label className={subLabelStyle}>{t.labelVariableTags}</label>
        <div className="flex flex-wrap gap-2">
          {extendedVariables.map((variable) => {
            const isSelected = (data?.selectedVariables || []).includes(variable)
            return (
              <button
                key={variable}
                type="button"
                onClick={() => onToggleVariableTag(variable)}
                className={`text-[13px] px-3.5 py-1.5 rounded-xl font-medium transition-all border ${
                  isSelected
                    ? "bg-neutral-950 text-white border-transparent shadow-sm"
                    : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
                }`}
              >
                {variable}
              </button>
            )
          })}
        </div>
        
        <div className="flex items-center gap-2 max-w-md pt-1">
          <input
            type="text"
            placeholder={t.placeholderVariableTags}
            value={customVariableInput}
            onChange={(e) => setCustomVariableInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                onAddCustomVariableTag()
              }
            }}
            className="flex-1 border border-neutral-200 rounded-xl px-3.5 py-2.5 bg-white text-neutral-900 text-[13px] focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400/70 transition-colors"
          />
          <button
            type="button"
            onClick={onAddCustomVariableTag}
            className="bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 text-[13px] font-semibold px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            {lang === "en" ? "Add" : "追加"}
          </button>
        </div>
      </div>

      <hr className="border-neutral-100 my-2" />

      {/* 考察入力フォームエリア */}
      <div className="space-y-6">
        <div>
          <label className={subLabelStyle}>{t.labelLogPurpose}</label>
          <textarea
            value={data?.logPurpose || ""}
            onChange={(e) => handleTextChange("logPurpose", e.target.value)}
            placeholder={t.placeholderLogPurpose}
            className={textareaStyle}
          />
          {renderCharCounter(data?.logPurpose)}
        </div>

        <div>
          <label className={subLabelStyle}>{t.labelLogProcess}</label>
          <textarea
            value={data?.logProcess || ""}
            onChange={(e) => handleTextChange("logProcess", e.target.value)}
            placeholder={t.placeholderLogProcess}
            className={textareaStyle}
          />
          {renderCharCounter(data?.logProcess)}
        </div>

        <div>
          <label className={subLabelStyle}>{t.labelLogConclusion}</label>
          <textarea
            value={data?.logConclusion || ""}
            onChange={(e) => handleTextChange("logConclusion", e.target.value)}
            placeholder={t.placeholderLogConclusion}
            className={textareaStyle}
          />
          {renderCharCounter(data?.logConclusion)}
        </div>
      </div>
    </div>
  )
}
