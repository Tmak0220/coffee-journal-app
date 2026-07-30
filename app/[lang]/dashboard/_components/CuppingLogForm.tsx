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
    defects: "欠点による減点",
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

  const rowStyle = "grid gap-3 border-b border-neutral-200/70 py-4 last:border-0 sm:grid-cols-[minmax(180px,0.75fr)_minmax(260px,1.25fr)] sm:items-center"
  const labelStyle = "font-semibold leading-5 text-neutral-700 text-sm"
  const sliderInputStyle = "h-1.5 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-200 accent-neutral-950 transition-all focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-100"
  const scoreBadgeStyle = "min-w-[72px] shrink-0 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-center font-mono text-sm font-bold text-neutral-900 shadow-sm transition-all"

  return (
    <div className="space-y-6 font-sans text-neutral-900">
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-5">
        <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900">{t.title}</h4>
        <p className="mt-2 text-xs leading-6 text-neutral-500">
          {isEn
            ? "Choose one protocol and evaluate every sample under the same conditions. Scores are reflected in the comparison visualization."
            : "評価方式を選び、同じ条件で各サンプルを評価してください。入力したスコアは比較グラフへ反映されます。"}
        </p>
      </div>

      {/* フォーム切り替えタブ */}
      <div className={`grid grid-cols-1 gap-2 rounded-2xl border border-neutral-200 bg-neutral-100/70 p-1.5 sm:grid-cols-2 ${diffClasses?.formType || ""}`}>
        <button
          type="button"
          onClick={() => onChange?.({ formType: "SCA" })}
          className={`min-h-14 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 ${
            formType === "SCA" 
              ? "border border-neutral-200 bg-white text-neutral-950 shadow-md" 
              : "border border-transparent text-neutral-500 hover:bg-white/70 hover:text-neutral-800"
          }`}
        >
          SCA Protocol (100 pts)
        </button>
        <button
          type="button"
          onClick={() => onChange?.({ formType: "COE" })}
          className={`min-h-14 rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-[0.1em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neutral-200 ${
            formType === "COE" 
              ? "border border-neutral-200 bg-white text-neutral-950 shadow-md" 
              : "border border-transparent text-neutral-500 hover:bg-white/70 hover:text-neutral-800"
          }`}
        >
          Cup of Excellence
        </button>
      </div>

      {/* -------------------- 1. SCA プロトコル表示 -------------------- */}
      {formType === "SCA" && (
        <div className="space-y-6">
          {/* スライダー評価エリア */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="border-b border-neutral-200 pb-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900">SCA Sensory Attributes</h4>
              <p className="mt-1.5 text-xs leading-5 text-neutral-500">
                {isEn ? "Score each sensory attribute from 6.00 to 10.00 in 0.25-point increments." : "各評価項目を6.00〜10.00の範囲で、0.25点刻みで評価します。"}
              </p>
            </div>
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
                  <div className="flex w-full items-center gap-3 sm:gap-4">
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
          </section>

          {/* 5カップチェックボックスエリア */}
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="border-b border-neutral-200 pb-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900">Horizontal Cup Attributes</h4>
              <p className="mt-1.5 text-xs leading-5 text-neutral-500">
                {isEn ? "Select every cup that meets the attribute. Each selected cup contributes 2 points." : "各項目を満たしたカップを選択します。1カップにつき2点として集計されます。"}
              </p>
            </div>
            {[
              { label: t.scaUniformity, cups: sca.uniformityCups, key: "scaUniformityCups" as const },
              { label: t.scaCleanCup, cups: sca.cleanCups, key: "scaCleanCups" as const },
              { label: t.scaSweetness, cups: sca.sweetnessCups, key: "scaSweetnessCups" as const },
            ].map((row) => (
              <div key={row.key} className="grid gap-3 border-b border-neutral-200/70 py-4 last:border-0 sm:grid-cols-[minmax(180px,0.75fr)_minmax(260px,1.25fr)] sm:items-center">
                <span className={labelStyle}>{row.label}</span>
                <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-start">
                  <div className={`flex gap-2 rounded-xl ${diffClasses?.[row.key] || ""}`}>
                    {row.cups.map((checked, idx) => (
                      <label key={idx} className="relative flex size-10 cursor-pointer select-none items-center justify-center rounded-xl border border-neutral-200 bg-white font-mono text-xs font-bold text-neutral-500 shadow-sm transition-all hover:-translate-y-0.5 hover:border-neutral-400 has-[:checked]:border-neutral-950 has-[:checked]:bg-neutral-950 has-[:checked]:text-white">
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
                  <span className={`${scoreBadgeStyle} sm:ml-3`}>{(row.cups.filter(Boolean).length * 2).toFixed(1)}</span>
                </div>
              </div>
            ))}
          </section>

          {/* 欠点・減点欄 */}
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900">{t.defects}</h4>
              <p className="mt-1.5 text-xs leading-5 text-neutral-500">
                {isEn ? "Record affected cups and defect intensity; the deduction is calculated automatically." : "欠点が確認されたカップ数と強度を入力すると、減点を自動計算します。"}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-4 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">{t.defectCups}</span>
                <input 
                  type="number" min="0" max="5" 
                  value={sca.defectCups} 
                  onChange={(e) => onChange?.({ scaDefectCups: Math.min(5, Math.max(0, Number(e.target.value))) })}
                  className={`min-h-11 w-20 rounded-xl border border-neutral-200 bg-white p-2 text-center font-mono font-bold shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100 ${diffClasses?.scaDefectCups || ""}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">{t.defectIntensity}</span>
                <select 
                  value={sca.defectIntensity} 
                  onChange={(e) => onChange?.({ scaDefectIntensity: Number(e.target.value) })}
                  className={`min-h-11 rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-xs font-semibold shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100 ${diffClasses?.scaDefectIntensity || ""}`}
                >
                  <option value={2}>2 (Taint)</option>
                  <option value={4}>4 (Fault)</option>
                </select>
              </div>
              <div className="ml-auto rounded-xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm font-bold text-neutral-950 shadow-sm">
                - {scaDefectDeduction.toFixed(2)} pts
              </div>
            </div>
          </section>

          {/* 総スコア表示 */}
          <div className="flex items-center justify-between rounded-2xl bg-neutral-950 p-5 text-white shadow-md sm:p-6">
            <div>
              <span className="text-[10px] text-neutral-400 font-mono font-bold block tracking-widest">TOTAL SCA SCORE</span>
            </div>
            <div className="font-mono text-2xl font-black sm:text-3xl">{scaTotalScore.toFixed(2)} <span className="text-xs font-normal text-neutral-400">pts</span></div>
          </div>
        </div>
      )}

      {/* -------------------- 2. COE プロトコル表示 -------------------- */}
      {formType === "COE" && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="border-b border-neutral-200 pb-4">
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900">COE Quality Components</h4>
              <p className="mt-1.5 text-xs leading-5 text-neutral-500">
                {isEn ? "Score each quality component from 0 to 8 points. The 36-point base score is added automatically." : "各品質項目を0〜8点で評価します。基礎点36点は自動的に加算されます。"}
              </p>
            </div>
            
            <div className="my-3 flex justify-between rounded-xl bg-neutral-50 px-4 py-3 font-mono text-xs text-neutral-400">
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
                  <div className="flex w-full items-center gap-3 sm:gap-4">
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
          </section>

          {/* COE 欠点欄 */}
          <section className="space-y-4 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900">{t.defects}</h4>
              <p className="mt-1.5 text-xs leading-5 text-neutral-500">
                {isEn ? "The deduction is calculated from affected cups and the selected factor." : "対象カップ数と減点係数から減点を自動計算します。"}
              </p>
            </div>
            <div className="flex flex-wrap items-end gap-4 text-[13px]">
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">{t.defectCups}</span>
                <input 
                  type="number" min="0" max="10" 
                  value={coe.defectCups} 
                  onChange={(e) => onChange?.({ coeDefectCups: Math.min(10, Math.max(0, Number(e.target.value))) })}
                  className={`min-h-11 w-20 rounded-xl border border-neutral-200 bg-white p-2 text-center font-mono font-bold shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100 ${diffClasses?.coeDefectCups || ""}`}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-500 font-medium text-xs">Deduction Factor</span>
                <select 
                  value={coe.defectIntensity} 
                  onChange={(e) => onChange?.({ coeDefectIntensity: Number(e.target.value) })}
                  className={`min-h-11 rounded-xl border border-neutral-200 bg-white px-3 py-2 font-mono text-xs font-semibold shadow-sm focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100 ${diffClasses?.coeDefectIntensity || ""}`}
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
                </select>
              </div>
              <div className="ml-auto rounded-xl border border-neutral-200 bg-white px-4 py-3 font-mono text-sm font-bold text-neutral-950 shadow-sm">
                - {coeDefectDeduction.toFixed(1)} pts
              </div>
            </div>
          </section>

          {/* 総スコア表示 */}
          <div className="flex items-center justify-between rounded-2xl bg-neutral-950 p-5 text-white shadow-md sm:p-6">
            <div>
              <span className="text-[10px] text-neutral-400 font-mono font-bold block tracking-widest">TOTAL COE SCORE</span>
            </div>
            <div className="font-mono text-2xl font-black sm:text-3xl">{coeTotalScore.toFixed(2)} <span className="text-xs font-normal text-neutral-400">pts</span></div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
        <label className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-900">
          {isEn ? "Cupping Notes" : "カッピングメモ"}
        </label>
        <p className="mt-1.5 text-xs leading-5 text-neutral-500">
          {isEn
            ? "Record descriptors, temperature changes, defects, and observations that are not represented by the score."
            : "スコアだけでは表せない風味記述、温度変化、欠点、気付いた点などを記録します。"}
        </p>
        <textarea
          value={module.notes || ""}
          onChange={(event) => onChange?.({ notes: event.target.value })}
          placeholder={isEn ? "e.g. Floral aroma became clearer as the cup cooled..." : "例：冷めるにつれてフローラルな香りが明確になった…"}
          className={`mt-4 min-h-32 w-full resize-y rounded-xl border border-neutral-200 bg-white p-4 text-sm leading-7 text-neutral-900 shadow-sm transition-all placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100 ${diffClasses?.notes || ""}`}
        />
      </section>
    </div>
  )
}
