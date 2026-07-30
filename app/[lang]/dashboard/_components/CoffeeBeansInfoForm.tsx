"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase"

export type OriginSuggestion = {
  id: number
  slug: string
  name: string
  name_ja: string
  type: "source" | "market" | "region" | "sub_region" | "country" | "prefecture" | "area"
}

type MasterSuggestion = {
  id: number
  slug: string
  name: string
  name_ja: string
}

type DynamicItem = {
  id: string
  value: string
  masterId?: string 
}

type CoffeeBeansInfoProps = {
  currentLang: "en" | "ja"
  title: string
  onChangeTitle: (val: string) => void
  variety: string 
  onChangeVariety: (val: string) => void 
  process: string 
  onChangeProcess: (val: string) => void 
  tastes: string
  onChangeTastes: (val: string) => void
  description: string
  onChangeDescription: (val: string) => void
  sourceInput: string
  onChangeSourceInput: (val: string) => void
  selectedSource: OriginSuggestion | null
  onSelectSource: (item: OriginSuggestion | null) => void
  marketInput: string
  onChangeMarketInput: (val: string) => void
  selectedMarket: OriginSuggestion | null
  onSelectMarket: (item: OriginSuggestion | null) => void
  isAdmin?: boolean 
}

const dict = {
  ja: {
    section1: "COFFEE INFO",
    subSection1: "基本情報",
    labelTitle: "Coffee Name",
    descTitle: "コーヒー名（必須）",
    placeholderTitle: "コーヒー名を入力してください（例: パナマ ゲイシャ）",
    labelSource: "Source",
    descSource: "産地・農園などを選択してください",
    placeholderSource: "農園名で検索",
    labelMarket: "Market",
    descMarket: "ロースターを選択してください",
    placeholderMarket: "ロースターで検索",
    labelVariety: "Variety (品種)",
    descVariety: "品種を選択してください（最大10個）",
    placeholderVariety: "例: ゲイシャ, ティピカなど",
    addVariety: "+ 品種を追加",
    labelProcess: "Process (精製方法)",
    descProcess: "精製方法を選択してください（最大5個）",
    placeholderProcess: "例: ウォッシュト, ナチュラルなど",
    addProcess: "+ 精製方法を追加",
    labelTastes: "Taste",
    descTastes: "味わい (必須)",
    placeholderTastes: "味わいを入力してください",
    labelDescription: "Description",
    descDescription: "説明・メモ (任意)",
    placeholderDescription: "農園やロースター、焙煎度、購入時のエピソードなど自由に記述できます",
    btnRequest: "見つからない場合は登録をリクエストする",
    modalTitle: "登録リクエスト",
    modalTypeLabel: "リクエスト対象の項目",
    modalContentLabel: "追加したい名称（英語・日本語など）",
    modalPlaceholder: "例: エチオピア イルガチェフェ アナエロビック",
    modalSubmit: "リクエストを送信",
    modalCancel: "キャンセル",
    modalSuccess: "リクエストを送信しました。運営者が確認します。",
    modalError: "送信に失敗しました。もう一度お試しください。"
  },
  en: {
    section1: "COFFEE INFO",
    subSection1: "Basic Information",
    labelTitle: "Coffee Name",
    descTitle: "Coffee name (Required)",
    placeholderTitle: "Please enter the coffee name (e.g., Panama Geisha)",
    labelSource: "Source",
    descSource: "Please select the origin, farm, etc.",
    placeholderSource: "Search farm name",
    labelMarket: "Market",
    descMarket: "Please select the roaster",
    placeholderMarket: "Search roaster name",
    labelVariety: "Variety",
    descVariety: "Please select varieties (Max 10)",
    placeholderVariety: "e.g., Geisha, Typica, etc.",
    addVariety: "+ Add variety",
    labelProcess: "Process",
    descProcess: "Please select processing methods (Max 5)",
    placeholderProcess: "e.g., Washed, Natural, etc.",
    addProcess: "+ Add process",
    labelTastes: "Taste",
    descTastes: "Taste (Required)",
    placeholderTastes: "Please enter the taste impressions",
    labelDescription: "Description",
    descDescription: "Description / Notes (Optional)",
    placeholderDescription: "Feel free to write about the farm, roaster, roast level, purchase stories, etc.",
    btnRequest: "Can't find it? Request new registration",
    modalTitle: "Registration Request",
    modalTypeLabel: "Target Field",
    modalContentLabel: "Name you want to add (English/Japanese, etc.)",
    modalPlaceholder: "e.g., Ethiopia Yirgacheffe Anaerobic",
    modalSubmit: "Submit Request",
    modalCancel: "Cancel",
    modalSuccess: "Request submitted successfully. Our team will review it.",
    modalError: "Failed to submit. Please try again."
  }
}

export default function CoffeeBeansInfoForm({
  currentLang,
  title = "",
  onChangeTitle,
  variety,
  onChangeVariety,
  process,
  onChangeProcess,
  tastes = "",
  onChangeTastes,
  description = "",
  onChangeDescription,
  sourceInput,
  onChangeSourceInput,
  selectedSource,
  onSelectSource,
  marketInput,
  onChangeMarketInput,
  selectedMarket,
  onSelectMarket,
  isAdmin = false
}: CoffeeBeansInfoProps) {
  const t = dict[currentLang]

  const [sourceSuggestions, setSourceSuggestions] = useState<OriginSuggestion[]>([])
  const [marketSuggestions, setMarketSuggestions] = useState<OriginSuggestion[]>([])
  const [varietySuggestions, setVarietySuggestions] = useState<MasterSuggestion[]>([])
  const [processSuggestions, setProcessSuggestions] = useState<MasterSuggestion[]>([])
  
  const [activeVarietyId, setActiveVarietyId] = useState<string | null>(null)
  const [activeProcessId, setActiveProcessId] = useState<string | null>(null)

  const [varieties, setVarieties] = useState<DynamicItem[]>([{ id: "1", value: "" }])
  const [processes, setProcesses] = useState<DynamicItem[]>([{ id: "1", value: "" }])

  const [isModalOpen, setIsModalOpen] = useState(false)

  // 初期値ロード (品種)
  useEffect(() => {
    if (!variety) {
      setVarieties([{ id: "1", value: "" }])
      return
    }
    const fetchInitialVarieties = async () => {
      const ids = variety.split(",").map(Number).filter(Boolean)
      if (ids.length === 0) return
      
      const { data } = await supabase
        .from("varieties")
        .select("id, name, name_ja")
        .in("id", ids)

      if (data && data.length > 0) {
        const mapped = ids.map((id, idx) => {
          const master = data.find(d => d.id === id)
          return {
            id: String(idx + 1),
            value: master ? (currentLang === "en" ? master.name : master.name_ja) : "",
            masterId: String(id)
          }
        }).filter(item => item.value !== "")

        if (mapped.length > 0) setVarieties(mapped)
      }
    }
    fetchInitialVarieties()
  }, [variety, currentLang])

  // 初期値ロード (精製方法)
  useEffect(() => {
    if (!process) {
      setProcesses([{ id: "1", value: "" }])
      return
    }
    const fetchInitialProcesses = async () => {
      const ids = process.split(",").map(Number).filter(Boolean)
      if (ids.length === 0) return

      const { data } = await supabase
        .from("processes")
        .select("id, name, name_ja")
        .in("id", ids)

      if (data && data.length > 0) {
        const mapped = ids.map((id, idx) => {
          const master = data.find(d => d.id === id)
          return {
            id: String(idx + 1),
            value: master ? (currentLang === "en" ? master.name : master.name_ja) : "",
            masterId: String(id)
          }
        }).filter(item => item.value !== "")

        if (mapped.length > 0) setProcesses(mapped)
      }
    }
    fetchInitialProcesses()
  }, [process, currentLang])

  // Source サジェスト
  useEffect(() => {
    const currentName = selectedSource ? (currentLang === "en" ? selectedSource.name : selectedSource.name_ja) : ""
    if (sourceInput.trim().length < 1 || (selectedSource && currentName === sourceInput)) {
      setSourceSuggestions([])
      return
    }
    const fetchSources = async () => {
      const { data } = await supabase
        .from("origins")
        .select("id, slug, name, name_ja, type")
        .eq("type", "source")
        .ilike("search_keywords", `%${sourceInput}%`)
        .limit(5)
      setSourceSuggestions(data as OriginSuggestion[] || [])
    }
    const timer = setTimeout(fetchSources, 200)
    return () => clearTimeout(timer)
  }, [sourceInput, selectedSource, currentLang])

  // Market サジェスト
  useEffect(() => {
    const currentName = selectedMarket ? (currentLang === "en" ? selectedMarket.name : selectedMarket.name_ja) : ""
    if (marketInput.trim().length < 1 || (selectedMarket && currentName === marketInput)) {
      setMarketSuggestions([])
      return
    }
    const fetchMarkets = async () => {
      const { data } = await supabase
        .from("origins")
        .select("id, slug, name, name_ja, type")
        .eq("type", "market")
        .ilike("search_keywords", `%${marketInput}%`)
        .limit(5)
      setMarketSuggestions(data as OriginSuggestion[] || [])
    }
    const timer = setTimeout(fetchMarkets, 200)
    return () => clearTimeout(timer)
  }, [marketInput, selectedMarket, currentLang])

  // 品種サジェスト
  useEffect(() => {
    if (!activeVarietyId) {
      setVarietySuggestions([])
      return
    }
    const targetItem = varieties.find(item => item.id === activeVarietyId)
    const val = targetItem ? targetItem.value.trim() : ""
    if (val.length < 1) {
      setVarietySuggestions([])
      return
    }
    const fetchVarieties = async () => {
      const { data } = await supabase
        .from("varieties")
        .select("id, slug, name, name_ja")
        .ilike("search_keywords", `%${val}%`)
        .limit(5)
      setVarietySuggestions(data as MasterSuggestion[] || [])
    }
    const timer = setTimeout(fetchVarieties, 200)
    return () => clearTimeout(timer)
  }, [activeVarietyId, varieties])

  // 精製方法サジェスト
  useEffect(() => {
    if (!activeProcessId) {
      setProcessSuggestions([])
      return
    }
    const targetItem = processes.find(item => item.id === activeProcessId)
    const val = targetItem ? targetItem.value.trim() : ""
    if (val.length < 1) {
      setProcessSuggestions([])
      return
    }
    const fetchProcesses = async () => {
      const { data } = await supabase
        .from("processes")
        .select("id, slug, name, name_ja")
        .ilike("search_keywords", `%${val}%`)
        .limit(5)
      setProcessSuggestions(data as MasterSuggestion[] || [])
    }
    const timer = setTimeout(fetchProcesses, 200) 
    return () => clearTimeout(timer)
  }, [activeProcessId, processes])

  const notifyVarietyChange = (currentList: DynamicItem[]) => {
    const ids = currentList.map(item => item.masterId).filter(Boolean) as string[]
    onChangeVariety(ids.join(","))
  }

  const notifyProcessChange = (currentList: DynamicItem[]) => {
    const ids = currentList.map(item => item.masterId).filter(Boolean) as string[]
    onChangeProcess(ids.join(","))
  }

  const handleAddVariety = () => {
    if (varieties.length >= 10) return
    setVarieties([...varieties, { id: crypto.randomUUID(), value: "" }])
  }

  const handleVarietyChange = (id: string, val: string) => {
    const updated = varieties.map(item => item.id === id ? { ...item, value: val } : item)
    setVarieties(updated)
    setActiveVarietyId(id)
  }

  const handleVarietyBlur = (id: string) => {
    setTimeout(() => {
      const target = varieties.find(item => item.id === id)
      if (target && !target.masterId) {
        const updated = varieties.map(v => v.id === id ? { ...v, value: "" } : v)
        setVarieties(updated)
        notifyVarietyChange(updated)
      }
      setActiveVarietyId(null)
    }, 200)
  }

  const handleRemoveVariety = (id: string) => {
    if (activeVarietyId === id) setActiveVarietyId(null)
    if (varieties.length === 1) {
      const reset = [{ id: "1", value: "" }]
      setVarieties(reset)
      notifyVarietyChange(reset)
      return
    }
    const updated = varieties.filter(item => item.id !== id)
    setVarieties(updated)
    notifyVarietyChange(updated)
  }

  const handleAddProcess = () => {
    if (processes.length >= 5) return
    setProcesses([...processes, { id: crypto.randomUUID(), value: "" }])
  }

  const handleProcessChange = (id: string, val: string) => {
    const updated = processes.map(item => item.id === id ? { ...item, value: val } : item)
    setProcesses(updated)
    setActiveProcessId(id)
  }

  const handleProcessBlur = (id: string) => {
    setTimeout(() => {
      const target = processes.find(item => item.id === id)
      if (target && !target.masterId) {
        const updated = processes.map(p => p.id === id ? { ...p, value: "" } : p)
        setProcesses(updated)
        notifyProcessChange(updated)
      }
      setActiveProcessId(null)
    }, 200)
  }

  const handleRemoveProcess = (id: string) => {
    if (activeProcessId === id) setActiveProcessId(null)
    if (processes.length === 1) {
      const reset = [{ id: "1", value: "" }]
      setProcesses(reset)
      notifyProcessChange(reset)
      return
    }
    const updated = processes.filter(item => item.id !== id)
    setProcesses(updated)
    notifyProcessChange(updated)
  }

  const inputStyle = "w-full text-[15px] border border-[#e5e5e5] rounded-[12px] px-4 py-4 bg-white text-[#161616] focus:outline-none focus:border-[#b5b5b5] placeholder:text-[#a3a3a3] transition-colors duration-200"
  const labelStyle = "text-[15px] font-bold tracking-wider text-[#161616] uppercase"
  const labelDescStyle = "text-[13px] font-normal text-[#8e8e8e] mt-0.5"
  const counterStyle = "text-[12px] text-[#8e8e8e] font-mono text-right pr-1 pt-1"

  return (
    <div id="coffee-info-section" className="space-y-8 scroll-mt-28">
      <div>
        <h2 className="text-[15px] font-bold tracking-wider text-[#161616] uppercase">
          {t.section1}
        </h2>
        <p className="mt-1 text-[13px] font-normal text-[#8e8e8e]">
          {t.subSection1}
        </p>
      </div>
      
      {/* Title */}
      <div className="space-y-3">
        <div>
          <label className={labelStyle}>{t.labelTitle}</label>
          <p className={labelDescStyle}>{t.descTitle}</p>
        </div>
        <input 
          type="text" 
          maxLength={isAdmin ? undefined : 100} 
          placeholder={t.placeholderTitle} 
          value={title} 
          onChange={(e) => onChangeTitle(e.target.value)} 
          className={inputStyle} 
          required 
        />
        <div className={counterStyle}>
          {title.length}{!isAdmin && " / 100"}
        </div>
      </div>
      
      {/* Source & Market */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
        {/* Source */}
        <div className="relative space-y-3">
          <div>
            <label className={labelStyle}>{t.labelSource}</label>
            <p className={labelDescStyle}>{t.descSource}</p>
          </div>
          <input 
            type="text" 
            placeholder={t.placeholderSource} 
            value={sourceInput} 
            onChange={(e) => {
              onChangeSourceInput(e.target.value)
              if (selectedSource) onSelectSource(null)
            }} 
            className={inputStyle} 
          />
          {sourceSuggestions.length > 0 && (
            <ul className="absolute z-20 w-full bg-white border border-[#e5e5e5] rounded-[12px] mt-1 shadow-[0_4px_20px_rgba(0,0,0,0.05)] max-h-48 overflow-y-auto divide-y divide-[#f0f0f0]">
              {sourceSuggestions.map((item) => {
                const displayName = currentLang === "en" ? item.name : item.name_ja
                return (
                  <li 
                    key={item.id} 
                    onMouseDown={() => { 
                      onSelectSource(item) 
                      onChangeSourceInput(displayName)
                      setSourceSuggestions([]) 
                    }} 
                    className="p-4 text-[14px] hover:bg-[#fafafa] cursor-pointer flex justify-between items-center text-[#161616] transition-colors"
                  >
                    <span className="font-medium">{displayName}</span>
                    <span className="text-[10px] text-[#8e8e8e] font-mono border border-[#e5e5e5] px-2 py-0.5 rounded uppercase tracking-wider bg-[#fafafa]">Source</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Market */}
        <div className="relative space-y-3">
          <div>
            <label className={labelStyle}>{t.labelMarket}</label>
            <p className={labelDescStyle}>{t.descMarket}</p>
          </div>
          <input 
            type="text" 
            placeholder={t.placeholderMarket} 
            value={marketInput} 
            onChange={(e) => {
              onChangeMarketInput(e.target.value)
              if (selectedMarket) onSelectMarket(null)
            }} 
            className={inputStyle} 
          />
          {marketSuggestions.length > 0 && (
            <ul className="absolute z-20 w-full bg-white border border-[#e5e5e5] rounded-[12px] mt-1 shadow-[0_4px_20px_rgba(0,0,0,0.05)] max-h-48 overflow-y-auto divide-y divide-[#f0f0f0]">
              {marketSuggestions.map((item) => {
                const displayName = currentLang === "en" ? item.name : item.name_ja
                return (
                  <li 
                    key={item.id} 
                    onMouseDown={() => { 
                      onSelectMarket(item)
                      onChangeMarketInput(displayName)
                      setMarketSuggestions([]) 
                    }} 
                    className="p-4 text-[14px] hover:bg-[#fafafa] cursor-pointer flex justify-between items-center text-[#161616] transition-colors"
                  >
                    <span className="font-medium">{displayName}</span>
                    <span className="text-[10px] text-[#8e8e8e] font-mono border border-[#e5e5e5] px-2 py-0.5 rounded uppercase tracking-wider bg-[#fafafa]">Market</span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      {/* 品種 */}
      <div className="space-y-4 border-t border-neutral-100 pt-6">
        <div className="flex justify-between items-end">
          <div>
            <label className={labelStyle}>{t.labelVariety}</label>
            <p className={labelDescStyle}>{t.descVariety}</p>
          </div>
          <span className="text-[12px] font-mono text-[#8e8e8e] bg-[#fafafa] px-2 py-0.5 border border-[#e5e5e5] rounded">
            {varieties.length} / 10
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {varieties.map((item, idx) => (
            <div key={item.id} className="relative flex flex-col">
              <div className="flex items-center gap-2 border border-[#e5e5e5] rounded-[12px] p-3 bg-[#fafafa]">
                <span className="text-[13px] font-bold text-[#8e8e8e] w-6 text-center select-none">{idx + 1}</span>
                <input 
                  type="text" 
                  placeholder={t.placeholderVariety} 
                  value={item.value} 
                  onChange={(e) => handleVarietyChange(item.id, e.target.value)}
                  onFocus={() => setActiveVarietyId(item.id)}
                  onBlur={() => handleVarietyBlur(item.id)}
                  className="w-full text-[14px] bg-white border border-[#e5e5e5] rounded-[8px] px-2.5 py-2 focus:outline-none focus:border-[#b5b5b5] placeholder:text-[#a3a3a3]"
                />
                {varieties.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveVariety(item.id)}
                    className="text-[#8e8e8e] hover:text-red-500 p-1 text-xs transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {activeVarietyId === item.id && varietySuggestions.length > 0 && (
                <ul className="absolute z-30 w-full bg-white border border-[#e5e5e5] rounded-[12px] mt-14 shadow-[0_4px_20px_rgba(0,0,0,0.05)] max-h-40 overflow-y-auto divide-y divide-[#f0f0f0]">
                  {varietySuggestions.map((sug) => {
                    const displayName = currentLang === "en" ? sug.name : sug.name_ja
                    return (
                      <li
                        key={sug.id}
                        onMouseDown={() => {
                          const updated = varieties.map(v => v.id === item.id ? { ...v, value: displayName, masterId: String(sug.id) } : v)
                          setVarieties(updated)
                          notifyVarietyChange(updated)
                          setVarietySuggestions([])
                          setActiveVarietyId(null)
                        }}
                        className="p-3 text-[13px] hover:bg-[#fafafa] cursor-pointer text-[#161616] transition-colors"
                      >
                        {displayName}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>

        {varieties.length < 10 && (
          <button
            type="button"
            onClick={handleAddVariety}
            className="text-[13px] font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100/80 px-4 py-2.5 rounded-[10px] border border-neutral-200 transition-colors"
          >
            {t.addVariety}
          </button>
        )}
      </div>

      {/* 精製方法 */}
      <div className="space-y-4 border-t border-neutral-100 pt-6">
        <div className="flex justify-between items-end">
          <div>
            <label className={labelStyle}>{t.labelProcess}</label>
            <p className={labelDescStyle}>{t.descProcess}</p>
          </div>
          <span className="text-[12px] font-mono text-[#8e8e8e] bg-[#fafafa] px-2 py-0.5 border border-[#e5e5e5] rounded">
            {processes.length} / 5
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {processes.map((item, idx) => (
            <div key={item.id} className="relative flex flex-col">
              <div className="flex items-center gap-2 border border-[#e5e5e5] rounded-[12px] p-3 bg-[#fafafa]">
                <span className="text-[13px] font-bold text-[#8e8e8e] w-6 text-center select-none">{idx + 1}</span>
                <input 
                  type="text" 
                  placeholder={t.placeholderProcess} 
                  value={item.value} 
                  onChange={(e) => handleProcessChange(item.id, e.target.value)}
                  onFocus={() => setActiveProcessId(item.id)}
                  onBlur={() => handleProcessBlur(item.id)}
                  className="w-full text-[14px] bg-white border border-[#e5e5e5] rounded-[8px] px-2.5 py-2 focus:outline-none focus:border-[#b5b5b5] placeholder:text-[#a3a3a3]"
                />
                {processes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProcess(item.id)}
                    className="text-[#8e8e8e] hover:text-red-500 p-1 text-xs transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {activeProcessId === item.id && processSuggestions.length > 0 && (
                <ul className="absolute z-30 w-full bg-white border border-[#e5e5e5] rounded-[12px] mt-14 shadow-[0_4px_20px_rgba(0,0,0,0.05)] max-h-40 overflow-y-auto divide-y divide-[#f0f0f0]">
                  {processSuggestions.map((sug) => {
                    const displayName = currentLang === "en" ? sug.name : sug.name_ja
                    return (
                      <li
                        key={sug.id}
                        onMouseDown={() => {
                          const updated = processes.map(p => p.id === item.id ? { ...p, value: displayName, masterId: String(sug.id) } : p)
                          setProcesses(updated)
                          notifyProcessChange(updated)
                          setProcessSuggestions([])
                          setActiveProcessId(null)
                        }}
                        className="p-3 text-[13px] hover:bg-[#fafafa] cursor-pointer text-[#161616] transition-colors"
                      >
                        {displayName}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          ))}
        </div>

        {processes.length < 5 && (
          <button
            type="button"
            onClick={handleAddProcess}
            className="text-[13px] font-bold text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-neutral-100/80 px-4 py-2.5 rounded-[10px] border border-neutral-200 transition-colors"
          >
            {t.addProcess}
          </button>
        )}
      </div>

      {/* 登録リクエストボタン */}
      <div className="pt-4 text-left">
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 underline transition-colors"
        >
          {t.btnRequest}
        </button>
      </div>

      {/* Taste */}
      <div className="space-y-3 border-t border-neutral-100 pt-6">
        <div>
          <label className={labelStyle}>{t.labelTastes}</label>
          <p className={labelDescStyle}>{t.descTastes}</p>
        </div>
        <textarea 
          maxLength={isAdmin ? undefined : 300} 
          placeholder={t.placeholderTastes}
          value={tastes}
          onChange={(e) => onChangeTastes(e.target.value)}
          rows={3}
          className={`${inputStyle} resize-y min-h-[96px] py-4 leading-relaxed`}
          required
        />
        <div className={counterStyle}>
          {tastes.length}{!isAdmin && " / 300"} 
        </div>
      </div>

      {/* Description */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <div>
            <label className={labelStyle}>{t.labelDescription}</label>
            <p className={labelDescStyle}>{t.descDescription}</p>
          </div>
          <span className="text-[10px] text-[#8e8e8e] font-mono uppercase tracking-wider bg-[#fafafa] border border-[#e5e5e5] px-1.5 py-0.5 rounded-[4px] select-none">Optional</span>
        </div>
        <textarea 
          maxLength={isAdmin ? undefined : 500} 
          placeholder={t.placeholderDescription}
          value={description}
          onChange={(e) => onChangeDescription(e.target.value)}
          rows={5}
          className={`${inputStyle} resize-y min-h-[140px] py-4 leading-relaxed`}
        />
        <div className={counterStyle}>
          {description.length}{!isAdmin && " / 500"} 
        </div>
      </div>

      {/* モーダルコンポーネント */}
      <MasterRequestModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        t={t}
        currentLang={currentLang}
      />
    </div>
  )
}

type MasterRequestModalProps = {
  isOpen: boolean
  onClose: () => void
  t: any
  currentLang: "ja" | "en"
}

function MasterRequestModal({ isOpen, onClose, t, currentLang }: MasterRequestModalProps) {
  const [requestType, setRequestType] = useState<"source" | "market" | "variety" | "process">("source")
  const [requestValue, setRequestValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [modalMessage, setModalMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const requestInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !isSubmitting) onClose()
    }
    window.addEventListener("keydown", handleEscape)
    const frame = window.requestAnimationFrame(() => {
      requestInputRef.current?.focus()
    })
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const handleRequestSubmit = async () => {
    if (!requestValue.trim()) return

    setIsSubmitting(true)
    setModalMessage(null)

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (!user) {
        setModalMessage({ text: "リクエストを送信するにはログインが必要です。", type: "error" })
        setIsSubmitting(false)
        return
      }

      const { error } = await supabase
        .from("admin_notifications")
        .insert({
          user_id: user.id,
          type: "master_request",
          requested_display_name: `[${requestType.toUpperCase()}] ${requestValue.trim()}`,
          status: "pending",
          created_at: new Date().toISOString()
        })

      if (error) throw error

      setModalMessage({ text: t.modalSuccess, type: "success" })
      setRequestValue("")
      
      setTimeout(() => {
        onClose()
        setModalMessage(null)
      }, 2000)
    } catch (err) {
      console.error("【Request Error】:", err)
      setModalMessage({ text: t.modalError, type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }
  
  return createPortal(
    <div
      className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-neutral-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="my-auto max-h-[calc(100dvh-2rem)] w-full max-w-md space-y-5 overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-6 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.45)] sm:p-8">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">REGISTRATION REQUEST</p>
        <div>
          <h3 className="text-base font-bold text-neutral-900">{t.modalTitle}</h3>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{t.modalTypeLabel}</label>
            <select
              value={requestType}
              onChange={(e) => setRequestType(e.target.value as any)}
              className="w-full text-sm border border-neutral-200 rounded-xl px-3.5 py-3 bg-neutral-50 font-medium text-neutral-800 focus:outline-none"
            >
              <option value="source">{currentLang === "en" ? "Source" : "Source（産地・農園）"}</option>
              <option value="market">{currentLang === "en" ? "Market" : "Market（ロースター）"}</option>
              <option value="variety">{currentLang === "en" ? "Variety" : "Variety（品種）"}</option>
              <option value="process">{currentLang === "en" ? "Process" : "Process（精製方法）"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{t.modalContentLabel}</label>
            <input
              ref={requestInputRef}
              type="text"
              placeholder={t.modalPlaceholder}
              value={requestValue}
              onChange={(e) => setRequestValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") e.preventDefault()
              }}
              className="w-full text-sm border border-neutral-200 rounded-xl px-3.5 py-3 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400"
            />
          </div>

          {modalMessage && (
            <div className={`text-xs p-3 rounded-xl border font-medium ${
              modalMessage.type === "success" 
                ? "text-emerald-700 bg-emerald-50 border-emerald-200" 
                : "text-red-700 bg-red-50 border-red-200"
            }`}>
              {modalMessage.text}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                setModalMessage(null)
              }}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600 transition-colors"
            >
              {t.modalCancel}
            </button>
            <button
              type="button"
              onClick={handleRequestSubmit}
              disabled={isSubmitting || !requestValue.trim()}
              className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              {isSubmitting ? "..." : t.modalSubmit}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
