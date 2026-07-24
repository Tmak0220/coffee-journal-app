"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase" // 💡 追加: expertsの検索用
import { RecipeItemData, RecipeMode, GearMasterItem } from "./BrewRecipeForm"
import MasterRequestButton from "./MasterRequestButton"

type RecipeItemFormProps = {
  recipe: RecipeItemData
  index: number
  currentLang: "ja" | "en"
  t: any
  gears: GearMasterItem[]
  recipesCount: number
  onUpdate: (id: string, updatedFields: Partial<RecipeItemData>) => void
  onRemove: (id: string) => void
  onSaveTemplate: (recipe: RecipeItemData, templateName: string) => void
}

// 💡 バリスタ検索用の型定義
type ExpertSuggestItem = {
  user_id: string
  display_name: string
  display_name_en: string | null
  current_store: string | null
  avatar_url?: string | null
  // 💡 DBから取得するか、フロントで生成する検索用キーワード配列
  search_keywords?: string[] 
}

type MarketSuggestItem = {
  id: number
  name: string
  name_ja: string | null
  search_keywords: string | null
}

export default function RecipeItemForm({
  recipe,
  index,
  currentLang,
  t,
  gears,
  recipesCount,
  onUpdate,
  onRemove,
  onSaveTemplate
}: RecipeItemFormProps) {
  const [activeTemplateInputId, setActiveTemplateInputId] = useState<string | null>(null)
  const [templateNameInput, setTemplateNameInput] = useState("")
  const [activeEquipmentField, setActiveEquipmentField] = useState<string | null>(null)

  // 💡 バリスタサジェスト用のローカルステート
  const [baristaSuggestions, setBaristaSuggestions] = useState<ExpertSuggestItem[]>([])
  const [showBaristaSuggest, setShowBaristaSuggest] = useState(false)
  const [marketSuggestions, setMarketSuggestions] = useState<MarketSuggestItem[]>([])
  const [showMarketSuggest, setShowMarketSuggest] = useState(false)

  // 1レシピに閉じたEY自動計算ロジック
  const br = parseFloat(recipe.ratio) || 0
  const tds = parseFloat(recipe.tdsInput) || 0
  const approxEy = tds * br
  const correctedEy = tds > 0 && br > 0 ? (tds * br) / (1 - tds / 100) : 0

  const isInvalidNumber = (val: string) => {
    if (!val) return false
    return !/^[0-9.]+$/.test(val)
  }

  const isWaterTempInvalid = isInvalidNumber(recipe.waterTemp)
  const isRatioInvalid = isInvalidNumber(recipe.ratio)
  const isTdsInvalid = isInvalidNumber(recipe.tdsInput)

  // 器具用のキーワード検索
  const getSuggestions = (inputValue: string) => {
    const cleanInput = inputValue.trim().toLowerCase()
    if (!cleanInput) return []
    return gears.filter(gear => {
      const searchableText = [gear.name, gear.name_ja, gear.brand, gear.brand_ja, gear.search_keywords]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
      return searchableText.includes(cleanInput)
    })
  }

  // 💡 バリスタ（Experts）用の検索ロジック
  // 入力された文字を元に、DB側、または取得後のキーワードマッチングでサジェストを展開します
  const handleBaristaSearch = async (inputValue: string) => {
    onUpdate(recipe.id, { baristaName: inputValue, baristaUserId: "" }) // 手入力時はIDをリセット

    const cleanInput = inputValue.trim().toLowerCase()
    if (!cleanInput) {
      setBaristaSuggestions([])
      return
    }

    // 公開かつ承認済みのプロを対象に検索
    const { data, error } = await supabase
      .from("experts")
      .select("user_id, display_name, display_name_en, current_store")
      .eq("is_approved", true)
      .eq("is_public", true)
      // display_name または display_name_en に部分一致、もしくはDB側に関連キーワードカラムがあればそれを利用
      .or(`display_name.ilike.%${cleanInput}%,display_name_en.ilike.%${cleanInput}%,current_store.ilike.%${cleanInput}%`)
      .limit(6)

    if (!error && data) {
      setBaristaSuggestions(data as ExpertSuggestItem[])
      setShowBaristaSuggest(true)
    }
  }

  const handleMarketSearch = async (inputValue: string) => {
    onUpdate(recipe.id, { shopName: inputValue, shopOriginId: null })
    const query = inputValue.trim()
    if (!query) {
      setMarketSuggestions([])
      setShowMarketSuggest(false)
      return
    }

    const { data, error } = await supabase
      .from("origins")
      .select("id, name, name_ja, search_keywords")
      .eq("type", "market")
      .ilike("search_keywords", `%${query}%`)
      .limit(6)

    if (error) {
      console.error("Failed to search market origins:", error)
      setMarketSuggestions([])
      return
    }
    setMarketSuggestions((data || []) as MarketSuggestItem[])
    setShowMarketSuggest(true)
  }

  const inputStyle = "w-full text-[15px] border border-[#e5e5e5] rounded-[12px] px-4 py-4 bg-white text-[#161616] focus:outline-none focus:border-[#b5b5b5] placeholder:text-[#a3a3a3] transition-colors duration-200"
  const labelStyle = "text-[15px] font-bold tracking-wider text-[#161616] uppercase"
  const labelDescStyle = "text-[13px] font-normal text-[#8e8e8e] mt-0.5 whitespace-pre-line leading-relaxed"
  const warningTextStyle = "text-[12px] font-medium text-red-500 mt-1.5 block"

  return (
    <div className="space-y-8 p-6 border border-[#e5e5e5] rounded-[16px] bg-white relative">
      
      {/* 各レシピごとのヘッダーコントロール */}
      <div className="flex justify-between items-center border-b border-[#e5e5e5] pb-4">
        <span className="text-[12px] font-mono font-bold text-[#8e8e8e] tracking-widest uppercase">
          RECIPE #{index + 1}
        </span>
        <div className="flex items-center gap-4">
          {recipe.mode === "self" && (
            <div className="flex items-center gap-2">
              {activeTemplateInputId === recipe.id ? (
                <div className="flex items-center gap-1.5 bg-[#fafafa] border border-[#e5e5e5] rounded-[8px] p-1 animate-fade-in">
                  <input
                    type="text"
                    placeholder={t.templatePlaceholder}
                    value={templateNameInput}
                    onChange={(e) => setTemplateNameInput(e.target.value)}
                    className="text-[12px] px-2 py-1 bg-white border border-[#e5e5e5] rounded-[6px] focus:outline-none w-36 text-[#161616]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      onSaveTemplate(recipe, templateNameInput)
                      setActiveTemplateInputId(null)
                      setTemplateNameInput("")
                    }}
                    className="text-[12px] font-medium px-2 py-1 bg-neutral-900 text-white rounded-[6px] hover:bg-neutral-800"
                  >
                    {t.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTemplateInputId(null)
                      setTemplateNameInput("")
                    }}
                    className="text-[12px] font-medium px-2 py-1 text-[#8e8e8e] hover:text-[#161616]"
                  >
                    {t.cancel}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setActiveTemplateInputId(recipe.id)
                    setTemplateNameInput(`マイレシピ #${index + 1}`)
                  }}
                  className="text-[12px] font-medium text-[#8e8e8e] hover:text-[#161616] transition-colors"
                >
                  {t.saveTemplate}
                </button>
              )}
            </div>
          )}
          {recipesCount > 1 && (
            <button
              type="button"
              onClick={() => onRemove(recipe.id)}
              className="text-[12px] font-medium text-[#8e8e8e] hover:text-red-500 transition-colors"
            >
              {t.removeRecipe}
            </button>
          )}
        </div>
      </div>

      {/* モード切り替えタブ */}
      <div className="flex gap-2 p-1 bg-[#fafafa] border border-[#e5e5e5] rounded-[12px] max-w-md select-none">
        {(["self", "barista", "none"] as RecipeMode[]).map((m) => {
          const isActive = recipe.mode === m
          const label = m === "self" ? t.labelSelf : m === "barista" ? t.labelBarista : t.labelNone
          return (
            <button
              key={m}
              type="button"
              onClick={() => onUpdate(recipe.id, { mode: m })}
              className={`flex-1 text-[13px] py-3 rounded-[10px] font-medium transition-all duration-200 ${
                isActive
                  ? "bg-white text-[#161616] shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-[#e5e5e5]"
                  : "text-[#8e8e8e] hover:text-[#161616]"
              }`}
            >
              {label}
            </button>
          )
        })}
      </div>

      {/* ☕ 自分で抽出モード */}
      {recipe.mode === "self" && (
        <div className="space-y-8 animate-fade-in">
          {/* Equipment セクション */}
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>{t.labelDripper}</label>
              <p className={labelDescStyle}>{t.descDripper}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recipe.equipments.map((item, idx) => {
                const fieldKey = `${recipe.id}-${item.id}`
                const suggestions = getSuggestions(item.name)
                const showSuggestions = activeEquipmentField === fieldKey && suggestions.length > 0

                return (
                  <div key={item.id} className="relative flex items-center gap-2 border border-[#e5e5e5] rounded-[12px] p-3 bg-[#fafafa]">
                    <span className="text-[13px] font-bold text-[#8e8e8e] w-6 text-center select-none">
                      {idx + 1}
                    </span>
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        placeholder={t.placeholderDripper}
                        value={item.name || ""}
                        onFocus={() => setActiveEquipmentField(fieldKey)}
                        onBlur={() => {
                          setTimeout(() => setActiveEquipmentField(null), 200)
                        }}
                        onChange={(e) => {
                          const updatedGears = recipe.equipments.map(g => (g.id === item.id ? { ...g, name: e.target.value, gearId: null } : g))
                          onUpdate(recipe.id, { equipments: updatedGears })
                        }}
                        className="w-full text-[14px] bg-white border border-[#e5e5e5] rounded-[8px] px-2.5 py-2 focus:outline-none focus:border-[#b5b5b5] placeholder:text-[#a3a3a3]"
                      />

                      {showSuggestions && (
                        <div className="absolute left-0 top-[calc(100%+4px)] w-full bg-white border border-[#e5e5e5] rounded-[10px] shadow-xl z-50 p-1 max-h-48 overflow-y-auto animate-fade-in">
                          {suggestions.map((gear) => (
                            <button
                              key={gear.id}
                              type="button"
                              onMouseDown={() => {
                                const displayName = currentLang === "ja" ? (gear.name_ja || gear.name) : gear.name
                                const updatedGears = recipe.equipments.map(g => (g.id === item.id ? { ...g, name: displayName, gearId: gear.id } : g))
                                onUpdate(recipe.id, { equipments: updatedGears })
                                setActiveEquipmentField(null)
                              }}
                              className="w-full text-left text-[13px] px-3 py-2 rounded-[6px] hover:bg-neutral-50 text-[#161616] transition-colors flex justify-between items-center"
                            >
                              <span className="font-medium">{currentLang === "ja" ? (gear.name_ja || gear.name) : gear.name}</span>
                              <span className="text-[10px] font-mono text-[#8e8e8e] border border-neutral-200 rounded px-1.5 py-0.5 bg-neutral-50">Match</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {recipe.equipments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const updatedGears = recipe.equipments.filter(g => g.id !== item.id)
                          onUpdate(recipe.id, { equipments: updatedGears })
                        }}
                        className="text-[#8e8e8e] hover:text-red-500 p-1 text-xs transition-colors"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdate(recipe.id, { equipments: [...recipe.equipments, { id: String(Date.now()), name: "", gearId: null }] })
              }}
              className="text-[13px] font-medium text-[#161616] hover:text-[#8e8e8e] transition-colors px-1"
            >
              {t.addEquipment}
            </button>
            <div className="pt-1">
              <MasterRequestButton
                currentLang={currentLang}
                options={[
                  { value: "GEAR", labelJa: "器具", labelEn: "Gear" },
                  { value: "DRIPPER", labelJa: "ドリッパー", labelEn: "Dripper" },
                  { value: "GRINDER", labelJa: "グラインダー・ミル", labelEn: "Grinder" },
                  { value: "FILTER", labelJa: "フィルター", labelEn: "Filter" }
                ]}
                placeholderJa="例: HARIO V60 / Comandante C40"
                placeholderEn="e.g., HARIO V60 / Comandante C40"
              />
            </div>
          </div>

          {/* 温度・グラインドサイズ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="relative space-y-3">
              <div>
                <label className={labelStyle}>Temperature</label>
                <p className={labelDescStyle}>{t.descWaterTemp}</p>
              </div>
              <input
                type="text"
                placeholder={t.placeholderWaterTemp}
                value={recipe.waterTemp}
                onChange={(e) => onUpdate(recipe.id, { waterTemp: e.target.value })}
                className={`${inputStyle} ${isWaterTempInvalid ? "border-red-400 focus:border-red-500" : ""}`}
              />
              {isWaterTempInvalid && <span className={warningTextStyle}>{t.numberWarning}</span>}
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelStyle}>{t.labelGrindSize}</label>
                <p className={labelDescStyle}>{t.descGrindSize}</p>
              </div>
              <input
                type="text"
                placeholder={t.placeholderGrindSize}
                value={recipe.grindSize}
                onChange={(e) => onUpdate(recipe.id, { grindSize: e.target.value })}
                className={inputStyle}
              />
            </div>
          </div>

          {/* 比率・TDSのコンテナ（高さズレ対策） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 border-t border-b border-neutral-100 py-6 items-start">
            
            {/* Brew Ratio 側のブロック */}
            <div className="flex flex-col justify-between space-y-3">
              <div className="min-h-[52px] flex flex-col justify-start">
                <label className={labelStyle}>{t.labelRatio}</label>
                <p className={labelDescStyle}>{t.descRatio}</p>
              </div>
              <div>
                <input
                  type="text"
                  placeholder={t.placeholderRatio}
                  value={recipe.ratio}
                  onChange={(e) => onUpdate(recipe.id, { ratio: e.target.value })}
                  className={`${inputStyle} ${isRatioInvalid ? "border-red-400 focus:border-red-500" : ""}`}
                />
                {isRatioInvalid && <span className={warningTextStyle}>{t.numberWarning}</span>}
              </div>
            </div>

            {/* TDS 側のブロック */}
            <div className="flex flex-col justify-between space-y-3">
              <div className="min-h-[52px] flex flex-col justify-start">
                <label className={labelStyle}>{t.labelTds}</label>
                <p className={labelDescStyle}>{t.descTds}</p>
              </div>
              <div>
                <input
                  type="text"
                  placeholder={t.placeholderTds}
                  value={recipe.tdsInput}
                  onChange={(e) => onUpdate(recipe.id, { tdsInput: e.target.value })}
                  className={`${inputStyle} ${isTdsInvalid ? "border-red-400 focus:border-red-500" : ""}`}
                />
                {isTdsInvalid && <span className={warningTextStyle}>{t.numberWarning}</span>}
              </div>
            </div>

            {/* EY表示 */}
            <div className="md:col-span-2 bg-[#fafafa] border border-[#e5e5e5] rounded-[16px] p-5 space-y-3 mt-2">
              <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
                <h4 className="text-[13px] font-bold text-[#161616] uppercase tracking-wider">{t.labelEyCard}</h4>
                <div className="text-[11px] text-[#8e8e8e] text-right font-mono">
                  <span className="block">{t.formulaTitle}</span>
                  <span className="block">{t.formulaApprox}</span>
                  <span className="block">{t.formulaCorrected}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1 text-center">
                <div className="bg-white border border-[#e5e5e5] rounded-[12px] p-3">
                  <span className="text-[11px] text-[#8e8e8e] block uppercase font-medium">Approx Value (近似値)</span>
                  <span className="text-xl font-mono font-bold text-[#161616] mt-1 block">
                    {!isRatioInvalid && !isTdsInvalid && br > 0 && tds > 0 ? `${approxEy.toFixed(2)}%` : "—"}
                  </span>
                </div>
                <div className="bg-neutral-900 border border-neutral-900 rounded-[12px] p-3 text-white">
                  <span className="text-[11px] text-neutral-400 block uppercase font-medium">Corrected Value (補正式)</span>
                  <span className="text-xl font-mono font-bold text-white mt-1 block">
                    {!isRatioInvalid && !isTdsInvalid && br > 0 && tds > 0 ? `${correctedEy.toFixed(2)}%` : "—"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* タイム関連 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div className="space-y-3">
              <div>
                <label className={labelStyle}>{t.labelBloomTime}</label>
                <p className={labelDescStyle}>{t.descBloomTime}</p>
              </div>
              <input
                type="text"
                placeholder={t.placeholderBloomTime}
                value={recipe.bloomTime}
                onChange={(e) => onUpdate(recipe.id, { bloomTime: e.target.value })}
                className={inputStyle}
              />
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelStyle}>{t.labelTotalTime}</label>
                <p className={labelDescStyle}>{t.descTotalTime}</p>
              </div>
              <input
                type="text"
                placeholder={t.placeholderTotalTime}
                value={recipe.totalTime}
                onChange={(e) => onUpdate(recipe.id, { totalTime: e.target.value })}
                className={inputStyle}
              />
            </div>
          </div>

          {/* 注湯プロセスステップ */}
          <div className="space-y-4">
            <div>
              <label className={labelStyle}>{t.labelPourSteps}</label>
              <p className={labelDescStyle}>{t.descPourSteps}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {recipe.pourSteps.map((step, idx) => (
                <div key={step.id} className="flex items-center gap-2 border border-[#e5e5e5] rounded-[12px] p-3 bg-[#fafafa]">
                  <span className="text-[13px] font-bold text-[#8e8e8e] w-6 text-center select-none">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    placeholder={t.placeholderAmount}
                    value={step.amount || ""}
                    onChange={(e) => {
                      const updatedSteps = recipe.pourSteps.map(s => (s.id === step.id ? { ...s, amount: e.target.value } : s))
                      onUpdate(recipe.id, { pourSteps: updatedSteps })
                    }}
                    className="w-full text-[14px] bg-white border border-[#e5e5e5] rounded-[8px] px-2.5 py-2 focus:outline-none focus:border-[#b5b5b5] placeholder:text-[#a3a3a3]"
                  />
                  <input
                    type="text"
                    placeholder={t.placeholderTime}
                    value={step.time || ""}
                    onChange={(e) => {
                      const updatedSteps = recipe.pourSteps.map(s => (s.id === step.id ? { ...s, time: e.target.value } : s))
                      onUpdate(recipe.id, { pourSteps: updatedSteps })
                    }}
                    className="w-24 text-[14px] bg-white border border-[#e5e5e5] rounded-[8px] px-2.5 py-2 text-center focus:outline-none focus:border-[#b5b5b5] placeholder:text-[#a3a3a3]"
                  />
                  {recipe.pourSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        const updatedSteps = recipe.pourSteps.filter(s => s.id !== step.id)
                        onUpdate(recipe.id, { pourSteps: updatedSteps })
                      }}
                      className="text-[#8e8e8e] hover:text-red-500 p-1 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onUpdate(recipe.id, { pourSteps: [...recipe.pourSteps, { id: String(Date.now()), amount: "", time: "" }] })
              }}
              className="text-[13px] font-medium text-[#161616] hover:text-[#8e8e8e] transition-colors px-1"
            >
              {t.addStep}
            </button>
          </div>

          {/* 自分で抽出モードのメモ */}
          <div className="space-y-3">
            <div>
              <label className={labelStyle}>{t.labelNotes}</label>
              <p className={labelDescStyle}>{t.descNotesSelf}</p>
            </div>
            <textarea
              placeholder={t.placeholderNotesSelf}
              value={recipe.notes}
              onChange={(e) => onUpdate(recipe.id, { notes: e.target.value })}
              rows={3}
              className={`${inputStyle} resize-none py-4 leading-relaxed`}
            />
          </div>
        </div>
      )}

      {/* 🫖 バリスタサーブモード */}
      {recipe.mode === "barista" && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            
            {/* 💡 修正: バリスタ名入力フィールド（サジェスト機能付きに完全拡張） */}
            <div className="space-y-3 relative">
              <div>
                <label className={labelStyle}>{t.labelBaristaName}</label>
                <p className={labelDescStyle}>{t.descBaristaName}</p>
              </div>
              
              <div className="relative">
                <input
                  type="text"
                  placeholder={t.placeholderBaristaName}
                  value={recipe.baristaName || ""}
                  onFocus={() => recipe.baristaName && setShowBaristaSuggest(true)}
                  onBlur={() => {
                    // クリックイベントの伝播が阻害されないよう少しディレイを入れる
                    setTimeout(() => setShowBaristaSuggest(false), 200)
                  }}
                  onChange={(e) => handleBaristaSearch(e.target.value)}
                  className={inputStyle}
                />

                {/* 💡 器具と同じスタイリング構造のサジェストボックス */}
                {showBaristaSuggest && baristaSuggestions.length > 0 && (
                  <div className="absolute left-0 top-[calc(100%+4px)] w-full bg-white border border-[#e5e5e5] rounded-[10px] shadow-xl z-50 p-1 max-h-52 overflow-y-auto animate-fade-in">
                    {baristaSuggestions.map((expert) => {
                      const displayName = currentLang === "en" ? (expert.display_name_en || expert.display_name) : expert.display_name
                      return (
                        <button
                          key={expert.user_id}
                          type="button"
                          onMouseDown={() => {
                            // 💡 選択時に実際に入力フィールドに表示されるのは display_name
                            onUpdate(recipe.id, { 
                              baristaName: displayName, 
                              baristaUserId: expert.user_id, // 裏で一意のIDを紐付け
                              shopName: expert.current_store || recipe.shopName // 店舗名も自動セット
                            })
                            setShowBaristaSuggest(false)
                          }}
                          className="w-full text-left text-[13px] px-3 py-2.5 rounded-[6px] hover:bg-neutral-50 text-[#161616] transition-colors flex justify-between items-center border-b border-neutral-50 last:border-0"
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#161616]">{displayName}</span>
                            {expert.current_store && (
                              <span className="text-[11px] text-[#8e8e8e] mt-0.5">{expert.current_store}</span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-[#8e8e8e] border border-neutral-200 rounded px-1.5 py-0.5 bg-neutral-50 uppercase tracking-wider scale-90">
                            Verified
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              {t.descBaristaPrivacy && (
                <p className="text-[12px] font-normal text-[#8e8e8e] mt-1.5 leading-relaxed">
                  {t.descBaristaPrivacy}
                </p>
              )}
            </div>

            {/* 店舗名入力フィールド */}
            <div className="space-y-3">
              <div>
                <label className={labelStyle}>{t.labelShopName}</label>
                <p className={labelDescStyle}>{t.descShopName}</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder={t.placeholderShopName}
                  value={recipe.shopName || ""}
                  onFocus={() => {
                    if (recipe.shopName && !recipe.shopOriginId) void handleMarketSearch(recipe.shopName)
                    else if (recipe.shopName) setShowMarketSuggest(true)
                  }}
                  onBlur={() => setTimeout(() => setShowMarketSuggest(false), 200)}
                  onChange={(e) => void handleMarketSearch(e.target.value)}
                  className={inputStyle}
                />
                {showMarketSuggest && marketSuggestions.length > 0 && (
                  <div className="absolute left-0 top-[calc(100%+4px)] z-50 max-h-52 w-full overflow-y-auto rounded-[10px] border border-[#e5e5e5] bg-white p-1 shadow-xl animate-fade-in">
                    {marketSuggestions.map((market) => {
                      const displayName = currentLang === "en"
                        ? market.name
                        : (market.name_ja || market.name)
                      return (
                        <button
                          key={market.id}
                          type="button"
                          onMouseDown={() => {
                            onUpdate(recipe.id, { shopName: displayName, shopOriginId: market.id })
                            setMarketSuggestions([])
                            setShowMarketSuggest(false)
                          }}
                          className="flex w-full items-center justify-between border-b border-neutral-50 px-3 py-2.5 text-left text-[13px] text-[#161616] transition-colors last:border-0 hover:bg-neutral-50"
                        >
                          <span className="font-semibold">{displayName}</span>
                          <span className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#8e8e8e]">
                            Market
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelStyle}>{t.labelServingStyle}</label>
              <p className={labelDescStyle}>{t.descServingStyle}</p>
            </div>
            <input
              type="text"
              placeholder={t.placeholderServingStyle}
              value={recipe.servingStyle || ""}
              onChange={(e) => onUpdate(recipe.id, { servingStyle: e.target.value })}
              className={inputStyle}
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className={labelStyle}>{t.labelNotes}</label>
              <p className={labelDescStyle}>{t.descNotesBarista}</p>
            </div>
            <textarea
              placeholder={t.placeholderNotesBarista}
              value={recipe.notes || ""}
              onChange={(e) => onUpdate(recipe.id, { notes: e.target.value })}
              rows={3}
              className={`${inputStyle} resize-none py-4 leading-relaxed`}
            />
          </div>
        </div>
      )}

      {/* 🚫 記録なしモード */}
      {recipe.mode === "none" && (
        <div className="p-4 bg-neutral-50/60 border border-neutral-200/60 rounded-xl text-center select-none animate-fade-in">
          <p className="text-[13px] text-neutral-400 font-normal">
            {t.noneMessage}
          </p>
        </div>
      )}

    </div>
  )
}
