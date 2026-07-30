"use client"

import React from "react"
import UnitNumberInput from "@/components/ui/UnitNumberInput"

// モジュールのデータ構造定義（追加項目を拡張）
export type RoastModuleData = {
  id: string
  type: "roast"
  roasterMachine?: string
  batchSize?: string       // 追加: 投入量
  chargeTemp?: string
  turningPointTime?: string
  turningPointTemp?: string
  yellowingTime?: string
  ror?: string
  drumSpeed?: string
  firstCrack?: string
  firstCrackTemp?: string
  secondCrackTime?: string
  dropTemp?: string        // 追加: 煎り止め温度
  totalTime?: string       // 追加: 総焙煎時間
  developmentTime?: string
  dtr?: string             // 追加: DTR (Development Time Ratio)
  greenWeight?: string
  roastedWeight?: string
  weightLoss?: string
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
    turningPointTime?: string
    turningPointTemp?: string
    yellowingTime?: string
    ror?: string
    drumSpeed?: string
    firstCrack?: string
    firstCrackTemp?: string
    secondCrackTime?: string
    dropTemp?: string
    totalTime?: string
    developmentTime?: string
    dtr?: string
    greenWeight?: string
    roastedWeight?: string
    weightLoss?: string
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
    placeholderBatchSize: "例: 450",
    labelChargeTemp: "投入温度（Charge Temperature）",
    labelTurningPointTime: "ボトム到達時間（Turning Point）",
    labelTurningPointTemp: "ボトム温度",
    labelYellowingTime: "黄変到達時間（Yellowing）",
    labelRor: "平均昇温率（RoR）",
    labelDrumSpeed: "ドラム回転数",
    placeholderDrumSpeed: "例: 55",
    labelFirstCrack: "1ハゼ開始時間",
    labelFirstCrackTemp: "1ハゼ開始温度",
    labelSecondCrackTime: "2ハゼ開始時間",
    labelDropTemp: "煎り止め温度（Drop Temperature）",
    labelTotalTime: "総焙煎時間",
    labelDtr: "デベロップメント比率（DTR）",
    placeholderDtr: "例: 15.5%",
    labelRoastDegree: "焙煎度 / カラー値（豆・粉）",
    labelGreenWeight: "焙煎前重量",
    labelRoastedWeight: "焙煎後重量",
    labelWeightLoss: "焙煎減量率",
    labelDevelopmentTime: "デベロップメントタイム（1ハゼ後）",
    placeholderRoastDegree: "例：Mid-Light / 豆 62・粉 65",
    labelNotes: "火力・風量（ダンパー）調整ログ",
    placeholderNotes: "例：0:00 火力80%・ダンパー20%、黄変後に火力を60%へ変更、1ハゼ開始時にダンパーを70%へ。変更時刻と設定値、その時のRoRや豆の反応を記録してください。"
  },
  en: {
    labelMachine: "Roaster Machine Used",
    placeholderMachine: "e.g. Aillio Bullet R1 V2",
    labelBatchSize: "Batch Size",
    placeholderBatchSize: "e.g. 450",
    labelChargeTemp: "Charge Temperature",
    labelTurningPointTime: "Turning Point Time",
    labelTurningPointTemp: "Turning Point Temperature",
    labelYellowingTime: "Yellowing Time",
    labelRor: "Avg RoR",
    labelDrumSpeed: "Drum Speed",
    placeholderDrumSpeed: "e.g. 55",
    labelFirstCrack: "1st Crack",
    labelFirstCrackTemp: "1st Crack Temperature",
    labelSecondCrackTime: "2nd Crack Time",
    labelDropTemp: "Drop Temperature",
    labelTotalTime: "Total Time",
    labelDtr: "DTR (%)",
    placeholderDtr: "e.g. 15.5%",
    labelRoastDegree: "Roast Degree / Color (Whole / Ground)",
    labelGreenWeight: "Green Weight",
    labelRoastedWeight: "Roasted Weight",
    labelWeightLoss: "Weight Loss",
    labelDevelopmentTime: "Development Time",
    placeholderRoastDegree: "e.g. Mid-Light / whole 62 / ground 65",
    labelNotes: "Heat & Airflow Adjustment Log",
    placeholderNotes: "e.g. 0:00 gas 80% / airflow 20%; reduce gas to 60% after yellowing; increase airflow to 70% at first crack. Record each change, its time, RoR, and the bean response."
  }
}

export default function RoastingProfileForm({ module, diffClasses, onChange, lang = "ja" }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = roastProfileDict[currentLang]

  // 安全なデフォルト値マッピング
  const roasterMachine = module?.roasterMachine || ""
  const batchSize = module?.batchSize || ""
  const chargeTemp = module?.chargeTemp || ""
  const turningPointTime = module?.turningPointTime || ""
  const turningPointTemp = module?.turningPointTemp || ""
  const yellowingTime = module?.yellowingTime || ""
  const ror = module?.ror || ""
  const drumSpeed = module?.drumSpeed || ""
  const firstCrack = module?.firstCrack || ""
  const firstCrackTemp = module?.firstCrackTemp || ""
  const secondCrackTime = module?.secondCrackTime || ""
  const dropTemp = module?.dropTemp || ""
  const totalTime = module?.totalTime || ""
  const developmentTime = module?.developmentTime || ""
  const dtr = module?.dtr || ""
  const roastDegree = module?.roastDegree || ""
  const greenWeight = module?.greenWeight || ""
  const roastedWeight = module?.roastedWeight || ""
  const weightLoss = module?.weightLoss || ""
  const notes = module?.notes || ""

  const inputBaseStyle = "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100"
  const subLabelStyle = "mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600"
  const alignedProfileLabelStyle = "flex min-h-[3.25rem] items-end pb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-neutral-600 sm:text-[11px]"

  const parseTime = (value: string) => {
    const parts = value.trim().split(":")
    if (parts.length !== 2) return null
    const minutes = Number(parts[0])
    const seconds = Number(parts[1])
    if (!Number.isFinite(minutes) || !Number.isFinite(seconds) || minutes < 0 || seconds < 0 || seconds >= 60) return null
    return minutes * 60 + seconds
  }

  const formatTime = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`
  const sanitizeTime = (value: string) => value
    .replace(/[０-９]/g, (character) => String(character.charCodeAt(0) - 0xfee0))
    .replace(/：/g, ":")
    .replace(/[^\d:]/g, "")
    .replace(/(:.*):/g, "$1")

  const handlePhaseTimeChange = (field: "firstCrack" | "totalTime", value: string) => {
    const nextFirstCrack = field === "firstCrack" ? value : firstCrack
    const nextTotalTime = field === "totalTime" ? value : totalTime
    const firstCrackSeconds = parseTime(nextFirstCrack)
    const totalSeconds = parseTime(nextTotalTime)
    const update: Partial<RoastModuleData> = { [field]: value }

    if (firstCrackSeconds != null && totalSeconds != null && totalSeconds > 0 && totalSeconds >= firstCrackSeconds) {
      const developmentSeconds = totalSeconds - firstCrackSeconds
      update.developmentTime = formatTime(developmentSeconds)
      update.dtr = `${Math.round((developmentSeconds / totalSeconds) * 1000) / 10}%`
    } else {
      update.developmentTime = ""
      update.dtr = ""
    }
    onChange(update)
  }

  const handleWeightChange = (field: "greenWeight" | "roastedWeight", value: string) => {
    const nextGreen = field === "greenWeight" ? value : greenWeight
    const nextRoasted = field === "roastedWeight" ? value : roastedWeight
    const green = Number(nextGreen)
    const roasted = Number(nextRoasted)
    const update: Partial<RoastModuleData> = { [field]: value }
    update.weightLoss = green > 0 && roasted >= 0 && roasted <= green
      ? `${Math.round(((green - roasted) / green) * 1000) / 10}%`
      : ""
    onChange(update)
  }

  return (
    <div className="space-y-5 font-sans text-neutral-900">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          <UnitNumberInput
            min="0"
            step="any"
            placeholder={t.placeholderBatchSize}
            value={batchSize}
            unit="g"
            onValueChange={(value) => onChange?.({ batchSize: value })}
            className={diffClasses?.batchSize || ""}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between border-b border-neutral-200 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-700">
            {currentLang === "en" ? "Roast profile" : "焙煎プロファイル"}
          </p>
          <span className="text-[10px] font-medium text-neutral-400">
            {currentLang === "en" ? "Time & temperature" : "時間・温度"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelChargeTemp}</label>
            <UnitNumberInput
              min="0"
              step="0.1"
              placeholder="200"
              value={chargeTemp}
              unit="°C"
              onValueChange={(value) => onChange?.({ chargeTemp: value })}
              className={diffClasses?.chargeTemp || ""}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelTurningPointTime}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="1:20"
              value={turningPointTime}
              onChange={(e) => onChange?.({ turningPointTime: sanitizeTime(e.target.value) })}
              className={`${inputBaseStyle} ${diffClasses?.turningPointTime || ""}`}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelTurningPointTemp}</label>
            <UnitNumberInput
              min="0"
              step="0.1"
              placeholder="85"
              value={turningPointTemp}
              unit="°C"
              onValueChange={(value) => onChange?.({ turningPointTemp: value })}
              className={diffClasses?.turningPointTemp || ""}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelYellowingTime}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="4:30"
              value={yellowingTime}
              onChange={(e) => onChange?.({ yellowingTime: sanitizeTime(e.target.value) })}
              className={`${inputBaseStyle} ${diffClasses?.yellowingTime || ""}`}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelFirstCrack}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="8:45"
              value={firstCrack}
              onChange={(e) => handlePhaseTimeChange("firstCrack", sanitizeTime(e.target.value))}
              className={`${inputBaseStyle} ${diffClasses?.firstCrack || ""}`}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelFirstCrackTemp}</label>
            <UnitNumberInput
              min="0"
              step="0.1"
              placeholder="196"
              value={firstCrackTemp}
              unit="°C"
              onValueChange={(value) => onChange?.({ firstCrackTemp: value })}
              className={diffClasses?.firstCrackTemp || ""}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelSecondCrackTime}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="11:45"
              value={secondCrackTime}
              onChange={(e) => onChange?.({ secondCrackTime: sanitizeTime(e.target.value) })}
              className={`${inputBaseStyle} ${diffClasses?.secondCrackTime || ""}`}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelDropTemp}</label>
            <UnitNumberInput
              min="0"
              step="0.1"
              placeholder="215"
              value={dropTemp}
              unit="°C"
              onValueChange={(value) => onChange?.({ dropTemp: value })}
              className={diffClasses?.dropTemp || ""}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelTotalTime}</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="10:30"
              value={totalTime}
              onChange={(e) => handlePhaseTimeChange("totalTime", sanitizeTime(e.target.value))}
              className={`${inputBaseStyle} ${diffClasses?.totalTime || ""}`}
            />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-neutral-200 pt-5 sm:grid-cols-2">
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelRor}</label>
            <UnitNumberInput
              step="0.1"
              placeholder="12"
              value={ror}
              unit="°C/min"
              onValueChange={(value) => onChange?.({ ror: value })}
              className={diffClasses?.ror || ""}
            />
          </div>
          <div>
            <label className={alignedProfileLabelStyle}>{t.labelDrumSpeed}</label>
            <UnitNumberInput
              min="0"
              step="any"
              placeholder={t.placeholderDrumSpeed}
              value={drumSpeed}
              unit="rpm"
              onValueChange={(value) => onChange?.({ drumSpeed: value })}
              className={diffClasses?.drumSpeed || ""}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <MetricCard label={t.labelDevelopmentTime} value={developmentTime || "—"} diffClass={diffClasses?.developmentTime} />
          <MetricCard label={t.labelDtr} value={dtr || "—"} diffClass={diffClasses?.dtr} />
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="mb-4 border-b border-neutral-200 pb-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-700">
            {currentLang === "en" ? "Roast outcome" : "焙煎結果"}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">
            {currentLang === "en"
              ? "Record color and mass loss separately to compare roasts at a similar endpoint."
              : "近い仕上がり同士を比較できるよう、カラー値と減量率を分けて記録します。"}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={subLabelStyle}>{t.labelGreenWeight}</label>
            <UnitNumberInput
              min="0"
              step="any"
              placeholder="450"
              value={greenWeight}
              unit="g"
              onValueChange={(value) => handleWeightChange("greenWeight", value)}
              className={diffClasses?.greenWeight || ""}
            />
          </div>
          <div>
            <label className={subLabelStyle}>{t.labelRoastedWeight}</label>
            <UnitNumberInput
              min="0"
              step="any"
              placeholder="390"
              value={roastedWeight}
              unit="g"
              onValueChange={(value) => handleWeightChange("roastedWeight", value)}
              className={diffClasses?.roastedWeight || ""}
            />
          </div>
          <MetricCard label={t.labelWeightLoss} value={weightLoss || "—"} diffClass={diffClasses?.weightLoss} />
        </div>
        <div className="mt-4">
          <label className={subLabelStyle}>{t.labelRoastDegree}</label>
          <input
            type="text"
            placeholder={t.placeholderRoastDegree}
            value={roastDegree}
            onChange={(e) => onChange?.({ roastDegree: e.target.value })}
            className={`${inputBaseStyle} ${diffClasses?.roastDegree || ""}`}
          />
        </div>
      </section>

      <div>
        <label className={subLabelStyle}>{t.labelNotes}</label>
        <textarea
          rows={4}
          placeholder={t.placeholderNotes}
          value={notes}
          onChange={(e) => onChange?.({ notes: e.target.value })}
          className={`min-h-[132px] w-full resize-y rounded-xl border border-neutral-300 bg-white p-4 text-sm leading-relaxed text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100 ${diffClasses?.notes || ""}`}
        />
      </div>
    </div>
  )
}

function MetricCard({ label, value, diffClass = "" }: { label: string; value: string; diffClass?: string }) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-neutral-50/80 px-4 py-3 ${diffClass}`}>
      <span className="text-[10px] font-bold uppercase tracking-[0.13em] text-neutral-500">{label}</span>
      <p className="mt-1.5 text-lg font-semibold text-neutral-900">{value}</p>
    </div>
  )
}
