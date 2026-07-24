"use client"

import React, { useEffect, useState } from "react"
import { WaterModuleData } from "./PublishProRecipeForm"

type ExtendedWaterData = WaterModuleData & {
  calcCa?: string
  calcMg?: string
  calcNaBi?: string
  isAutoCalc?: boolean
}

type Props = {
  module: ExtendedWaterData
  diffClasses?: {
    name?: string
    gh?: string
    kh?: string
    minerals?: string
  }
  onChange: (updatedFields: Partial<ExtendedWaterData>) => void
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
    minerals: "Mineral Ratio",
    waterPlaceholder: "e.g. RO water with added minerals",
    ghPlaceholder: "e.g. 50",
    khPlaceholder: "e.g. 20",
    mineralPlaceholder: "e.g. Mg:Ca = 2:1",
    simulator: "Enable Custom Water Simulator",
    calculating: "GH / KH Auto Calculation Active",
    bicarbonate: "NaHCO₃ / Bicarbonate mg/L",
    calciumPlaceholder: "e.g. 15",
    magnesiumPlaceholder: "e.g. 5",
    bicarbonatePlaceholder: "e.g. 25",
  } : {
    water: "Water / 銘柄・ベース水",
    minerals: "Minerals / 成分比率",
    waterPlaceholder: "水の銘柄・ベース水（例: RO水 + ミネラル添加）",
    ghPlaceholder: "例: 50",
    khPlaceholder: "例: 20",
    mineralPlaceholder: "例: Mg:Ca = 2:1",
    simulator: "カスタムウォーター調合シミュレーターを有効化",
    calculating: "GH / KH 自動計算連動中",
    bicarbonate: "NaHCO₃（重曹等）mg/L",
    calciumPlaceholder: "例: 15",
    magnesiumPlaceholder: "例: 5",
    bicarbonatePlaceholder: "例: 25",
  }
  const name = module.name || ""
  const gh = module.gh || ""
  const kh = module.kh || ""
  const minerals = module.minerals || ""

  const [calcCa, setCalcCa] = useState(module.calcCa || "")
  const [calcMg, setCalcMg] = useState(module.calcMg || "")
  const [calcNaBi, setCalcNaBi] = useState(module.calcNaBi || "")
  const [isAutoCalc, setIsAutoCalc] = useState(module.isAutoCalc ?? false)

  useEffect(() => {
    if (!isAutoCalc) return

    const caNum = Math.max(0, parseFloat(calcCa) || 0)
    const mgNum = Math.max(0, parseFloat(calcMg) || 0)
    const nabiNum = Math.max(0, parseFloat(calcNaBi) || 0)

    const calculatedGH = Math.round((caNum * 2.497 + mgNum * 4.118) * 10) / 10
    const calculatedKH = Math.round((nabiNum * (61.01 / 84.01) * 0.82) * 10) / 10

    onChange({
      gh: calculatedGH > 0 ? calculatedGH.toString() : "0",
      kh: calculatedKH > 0 ? calculatedKH.toString() : "0",
      minerals: caNum || mgNum ? `Ca:Mg = ${caNum}:${mgNum}` : minerals,
      calcCa: caNum > 0 ? calcCa : "",
      calcMg: mgNum > 0 ? calcMg : "",
      calcNaBi: nabiNum > 0 ? calcNaBi : "",
      isAutoCalc
    })
  }, [calcCa, calcMg, calcNaBi, isAutoCalc])

  const handleNumberChange = (value: string, field: "gh" | "kh") => {
    const num = parseFloat(value)
    if (num < 0) {
      onChange({ [field]: "0" })
    } else {
      onChange({ [field]: value })
    }
  }

  // スタイル定義
  const labelStyle = "text-[11px] font-bold tracking-wider text-neutral-400 font-mono uppercase block leading-tight"
  const baseInputStyle = "w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 bg-white text-neutral-900 text-sm focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400/50 transition-all shadow-sm"
  const calcInputStyle = "w-full border border-neutral-200 rounded-lg px-2.5 py-1.5 bg-neutral-50 text-neutral-900 text-xs focus:outline-none focus:border-neutral-400 placeholder:text-neutral-400/40 transition-all font-mono"

  return (
    <div className="space-y-5">
      {/* 🌟 改善: ラベルとインプットのコンテナを分離 */}
      <div className="space-y-2">
        
        {/* 1. ラベル専用の独立した横一行ブロック */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-start">
          <div>
            <label className={labelStyle}>{t.water}</label>
          </div>
          <div>
            <label className={labelStyle}>{lang === "en" ? "GH" : "総硬度（GH）"}</label>
          </div>
          <div>
            <label className={labelStyle}>{lang === "en" ? "KH" : "炭酸塩硬度（KH）"}</label>
          </div>
          <div>
            <label className={labelStyle}>{t.minerals}</label>
          </div>
        </div>

        {/* 2. インプット専用の独立した横一行ブロック (これで絶対にずれません) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 水の名称 */}
          <div>
            <input 
              type="text" 
              placeholder={placeholderWaterName || t.waterPlaceholder}
              value={name} 
              onChange={(e) => onChange({ name: e.target.value })} 
              className={`${baseInputStyle} ${diffClasses?.name || ""}`} 
            />
          </div>

          {/* 総硬度 (GH) */}
          <div>
            <input 
              type="number" 
              min="0"
              step="any"
              placeholder={t.ghPlaceholder}
              value={gh} 
              disabled={isAutoCalc}
              onChange={(e) => handleNumberChange(e.target.value, "gh")} 
              className={`${baseInputStyle} ${isAutoCalc ? "bg-neutral-50 text-neutral-500 cursor-not-allowed" : ""} ${diffClasses?.gh || ""}`} 
            />
          </div>

          {/* 炭酸塩硬度 (KH) */}
          <div>
            <input 
              type="number" 
              min="0"
              step="any"
              placeholder={t.khPlaceholder}
              value={kh} 
              disabled={isAutoCalc}
              onChange={(e) => handleNumberChange(e.target.value, "kh")} 
              className={`${baseInputStyle} ${isAutoCalc ? "bg-neutral-50 text-neutral-500 cursor-not-allowed" : ""} ${diffClasses?.kh || ""}`} 
            />
          </div>

          {/* ミネラル比率 */}
          <div>
            <input 
              type="text" 
              placeholder={t.mineralPlaceholder}
              value={minerals} 
              disabled={isAutoCalc}
              onChange={(e) => onChange({ minerals: e.target.value })} 
              className={`${baseInputStyle} ${isAutoCalc ? "bg-neutral-50 text-neutral-500 cursor-not-allowed" : ""} ${diffClasses?.minerals || ""}`} 
            />
          </div>
        </div>

      </div>

      {/* カスタムウォーター・シミュレーター拡張エリア */}
      <div className="border border-neutral-100 rounded-xl p-4 bg-neutral-50/50 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id={`auto-calc-${module.id}`}
              checked={isAutoCalc}
              onChange={(e) => {
                setIsAutoCalc(e.target.checked)
                if (!e.target.checked) {
                  onChange({ isAutoCalc: false })
                }
              }}
              className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
            />
            <label htmlFor={`auto-calc-${module.id}`} className="text-xs font-bold text-neutral-700 font-sans cursor-pointer">
              {t.simulator}
            </label>
          </div>
          {isAutoCalc && (
            <span className="text-[10px] bg-neutral-200 text-neutral-700 px-2 py-0.5 rounded font-mono font-medium">
              {t.calculating}
            </span>
          )}
        </div>

        {isAutoCalc && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="text-[10px] font-bold text-neutral-500 font-mono block mb-1">CALCIUM (Ca²⁺) mg/L</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={t.calciumPlaceholder}
                value={calcCa}
                onChange={(e) => setCalcCa(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                className={calcInputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 font-mono block mb-1">MAGNESIUM (Mg²⁺) mg/L</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={t.magnesiumPlaceholder}
                value={calcMg}
                onChange={(e) => setCalcMg(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                className={calcInputStyle}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-neutral-500 font-mono block mb-1">{t.bicarbonate}</label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder={t.bicarbonatePlaceholder}
                value={calcNaBi}
                onChange={(e) => setCalcNaBi(Math.max(0, parseFloat(e.target.value) || 0).toString())}
                className={calcInputStyle}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
