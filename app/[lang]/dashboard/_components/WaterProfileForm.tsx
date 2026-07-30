"use client"

import React, { useEffect, useState } from "react"
import { WaterModuleData } from "./PublishProRecipeForm"

type Props = {
  module: WaterModuleData
  diffClasses?: {
    name?: string
    gh?: string
    kh?: string
    waterTds?: string
    ph?: string
    minerals?: string
  }
  onChange: (updatedFields: Partial<WaterModuleData>) => void
  placeholderWaterName?: string
  lang?: "ja" | "en"
}

export default function WaterProfileForm({
  module,
  diffClasses,
  onChange,
  placeholderWaterName,
  lang = "ja"
}: Props) {
  const t = lang === "en" ? {
    water: "Water / Base Water",
    minerals: "Minerals / Formulation Notes",
    waterPlaceholder: "e.g. RO water with added minerals",
    mineralPlaceholder: "e.g. Ca 15 / Mg 5 mg/L",
    ghPlaceholder: "e.g. 50",
    khPlaceholder: "e.g. 20",
    tdsPlaceholder: "e.g. 120",
    phPlaceholder: "e.g. 7.0",
    simulator: "Enable custom water calculator",
    calculating: "Total hardness (GH) / Alkalinity (KH) linked",
    bicarbonate: "NaHCO₃ added / mg/L",
    calciumPlaceholder: "e.g. 15",
    magnesiumPlaceholder: "e.g. 5",
    bicarbonatePlaceholder: "e.g. 25",
    measuredValues: "Measured values",
    measuredHelp: "TDS and pH are measured values and are not calculated from GH or alkalinity.",
    conversionTitle: "CaCO₃ conversion",
    hardnessFormula: "GH = Ca × 2.497 + Mg × 4.118",
    alkalinityFormula: "KH = NaHCO₃ × 50 ÷ 84.0066 (≈ × 0.5952)",
    formulationHelp: "Enter calcium, magnesium, and sodium bicarbonate concentrations to estimate hardness and alkalinity as CaCO₃.",
    estimatedSodium: "Estimated sodium",
    reference: "Reference",
    referenceText: "Legacy SCA ranges: GH 50–175, alkalinity 40–70, TDS 75–250 ppm, pH 6.5–7.5. These values are provided as a general guide."
  } : {
    water: "Water / 銘柄・ベース水",
    minerals: "Minerals / ミネラル・調合メモ",
    waterPlaceholder: "水の銘柄・ベース水（例：RO水＋ミネラル添加）",
    mineralPlaceholder: "例：Ca 15 / Mg 5 mg/L",
    ghPlaceholder: "例：50",
    khPlaceholder: "例：20",
    tdsPlaceholder: "例：120",
    phPlaceholder: "例：7.0",
    simulator: "カスタムウォーター計算を有効化",
    calculating: "総硬度（GH）・アルカリ度（KH）を連動",
    bicarbonate: "NaHCO₃ 添加量 / mg/L",
    calciumPlaceholder: "例：15",
    magnesiumPlaceholder: "例：5",
    bicarbonatePlaceholder: "例：25",
    measuredValues: "実測値",
    measuredHelp: "TDSとpHは測定器による実測値です。GH・アルカリ度からの自動換算は行いません。",
    conversionTitle: "CaCO₃換算式",
    hardnessFormula: "総硬度（GH）= Ca × 2.497 ＋ Mg × 4.118",
    alkalinityFormula: "アルカリ度（KH）= NaHCO₃ × 50 ÷ 84.0066（約 × 0.5952）",
    formulationHelp: "カルシウム、マグネシウム、炭酸水素ナトリウムの濃度から、CaCO₃換算の硬度とアルカリ度を推定します。",
    estimatedSodium: "推定ナトリウム",
    reference: "参考範囲",
    referenceText: "従来のSCA参考範囲：GH 50–175、アルカリ度40–70、TDS 75–250 ppm、pH 6.5–7.5。これらの数値は目安です。"
  }

  const name = module.name || ""
  const gh = module.gh || ""
  const kh = module.kh || ""
  const waterTds = module.waterTds || ""
  const ph = module.ph || ""
  const minerals = module.minerals || ""

  const [calcCa, setCalcCa] = useState(module.calcCa || "")
  const [calcMg, setCalcMg] = useState(module.calcMg || "")
  const [calcNaBi, setCalcNaBi] = useState(module.calcNaBi || "")
  const [isAutoCalc, setIsAutoCalc] = useState(module.isAutoCalc ?? false)

  useEffect(() => {
    if (!isAutoCalc) return

    const caNum = Math.max(0, parseFloat(calcCa) || 0)
    const mgNum = Math.max(0, parseFloat(calcMg) || 0)
    const sodiumBicarbonateDose = Math.max(0, parseFloat(calcNaBi) || 0)
    const calculatedGH = Math.round((caNum * 2.497 + mgNum * 4.118) * 10) / 10
    // NaHCO₃ dose (mg/L) × equivalent weight ratio (50 / 84.0066).
    const calculatedAlkalinity = Math.round((sodiumBicarbonateDose * (50 / 84.0066)) * 10) / 10

    onChange({
      gh: calculatedGH > 0 ? calculatedGH.toString() : "0",
      kh: calculatedAlkalinity > 0 ? calculatedAlkalinity.toString() : "0",
      minerals: caNum || mgNum ? `Ca ${caNum} / Mg ${mgNum} mg/L` : minerals,
      calcCa,
      calcMg,
      calcNaBi,
      isAutoCalc
    })
  }, [calcCa, calcMg, calcNaBi, isAutoCalc])

  const handleNonNegativeChange = (value: string, field: "gh" | "kh" | "waterTds") => {
    const parsed = Number(value)
    onChange({ [field]: value !== "" && parsed < 0 ? "0" : value })
  }

  const handlePhChange = (value: string) => {
    if (value === "") {
      onChange({ ph: "" })
      return
    }
    const parsed = Number(value)
    onChange({ ph: Math.min(14, Math.max(0, parsed)).toString() })
  }

  const estimatedSodium = Math.round(
    (Math.max(0, parseFloat(calcNaBi) || 0) * (22.9898 / 84.0066)) * 10
  ) / 10
  const labelStyle = "block text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-600"
  const alignedLabelStyle = "mb-2 block whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-600 sm:text-[11px]"
  const inputStyle = "w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 shadow-sm transition placeholder:text-neutral-400 focus:border-neutral-500 focus:outline-none focus:ring-4 focus:ring-neutral-100"

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={`${labelStyle} mb-2`}>{t.water}</label>
          <input
            type="text"
            placeholder={placeholderWaterName || t.waterPlaceholder}
            value={name}
            onChange={(event) => onChange({ name: event.target.value })}
            className={`${inputStyle} ${diffClasses?.name || ""}`}
          />
        </div>
        <div>
          <label className={`${labelStyle} mb-2`}>{t.minerals}</label>
          <input
            type="text"
            placeholder={t.mineralPlaceholder}
            value={minerals}
            disabled={isAutoCalc}
            onChange={(event) => onChange({ minerals: event.target.value })}
            className={`${inputStyle} ${isAutoCalc ? "cursor-not-allowed bg-neutral-100 text-neutral-500" : ""} ${diffClasses?.minerals || ""}`}
          />
        </div>
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-neutral-50/70 p-4 sm:p-5">
        <div className="mb-4 border-b border-neutral-200 pb-3">
          <h5 className="text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-700">{t.measuredValues}</h5>
          <p className="mt-1.5 text-xs leading-relaxed text-neutral-500">{t.measuredHelp}</p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className={alignedLabelStyle}>{lang === "en" ? "Total hardness (GH) / ppm" : "総硬度（GH）/ ppm"}</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder={t.ghPlaceholder}
              value={gh}
              disabled={isAutoCalc}
              onChange={(event) => handleNonNegativeChange(event.target.value, "gh")}
              className={`${inputStyle} ${isAutoCalc ? "cursor-not-allowed bg-neutral-100 text-neutral-500" : ""} ${diffClasses?.gh || ""}`}
            />
          </div>
          <div>
            <label className={alignedLabelStyle}>{lang === "en" ? "Alkalinity (KH) / ppm" : "アルカリ度（KH）/ ppm"}</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder={t.khPlaceholder}
              value={kh}
              disabled={isAutoCalc}
              onChange={(event) => handleNonNegativeChange(event.target.value, "kh")}
              className={`${inputStyle} ${isAutoCalc ? "cursor-not-allowed bg-neutral-100 text-neutral-500" : ""} ${diffClasses?.kh || ""}`}
            />
          </div>
          <div>
            <label className={alignedLabelStyle}>{lang === "en" ? "Water TDS / ppm" : "水のTDS / ppm"}</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder={t.tdsPlaceholder}
              value={waterTds}
              onChange={(event) => handleNonNegativeChange(event.target.value, "waterTds")}
              className={`${inputStyle} ${diffClasses?.waterTds || ""}`}
            />
          </div>
          <div>
            <label className={alignedLabelStyle}>pH</label>
            <input
              type="number"
              min="0"
              max="14"
              step="0.1"
              placeholder={t.phPlaceholder}
              value={ph}
              onChange={(event) => handlePhChange(event.target.value)}
              className={`${inputStyle} ${diffClasses?.ph || ""}`}
            />
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{t.conversionTitle}</span>
          <div className="mt-2 space-y-1.5 overflow-x-auto pb-1 font-mono text-[10px] leading-relaxed text-neutral-600 sm:text-[11px]">
            <code className="block whitespace-nowrap">{t.hardnessFormula}</code>
            <code className="block whitespace-nowrap">{t.alkalinityFormula}</code>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
            {lang === "en"
              ? "Ca, Mg, and NaHCO₃ are entered in mg/L; GH and KH are shown as mg/L (ppm) CaCO₃."
              : "Ca・Mg・NaHCO₃はmg/Lで入力し、GH・KHはCaCO₃換算のmg/L（ppm）で表示します。"}
          </p>
        </div>
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">{t.reference}</span>
          <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{t.referenceText}</p>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-neutral-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <input
              type="checkbox"
              id={`auto-calc-${module.id}`}
              checked={isAutoCalc}
              onChange={(event) => {
                setIsAutoCalc(event.target.checked)
                if (!event.target.checked) onChange({ isAutoCalc: false })
              }}
              className="mt-0.5 h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <div>
              <label htmlFor={`auto-calc-${module.id}`} className="cursor-pointer text-xs font-bold text-neutral-800">{t.simulator}</label>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{t.formulationHelp}</p>
            </div>
          </div>
          {isAutoCalc && (
            <span className="w-fit rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-semibold text-neutral-600">
              {t.calculating}
            </span>
          )}
        </div>

        {isAutoCalc && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={`${labelStyle} mb-2`}>CALCIUM (Ca²⁺) mg/L</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={t.calciumPlaceholder}
                value={calcCa}
                onChange={(event) => setCalcCa(event.target.value === "" ? "" : Math.max(0, parseFloat(event.target.value) || 0).toString())}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={`${labelStyle} mb-2`}>MAGNESIUM (Mg²⁺) mg/L</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={t.magnesiumPlaceholder}
                value={calcMg}
                onChange={(event) => setCalcMg(event.target.value === "" ? "" : Math.max(0, parseFloat(event.target.value) || 0).toString())}
                className={inputStyle}
              />
            </div>
            <div>
              <label className={`${labelStyle} mb-2`}>{t.bicarbonate}</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={t.bicarbonatePlaceholder}
                value={calcNaBi}
                onChange={(event) => setCalcNaBi(event.target.value === "" ? "" : Math.max(0, parseFloat(event.target.value) || 0).toString())}
                className={inputStyle}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-4 sm:col-span-3 sm:grid-cols-3">
              <ResultValue label={lang === "en" ? "Total hardness (GH)" : "総硬度（GH）"} value={gh || "0"} unit="ppm" />
              <ResultValue label={lang === "en" ? "Alkalinity (KH)" : "アルカリ度（KH）"} value={kh || "0"} unit="ppm" />
              <ResultValue label={t.estimatedSodium} value={estimatedSodium.toString()} unit="mg/L" />
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

function ResultValue({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-500">{label}</span>
      <p className="mt-1 text-lg font-semibold text-neutral-900">
        {value} <small className="text-xs font-normal text-neutral-400">{unit}</small>
      </p>
    </div>
  )
}
