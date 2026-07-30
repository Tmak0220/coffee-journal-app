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

  const variableGroups = lang === "en"
    ? [
        {
          label: "BREWING",
          values: [
            "Pour Rate", "Brew Temperature", "Grind Size", "Agitation Count",
            "Brew Ratio", "Bloom Time", "Total Brew Time", "Measured TDS",
            "Extraction Yield (EY)", "Pour / Process Steps", "Gears",
          ],
        },
        {
          label: "WATER",
          values: [
            "Total Hardness (GH)", "Alkalinity (KH)", "Water TDS", "pH",
            "Calcium (Ca²⁺)", "Magnesium (Mg²⁺)", "Sodium Bicarbonate (NaHCO₃)",
            "Mineral Composition",
          ],
        },
        {
          label: "ROASTING",
          values: [
            "Roaster Machine", "Batch Size", "Charge Temperature",
            "Turning Point Time", "Turning Point Temperature", "Yellowing Time",
            "1st Crack Time", "1st Crack Temperature", "2nd Crack Time",
            "Drop Temperature", "Total Roast Time", "Average RoR", "Drum Speed",
            "Development Time", "Development Ratio (DTR)", "Roast Degree / Color",
            "Green Weight", "Roasted Weight", "Weight Loss",
            "Heat & Airflow Adjustment",
          ],
        },
        {
          label: "CUPPING",
          values: ["Cupping Standard", "Cupping Attributes", "Cupping Score"],
        },
      ]
    : [
        {
          label: "抽出",
          values: [
            "注湯速度", "抽出温度", "挽き目（粒度）", "攪拌回数（抽出）",
            "粉水比", "蒸らし時間", "総抽出時間", "測定TDS",
            "抽出収率（EY）", "注湯・工程", "使用器具",
          ],
        },
        {
          label: "水質",
          values: [
            "総硬度（GH）", "アルカリ度（KH）", "水のTDS", "pH",
            "カルシウム（Ca²⁺）", "マグネシウム（Mg²⁺）",
            "炭酸水素ナトリウム（NaHCO₃）", "ミネラル配合",
          ],
        },
        {
          label: "焙煎",
          values: [
            "使用焙煎機", "投入量", "投入温度", "ボトム到達時間",
            "ボトム温度", "黄変到達時間", "1ハゼ開始時間", "1ハゼ開始温度",
            "2ハゼ開始時間", "煎り止め温度", "総焙煎時間", "平均昇温率（RoR）",
            "ドラム回転数", "デベロップメントタイム（1ハゼ後）",
            "デベロップメント比率（DTR）", "焙煎度・カラー値",
            "焙煎前重量", "焙煎後重量", "焙煎減量率", "火力・風量調整",
          ],
        },
        {
          label: "カッピング",
          values: ["評価基準（SCA・COE）", "カッピング評価項目", "カッピングスコア"],
        },
      ]

  const knownVariables = new Set(variableGroups.flatMap(group => group.values))
  const additionalVariables = Array.from(new Set([
    ...presetVariables,
    ...(data.selectedVariables || []),
  ])).filter(variable => !knownVariables.has(variable))
  const displayedGroups = additionalVariables.length > 0
    ? [...variableGroups, { label: lang === "en" ? "OTHER" : "その他", values: additionalVariables }]
    : variableGroups

  const textareaStyle = "w-full min-h-36 resize-y rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-7 text-neutral-900 shadow-sm transition-all placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100 sm:p-5"

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
    <section className="space-y-7 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
      <div className="border-b border-neutral-200 pb-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-900">
          {t.sectionVerification}
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">
          {t.subSectionVerification}
        </p>
      </div>

      {/* 検証変数の選択 */}
      <div className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-6">
        <div>
          <h3 className="text-sm font-bold text-neutral-900">{t.labelVariableTags}</h3>
          <p className="mt-1 text-xs leading-5 text-neutral-500">
            {lang === "en"
              ? "Select every variable compared in this verification."
              : "今回の検証で比較した項目をすべて選択してください。"}
          </p>
        </div>
        <div className="space-y-5">
          {displayedGroups.map(group => (
            <div key={group.label}>
              <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                {group.label}
              </p>
              <div className="flex flex-wrap gap-2.5">
                {group.values.map((variable) => {
                  const isSelected = (data?.selectedVariables || []).includes(variable)
                  return (
                    <button
                      key={variable}
                      type="button"
                      onClick={() => onToggleVariableTag(variable)}
                      aria-pressed={isSelected}
                      className={`flex min-h-12 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 sm:px-5 ${
                        isSelected
                          ? "border-neutral-950 bg-neutral-950 text-white shadow-md"
                          : "border-neutral-200 bg-white text-neutral-700 shadow-sm hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`size-2 rounded-full ${isSelected ? "bg-emerald-400" : "bg-neutral-200"}`}
                      />
                      {variable}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
        
        <div className="flex max-w-xl flex-col gap-2 border-t border-neutral-200 pt-4 sm:flex-row sm:items-center">
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
            className="min-h-12 flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition-all placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100"
          />
          <button
            type="button"
            onClick={onAddCustomVariableTag}
            className="min-h-12 shrink-0 rounded-xl border border-neutral-900 bg-neutral-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-neutral-700 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200"
          >
            {lang === "en" ? "Add" : "追加"}
          </button>
        </div>
      </div>

      {/* 考察入力フォームエリア */}
      <div className="grid gap-4">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 font-mono text-xs font-bold text-white">01</span>
            <div>
              <label className="block text-sm font-bold text-neutral-900">{t.labelLogPurpose.replace(/^1\.\s*/, "")}</label>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {lang === "en" ? "Define the question and expected outcome before comparing patterns." : "比較する前に、検証したい問いと予想した結果を整理します。"}
              </p>
            </div>
          </div>
          <textarea
            value={data?.logPurpose || ""}
            onChange={(e) => handleTextChange("logPurpose", e.target.value)}
            placeholder={t.placeholderLogPurpose}
            className={textareaStyle}
          />
          {renderCharCounter(data?.logPurpose)}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 font-mono text-xs font-bold text-white">02</span>
            <div>
              <label className="block text-sm font-bold text-neutral-900">{t.labelLogProcess.replace(/^2\.\s*/, "")}</label>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {lang === "en" ? "Record what changed between patterns and what remained constant." : "各パターンで変更した条件と、共通にした条件を記録します。"}
              </p>
            </div>
          </div>
          <textarea
            value={data?.logProcess || ""}
            onChange={(e) => handleTextChange("logProcess", e.target.value)}
            placeholder={t.placeholderLogProcess}
            className={textareaStyle}
          />
          {renderCharCounter(data?.logProcess)}
        </div>

        <div className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 font-mono text-xs font-bold text-white">03</span>
            <div>
              <label className="block text-sm font-bold text-neutral-900">{t.labelLogConclusion.replace(/^3\.\s*/, "")}</label>
              <p className="mt-1 text-xs leading-5 text-neutral-500">
                {lang === "en" ? "Connect sensory observations and measurements to the next verification." : "官能評価と測定値を結び付け、次の検証につながる結論をまとめます。"}
              </p>
            </div>
          </div>
          <textarea
            value={data?.logConclusion || ""}
            onChange={(e) => handleTextChange("logConclusion", e.target.value)}
            placeholder={t.placeholderLogConclusion}
            className={textareaStyle}
          />
          {renderCharCounter(data?.logConclusion)}
        </div>
      </div>
    </section>
  )
}
