"use client"

import React from "react"

// モジュールのデータ構造定義
export type CuppingModuleData = {
  id: string
  type: "cupping"
  formType?: "SCA" | "COE"
  sampleName?: string // 互換性のため維持
  // SCA
  scaAroma?: number
  scaFlavor?: number
  scaAftertaste?: number
  scaAcidity?: number
  scaBody?: number
  scaBalance?: number
  scaOverall?: number
  scaUniformityCups?: boolean[]
  scaCleanCups?: boolean[]
  scaSweetnessCups?: boolean[]
  scaDefectCups?: number
  scaDefectIntensity?: number
  // COE
  coeCleanCup?: number
  coeSweetness?: number
  coeAcidity?: number
  coeMouthfeel?: number
  coeFlavor?: number
  coeAftertaste?: number
  coeBalance?: number
  coeOverall?: number
  coeDefectCups?: number
  coeDefectIntensity?: number
  // 自由入力欄
  notes?: string
}

type Props = {
  module: CuppingModuleData
  // 🌟 エラー解消: 親側のマッピング（プレーンなキー名）を受け取れるように拡張
  diffClasses?: {
    formType?: string
    // 親コンポーネントが生成する共通キー名に対応
    aroma?: string
    flavor?: string
    aftertaste?: string
    acidity?: string
    body?: string
    balance?: string
    overall?: string
    notes?: string
    // フォーム固有キー名も保険として維持
    scaAroma?: string
    scaFlavor?: string
    scaAftertaste?: string
    scaAcidity?: string
    scaBody?: string
    scaBalance?: string
    scaOverall?: string
    scaUniformityCups?: string
    scaCleanCups?: string
    scaSweetnessCups?: string
    scaDefectCups?: string
    scaDefectIntensity?: string
    coeCleanCup?: string
    coeSweetness?: string
    coeAcidity?: string
    coeMouthfeel?: string
    coeFlavor?: string
    coeAftertaste?: string
    coeBalance?: string
    coeOverall?: string
    coeDefectCups?: string
    coeDefectIntensity?: string
  }
  onChange: (updatedFields: Partial<CuppingModuleData>) => void
  lang?: "ja" | "en"
}

const dict = {
  ja: {
    title: "SCA / COE カッピングプロトコル",
    defects: "Defects (欠点減点)",
    defectCups: "対象カップ数",
    defectIntensity: "強度",
    totalScore: "総合スコア",
    scaAroma: "Fragrance / Aroma (アロマ)",
    scaFlavor: "Flavor (フレーバー)",
    scaAftertaste: "Aftertaste (余韻)",
    scaAcidity: "Acidity (酸味)",
    scaBody: "Body (質感)",
    scaBalance: "Balance (バランス)",
    scaUniformity: "Uniformity (均一性 - 5カップ)",
    scaCleanCup: "Clean Cup (クリーンさ - 5カップ)",
    scaSweetness: "Sweetness (甘さ - 5カップ)",
    scaOverall: "Overall (総合評価)",
    coeCleanCup: "Clean Cup (クリーンさ)",
    coeSweetness: "Sweetness (甘さ)",
    coeAcidity: "Acidity (酸味の質)",
    coeMouthfeel: "Mouthfeel (口当たり/ボディ)",
    coeFlavor: "Flavor / フレーバー・風味",
    coeAftertaste: "Aftertaste (後味の印象)",
    coeBalance: "Balance (調和/バランス)",
    coeOverall: "Overall (総合評価)"
  },
  en: {
    title: "SCA / COE Cupping Protocol",
    defects: "Defect Deduction",
    defectCups: "# of Cups",
    defectIntensity: "Intensity",
    totalScore: "Total Score",
    scaAroma: "Fragrance / Aroma",
    scaFlavor: "Flavor",
    scaAftertaste: "Aftertaste",
    scaAcidity: "Acidity",
    scaBody: "Body",
    scaBalance: "Balance",
    scaUniformity: "Uniformity (5 Cups)",
    scaCleanCup: "Clean Cup (5 Cups)",
    scaSweetness: "Sweetness (5 Cups)",
    scaOverall: "Overall",
    coeCleanCup: "Clean Cup",
    coeSweetness: "Sweetness",
    coeAcidity: "Acidity",
    coeMouthfeel: "Mouthfeel",
    coeFlavor: "Flavor",
    coeAftertaste: "Aftertaste",
    coeBalance: "Balance",
    coeOverall: "Overall"
  }
}

export default function CuppingLogForm({ module, diffClasses, onChange, lang = "ja" }: Props) {
  const isEn = lang === "en"
  const t = dict[isEn ? "en" : "ja"]

  const formType = module?.formType || "SCA"

  // SCA パラメータ
  const sca = {
    aroma: module?.scaAroma ?? 7.5,
    flavor: module?.scaFlavor ?? 7.5,
    aftertaste: module?.scaAftertaste ?? 7.5,
    acidity: module?.scaAcidity ?? 7.5,
    body: module?.scaBody ?? 7.5,
    balance: module?.scaBalance ?? 7.5,
    overall: module?.scaOverall ?? 7.5,
    uniformityCups: module?.scaUniformityCups ?? [true, true, true, true, true],
    cleanCups: module?.scaCleanCups ?? [true, true, true, true, true],
    sweetnessCups: module?.scaSweetnessCups ?? [true, true, true, true, true],
    defectCups: module?.scaDefectCups ?? 0,
    defectIntensity: module?.scaDefectIntensity ?? 2
  }

  // COE パラメータ
  const coe = {
    cleanCup: module?.coeCleanCup ?? 6.0,
    sweetness: module?.coeSweetness ?? 6.0,
    acidity: module?.coeAcidity ?? 6.0,
    mouthfeel: module?.coeMouthfeel ?? 6.0,
    flavor: module?.coeFlavor ?? 6.0,
    aftertaste: module?.coeAftertaste ?? 6.0,
    balance: module?.coeBalance ?? 6.0,
    overall: module?.coeOverall ?? 6.0,
    defectCups: module?.coeDefectCups ?? 0,
    defectIntensity: module?.coeDefectIntensity ?? 1
  }

  // 計算ロジック
  const scaUniformityScore = sca.uniformityCups.filter(Boolean).length * 2
  const scaCleanCupScore = sca.cleanCups.filter(Boolean).length * 2
  const scaSweetnessScore = sca.sweetnessCups.filter(Boolean).length * 2
  const scaDefectDeduction = sca.defectCups * sca.defectIntensity
  const scaTotalScore = 
    sca.aroma + sca.flavor + sca.aftertaste + sca.acidity + sca.body + sca.balance + sca.overall +
    scaUniformityScore + scaCleanCupScore + scaSweetnessScore - scaDefectDeduction

  // COE公式フォーム: 欠点カップ数 × 強度（1〜3）× 4点
  const coeDefectDeduction = coe.defectCups * coe.defectIntensity * 4
  const coeTotalScore = 
    36 + coe.cleanCup + coe.sweetness + coe.acidity + coe.mouthfeel +
    coe.flavor + coe.aftertaste + coe.balance + coe.overall - coeDefectDeduction

  // デザイン用スタイル（より洗練された研究室・プロ仕様UIへ）
  const sectionTitleStyle = "text-[11px] text-neutral-400 font-bold uppercase tracking-widest border-b border-neutral-100 pb-2.5 mb-4"
  const rowStyle = "flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] py-2.5 border-b border-neutral-100/50 last:border-0"
  const labelStyle = "w-56 font-semibold text-neutral-700 tracking-wide text-xs"
  const sliderInputStyle = "flex-1 accent-neutral-950 h-1 bg-neutral-200 rounded-lg appearance-none cursor-pointer transition-all"
  const scoreBadgeStyle = "w-14 font-mono text-center font-bold text-neutral-900 bg-neutral-50 border border-neutral-200 px-2 py-1 rounded-xl text-xs shrink-0 shadow-sm transition-all"

  return (
    <div className="space-y-6 text-neutral-900 font-sans">
      {/* フォーム切り替えタブ */}
      <div className={`flex border border-neutral-200 rounded-xl overflow-hidden p-0.5 bg-neutral-50 ${diffClasses?.formType || ""}`}>
        <button
          type="button"
          onClick={() => onChange?.({ formType: "SCA" })}
          className={`flex-1 py-2 text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all duration-200 ${
            formType === "SCA" 
              ? "bg-white text-neutral-950 shadow-sm border border-neutral-200/40" 
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          SCA Protocol (100 pts)
        </button>
        <button
          type="button"
          onClick={() => onChange?.({ formType: "COE" })}
          className={`flex-1 py-2 text-[11px] font-bold tracking-wider uppercase rounded-lg transition-all duration-200 ${
            formType === "COE" 
              ? "bg-white text-neutral-950 shadow-sm border border-neutral-200/40" 
              : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          Cup of Excellence
        </button>
      </div>

      {/* -------------------- 1. SCA プロトコル表示 -------------------- */}
      {formType === "SCA" && (
        <div className="space-y-6">
          {/* スライダー評価エリア */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 shadow-sm">
            <h4 className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest border-b border-neutral-100 pb-2.5 mb-2">SCA Sensory Attributes</h4>
            {[
              { label: t.scaAroma, val: sca.aroma, key: "scaAroma" as const, diffKey: "aroma" as const },
              { label: t.scaFlavor, val: sca.flavor, key: "scaFlavor" as const, diffKey: "flavor" as const },
              { label: t.scaAftertaste, val: sca.aftertaste, key: "scaAftertaste" as const, diffKey: "aftertaste" as const },
              { label: t.scaAcidity, val: sca.acidity, key: "scaAcidity" as const, diffKey: "acidity" as const },
              { label: t.scaBody, val: sca.body, key: "scaBody" as const, diffKey: "body" as const },
              { label: t.scaBalance, val: sca.balance, key: "scaBalance" as const, diffKey: "balance" as const },
              { label: t.scaOverall, val: sca.overall, key: "scaOverall" as const, diffKey: "overall" as const },
            ].map((item) => {
              const hasDiff = diffClasses?.[item.diffKey] || diffClasses?.[item.key]
              return (
                <div key={item.key} className={rowStyle}>
                  <span className={labelStyle}>{item.label}</span>
                  <div className="flex items-center gap-4 flex-1 w-full">
                    <input 
                      type="range" min="6" max="10" step="0.25" 
                      value={item.val} 
                      onChange={(e) => onChange?.({ [item.key]: Number(e.target.value) })} 
                      className={`${sliderInputStyle} ${hasDiff || ""}`} 
                    />
                    <span className={`${scoreBadgeStyle} ${hasDiff ? "border-amber-200 text-amber-800 bg-amber-50/60" : ""}`}>
                      {item.val.toFixed(2)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 5カップチェックボックスエリア */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 shadow-sm">
            <h4 className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest border-b border-neutral-100 pb-2.5 mb-2">Horizontal Cup Attributes (2pts x 5)</h4>
            {[
              { label: t.scaUniformity, cups: sca.uniformityCups, key: "scaUniformityCups" as const },
              { label: t.scaCleanCup, cups: sca.cleanCups, key: "scaCleanCups" as const },
              { label: t.scaSweetness, cups: sca.sweetnessCups, key: "scaSweetnessCups" as const },
            ].map((row) => (
              <div key={row.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[13px] py-2.5 border-b border-neutral-100/50 last:border-0">
                <span className={labelStyle}>{row.label}</span>
                <div className="flex items-center gap-2 flex-1 justify-between sm:justify-start">
                  <div className={`flex gap-1.5 p-0.5 rounded-xl ${diffClasses?.[row.key] || ""}`}>
                    {row.cups.map((checked, idx) => (
                      <label key={idx} className="relative flex items-center justify-center w-8 h-8 rounded-xl border border-neutral-200 bg-white cursor-pointer select-none has-[:checked]:bg-neutral-950 has-[:checked]:border-neutral-950 text-neutral-400 has-[:checked]:text-white font-mono text-xs font-bold transition-all hover:border-neutral-400">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const nextCups = [...row.cups]
                            nextCups[idx] = e.target.checked
                            onChange?.({ [row.key]: nextCups })
                          }}
                          className="sr-only"
                        />
                        {idx + 1}
                      </label>
                    ))}
                  </div>
                  <span className={`${scoreBadgeStyle} ml-auto sm:ml-4`}>{(row.cups.filter(Boolean).length * 2).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </div>

          {/* 欠点・減点欄 */}
          <div className="bg-neutral-50/50 border border-neutral-200 rounded-xl p-4 sm:p-5 space-y-3">
            <h4 className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest">{t.defects}</h4>
            <div className="flex flex-wrap gap-4 items-center text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">{t.defectCups}</span>
                <input 
                  type="number" min="0" max="5" 
                  value={sca.defectCups} 
                  onChange={(e) => onChange?.({ scaDefectCups: Math.min(5, Math.max(0, Number(e.target.value))) })}
                  className={`w-14 border border-neutral-200 rounded-xl p-1.5 text-center font-mono font-bold bg-white focus:outline-none focus:border-neutral-400 ${diffClasses?.scaDefectCups || ""}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">{t.defectIntensity}</span>
                <select 
                  value={sca.defectIntensity} 
                  onChange={(e) => onChange?.({ scaDefectIntensity: Number(e.target.value) })}
                  className={`border border-neutral-200 rounded-xl p-1.5 bg-white font-mono font-semibold text-xs focus:outline-none focus:border-neutral-400 ${diffClasses?.scaDefectIntensity || ""}`}
                >
                  <option value={2}>2 (Taint)</option>
                  <option value={4}>4 (Fault)</option>
                </select>
              </div>
              <div className="ml-auto font-mono text-neutral-950 font-bold text-sm">
                - {scaDefectDeduction.toFixed(2)} pts
              </div>
            </div>
          </div>

          {/* 総スコア表示 */}
          <div className="flex items-center justify-between bg-neutral-950 text-white p-4 rounded-xl shadow-sm">
            <div>
              <span className="text-[10px] text-neutral-400 font-mono font-bold block tracking-widest">TOTAL SCA SCORE</span>
            </div>
            <div className="text-xl font-mono font-black">{scaTotalScore.toFixed(2)} <span className="text-xs font-normal text-neutral-400">pts</span></div>
          </div>
        </div>
      )}

      {/* -------------------- 2. COE プロトコル表示 -------------------- */}
      {formType === "COE" && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-neutral-200 p-4 sm:p-5 shadow-sm">
            <h4 className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest border-b border-neutral-100 pb-2.5 mb-2">COE Quality Components (0 to 8 pts)</h4>
            
            <div className="flex justify-between text-xs font-mono text-neutral-400 px-1 border-b border-neutral-100 pb-2 mb-2">
              <span className="font-sans font-medium text-neutral-500">{isEn ? "Base Score" : "基礎点 / Base Score"}</span>
              <span className="font-bold text-neutral-900">+ 36.00</span>
            </div>

            {[
              { label: t.coeCleanCup, val: coe.cleanCup, key: "coeCleanCup" as const, diffKey: "aroma" as const }, // 各マッピングキーとの互換
              { label: t.coeSweetness, val: coe.sweetness, key: "coeSweetness" as const, diffKey: "flavor" as const },
              { label: t.coeAcidity, val: coe.acidity, key: "coeAcidity" as const, diffKey: "acidity" as const },
              { label: t.coeMouthfeel, val: coe.mouthfeel, key: "coeMouthfeel" as const, diffKey: "body" as const },
              { label: t.coeFlavor, val: coe.flavor, key: "coeFlavor" as const, diffKey: "aftertaste" as const },
              { label: t.coeAftertaste, val: coe.aftertaste, key: "coeAftertaste" as const, diffKey: "balance" as const },
              { label: t.coeBalance, val: coe.balance, key: "coeBalance" as const, diffKey: "overall" as const },
              { label: t.coeOverall, val: coe.overall, key: "coeOverall" as const, diffKey: "overall" as const },
            ].map((item) => {
              const hasDiff = diffClasses?.[item.diffKey] || diffClasses?.[item.key]
              return (
                <div key={item.key} className={rowStyle}>
                  <span className={labelStyle}>{item.label}</span>
                  <div className="flex items-center gap-4 flex-1 w-full">
                    <input 
                      type="range" min="0" max="8" step="0.5" 
                      value={item.val} 
                      onChange={(e) => onChange?.({ [item.key]: Number(e.target.value) })} 
                      className={`${sliderInputStyle} ${hasDiff || ""}`} 
                    />
                    <span className={`${scoreBadgeStyle} ${hasDiff ? "border-amber-200 text-amber-800 bg-amber-50/60" : ""}`}>
                      {item.val.toFixed(1)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* COE 欠点欄 */}
          <div className="bg-neutral-50/50 border border-neutral-200 rounded-xl p-4 sm:p-5 space-y-3">
            <h4 className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest">{t.defects}</h4>
            <div className="flex flex-wrap gap-4 items-center text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">{t.defectCups}</span>
                <input 
                  type="number" min="0" max="10" 
                  value={coe.defectCups} 
                  onChange={(e) => onChange?.({ coeDefectCups: Math.min(10, Math.max(0, Number(e.target.value))) })}
                  className={`w-14 border border-neutral-200 rounded-xl p-1.5 text-center font-mono font-bold bg-white focus:outline-none focus:border-neutral-400 ${diffClasses?.coeDefectCups || ""}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">Deduction Factor</span>
                <select 
                  value={coe.defectIntensity} 
                  onChange={(e) => onChange?.({ coeDefectIntensity: Number(e.target.value) })}
                  className={`border border-neutral-200 rounded-xl p-1.5 bg-white font-mono font-semibold text-xs focus:outline-none focus:border-neutral-400 ${diffClasses?.coeDefectIntensity || ""}`}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div className="ml-auto font-mono text-neutral-950 font-bold text-sm">
                - {coeDefectDeduction.toFixed(1)} pts
              </div>
            </div>
          </div>

          {/* 総スコア表示 */}
          <div className="flex items-center justify-between bg-neutral-950 text-white p-4 rounded-xl shadow-sm">
            <div>
              <span className="text-[10px] text-neutral-400 font-mono font-bold block tracking-widest">TOTAL COE SCORE</span>
            </div>
            <div className="text-xl font-mono font-black">{coeTotalScore.toFixed(2)} <span className="text-xs font-normal text-neutral-400">pts</span></div>
          </div>
        </div>
      )}
    </div>
  )
}
