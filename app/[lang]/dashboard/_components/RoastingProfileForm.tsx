"use client"

import React from "react"

// モジュールのデータ構造定義（追加項目を拡張）
export type RoastModuleData = {
  id: string
  type: "roast"
  roasterMachine?: string
  batchSize?: string       // 追加: 投入量
  chargeTemp?: string
  ror?: string
  drumSpeed?: string
  firstCrack?: string
  dropTemp?: string        // 追加: 煎り止め温度
  totalTime?: string       // 追加: 総焙煎時間
  dtr?: string             // 追加: DTR (Development Time Ratio)
  roastDegree?: string     // 追加: 焙煎度 / カラー値
  notes?: string
}

type Props = {
  module: RoastModuleData
  // 🌟 エラー解消：親コンポーネントからの差分ハイライト用スタイルクラスの型を追加
  diffClasses?: {
    roasterMachine?: string
    batchSize?: string
    chargeTemp?: string
    ror?: string
    drumSpeed?: string
    firstCrack?: string
    dropTemp?: string
    totalTime?: string
    dtr?: string
    roastDegree?: string
    notes?: string
  }
  onChange: (updatedFields: Partial<RoastModuleData>) => void
  lang?: string
}

const roastProfileDict = {
  ja: {
    labelMachine: "使用焙煎機 (Roaster Machine)",
    placeholderMachine: "例: Aillio Bullet R1 V2",
    labelBatchSize: "投入量 (Batch Size)",
    placeholderBatchSize: "例: 450g / 1.0kg",
    labelChargeTemp: "投入温度 (Charge °C)",
    labelRor: "平均 RoR",
    labelDrumSpeed: "回転数（焙煎）",
    placeholderDrumSpeed: "例: 55 rpm",
    labelFirstCrack: "1ハゼ (1st Crack)",
    labelDropTemp: "煎り止め温度 (Drop °C)",
    labelTotalTime: "総時間 (Total Time)",
    labelDtr: "DTR (Development Ratio)",
    placeholderDtr: "例: 15.5%",
    labelRoastDegree: "焙煎度 / カラー値 (Agtron)",
    placeholderRoastDegree: "例: Mid-Light / 62",
    labelNotes: "ダンパー・火力調整の推移メモ",
    placeholderNotes: "イエローまで一気に熱を入れ、ドライエンドから火力を絞ってデベロップメントタイムを1分30秒に調整..."
  },
  en: {
    labelMachine: "Roaster Machine Used",
    placeholderMachine: "e.g. Aillio Bullet R1 V2",
    labelBatchSize: "Batch Size",
    placeholderBatchSize: "e.g. 450g / 1.0kg",
    labelChargeTemp: "Charge Temperature °C",
    labelRor: "Avg RoR",
    labelDrumSpeed: "Drum Speed",
    placeholderDrumSpeed: "e.g. 55 rpm",
    labelFirstCrack: "1st Crack",
    labelDropTemp: "Drop Temperature °C",
    labelTotalTime: "Total Time",
    labelDtr: "DTR (%)",
    placeholderDtr: "e.g. 15.5%",
    labelRoastDegree: "Roast Degree / Agtron",
    placeholderRoastDegree: "e.g. Mid-Light / 62",
    labelNotes: "Airflow & Heat Adjustment Notes",
    placeholderNotes: "Apply high heat until yellowing, then cut back gas at the dry end to manage a 1m 30s development time..."
  }
}

export default function RoastingProfileForm({ module, diffClasses, onChange, lang = "ja" }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = roastProfileDict[currentLang]

  // 安全なデフォルト値マッピング
  const roasterMachine = module?.roasterMachine || ""
  const batchSize = module?.batchSize || ""
  const chargeTemp = module?.chargeTemp || ""
  const ror = module?.ror || ""
  const drumSpeed = module?.drumSpeed || ""
  const firstCrack = module?.firstCrack || ""
  const dropTemp = module?.dropTemp || ""
  const totalTime = module?.totalTime || ""
  const dtr = module?.dtr || ""
  const roastDegree = module?.roastDegree || ""
  const notes = module?.notes || ""

  // 共通スタイル定義（よりソリッドでラボラトリーライクなUIへ）
  const inputBaseStyle = "w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 bg-white text-neutral-900 text-sm focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400/60 transition-all shadow-sm"
  const subLabelStyle = "text-[11px] font-bold tracking-widest text-neutral-400 uppercase block mb-1.5"

  return (
    <div className="space-y-6 text-neutral-900 font-sans">
      {/* 基本設定: 焙煎機 & 投入量 */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2">
          <label className={subLabelStyle}>{t.labelMachine}</label>
          <input 
            type="text" 
            placeholder={t.placeholderMachine} 
            value={roasterMachine} 
            onChange={(e) => onChange?.({ roasterMachine: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.roasterMachine || ""}`} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.labelBatchSize}</label>
          <input 
            type="text" 
            placeholder={t.placeholderBatchSize} 
            value={batchSize} 
            onChange={(e) => onChange?.({ batchSize: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.batchSize || ""}`} 
          />
        </div>
      </div>

      {/* プロファイル時系列データ (2段構成) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-50/50 border border-neutral-100 rounded-xl p-4">
        {/* 上段 */}
        <div>
          <label className={subLabelStyle}>{t.labelChargeTemp}</label>
          <input 
            type="text" 
            placeholder="200°C" 
            value={chargeTemp} 
            onChange={(e) => onChange?.({ chargeTemp: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.chargeTemp || ""}`} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.labelFirstCrack}</label>
          <input 
            type="text" 
            placeholder="8:45" 
            value={firstCrack} 
            onChange={(e) => onChange?.({ firstCrack: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.firstCrack || ""}`} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.labelRor}</label>
          <input 
            type="text" 
            placeholder="12°C/min" 
            value={ror} 
            onChange={(e) => onChange?.({ ror: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.ror || ""}`} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.labelDrumSpeed}</label>
          <input
            type="text"
            placeholder={t.placeholderDrumSpeed}
            value={drumSpeed}
            onChange={(e) => onChange?.({ drumSpeed: e.target.value })}
            className={`${inputBaseStyle} ${diffClasses?.drumSpeed || ""}`}
          />
        </div>

        {/* 下段: 終了時のデータ */}
        <div>
          <label className={subLabelStyle}>{t.labelDropTemp}</label>
          <input 
            type="text" 
            placeholder="215°C" 
            value={dropTemp} 
            onChange={(e) => onChange?.({ dropTemp: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.dropTemp || ""}`} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.labelTotalTime}</label>
          <input 
            type="text" 
            placeholder="10:30" 
            value={totalTime} 
            onChange={(e) => onChange?.({ totalTime: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.totalTime || ""}`} 
          />
        </div>
        <div>
          <label className={subLabelStyle}>{t.labelDtr}</label>
          <input 
            type="text" 
            placeholder={t.placeholderDtr} 
            value={dtr} 
            onChange={(e) => onChange?.({ dtr: e.target.value })} 
            className={`${inputBaseStyle} ${diffClasses?.dtr || ""}`} 
          />
        </div>
      </div>

      {/* 仕上げ・焙煎度 */}
      <div>
        <label className={subLabelStyle}>{t.labelRoastDegree}</label>
        <input 
          type="text" 
          placeholder={t.placeholderRoastDegree} 
          value={roastDegree} 
          onChange={(e) => onChange?.({ roastDegree: e.target.value })} 
          className={`${inputBaseStyle} ${diffClasses?.roastDegree || ""}`} 
        />
      </div>

      {/* メモエリア */}
      <div>
        <label className={subLabelStyle}>{t.labelNotes}</label>
        <textarea 
          rows={3} 
          placeholder={t.placeholderNotes} 
          value={notes} 
          onChange={(e) => onChange?.({ notes: e.target.value })} 
          className={`w-full border border-neutral-200 rounded-xl p-4 bg-white text-neutral-900 text-sm focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400/60 transition-all shadow-sm resize-y min-h-[95px] leading-relaxed ${diffClasses?.notes || ""}`} 
        />
      </div>
    </div>
  )
}
