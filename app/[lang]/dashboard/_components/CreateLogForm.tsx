"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"

import HeroImageUploader from "./HeroImageUploader"
import CoffeeBeansInfoForm, { OriginSuggestion } from "./CoffeeBeansInfoForm"
import BrewRecipeForm from "./BrewRecipeForm"
import TasteTagsForm from "./TasteTagsForm"

type Props = { 
  onLogCreated: () => void 
  lang?: string
  formLanguage?: "ja" | "en"
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

// ✨ followers から members に変更
type VisibilityType = "draft" | "private" | "members" | "public"

const logFormDict = {
  ja: {
    mainTitle: "TASTING & RECIPE",
    mainDesc: "テイスティング / 抽出レシピの記録",
    imageRequiredError: "画像のアップロードは必須です。",
    submitting: "処理中...",
    submitButton: "投稿する",
    labelVisibility: "公開設定",
    statusDraft: "下書き",
    statusPrivate: "非公開 (自分のみ)",
    statusMembers: "限定公開 (会員のみ)", // ✨ 変更
    statusPublic: "公開 (全員に公開)",
    loginRequired: "ログインしてください",
    successMessage: "投稿しました。",
    errorMessage: "エラーが発生しました。"
  },
  en: {
    mainTitle: "TASTING & RECIPE",
    mainDesc: "Tasting / Brewing Recipe Log",
    imageRequiredError: "Image upload is required.",
    submitting: "Processing...",
    submitButton: "Post",
    labelVisibility: "Visibility",
    statusDraft: "Draft",
    statusPrivate: "Private (Just me)",
    statusMembers: "Members Only", // ✨ 変更
    statusPublic: "Public (Everyone)",
    loginRequired: "Please log in",
    successMessage: "Successfully posted.",
    errorMessage: "An error occurred."
  }
}

export default function CreateLogForm({ onLogCreated, lang, formLanguage }: Props) {
  const currentLang = (lang === "en" || formLanguage === "en") ? "en" : "ja"
  const t = logFormDict[currentLang]

  const [title, setTitle] = useState("")
  const [tastes, setTastes] = useState("")
  const [description, setDescription] = useState("")
  
  const [beanData, setBeanData] = useState({
    source: "",
    market: "",
    variety: "", 
    process: ""  
  })

  const [selectedSource, setSelectedSource] = useState<OriginSuggestion | null>(null)
  const [selectedMarket, setSelectedMarket] = useState<OriginSuggestion | null>(null)

  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [visibility, setVisibility] = useState<VisibilityType>("draft")
  
  const [recipeState, setRecipeState] = useState({
    recipeMode: "self" as "self" | "barista" | "none",
    selfRecipe: { 
      dripper: "Hario V60", 
      waterTemp: "", 
      grindSize: "", 
      ratio: "" 
    },
    baristaRecipe: { baristaName: "", shopName: "", shopOriginId: null as number | null },
    recipeNotes: ""
  })
  
  const [selectedTasteIds, setSelectedTasteIds] = useState<string[]>([])
  const [selectedGearIds, setSelectedGearIds] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const adminEmail = "rivu65622252@gmail.com" 
        setIsAdmin(user.email === adminEmail)
      }
    }
    checkUserRole()
    return () => setStatusMessage(null)
  }, [])

  const handleRecipeChange = useCallback((updatedRecipes: any[]) => {
    if (!updatedRecipes || updatedRecipes.length === 0) return
    const r = updatedRecipes[0]
    setSelectedGearIds(Array.from(new Set(
      (r.equipments || []).map((item: any) => item.gearId).filter((id: unknown): id is number => typeof id === "number")
    )))

    setRecipeState((prev) => {
      const isModeChanged = prev.recipeMode !== r.mode

      const isSelfDataChanged = prev.recipeMode === "self" && (
        String(prev.selfRecipe.waterTemp) !== String(r.waterTemp || "") ||
        String(prev.selfRecipe.grindSize) !== String(r.grindSize || "") ||
        String(prev.selfRecipe.ratio) !== String(r.ratio || "") ||
        String(prev.recipeNotes) !== String(r.notes || "")
      )

      const isBaristaDataChanged = prev.recipeMode === "barista" && (
        String(prev.baristaRecipe.baristaName) !== String(r.baristaName || "") ||
        String(prev.baristaRecipe.shopName) !== String(r.shopName || "") ||
        prev.baristaRecipe.shopOriginId !== (r.shopOriginId || null) ||
        String(prev.recipeNotes) !== String(r.notes || "")
      )

      const isNoneDataChanged = prev.recipeMode === "none" && (
        String(prev.recipeNotes) !== String(r.notes || "")
      )

      if (isModeChanged || isSelfDataChanged || isBaristaDataChanged || isNoneDataChanged) {
        return {
          recipeMode: r.mode,
          selfRecipe: {
            dripper: "Hario V60",
            waterTemp: r.waterTemp || "",
            grindSize: r.grindSize || "",
            ratio: r.ratio || "" 
          },
          baristaRecipe: {
            baristaName: r.baristaName || "",
            shopName: r.shopName || "",
            shopOriginId: r.shopOriginId || null
          },
          recipeNotes: r.notes || ""
        }
      }
      return prev
    })
  }, [])

  const getOrCreateOriginId = async (
    selectedItem: OriginSuggestion | null,
    inputText: string,
    type: "source" | "market"
  ): Promise<number | null> => {
    if (selectedItem) return selectedItem.id
    
    const cleanedInput = inputText.trim()
    if (!cleanedInput) return null

    const nameColumn = currentLang === "en" ? "name" : "name_ja"
    const { data: existing } = await supabase
      .from("origins")
      .select("id")
      .eq("type", type)
      .eq(nameColumn, cleanedInput)
      .limit(1)

    if (existing && existing.length > 0) {
      return existing[0].id
    }

    const generatedSlug = `${type}-${crypto.randomUUID().slice(0, 8)}`
    const { data: newOrigin, error } = await supabase
      .from("origins")
      .insert({
        slug: generatedSlug,
        name: currentLang === "en" ? cleanedInput : cleanedInput,
        name_ja: currentLang === "ja" ? cleanedInput : cleanedInput,
        type: type,
        search_keywords: cleanedInput,
      })
      .select("id")
      .single()

    if (error) {
      console.error(`Failed to automatically create ${type}:`, error)
      throw error
    }

    return newOrigin ? newOrigin.id : null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!title.trim()) return
    if (imageUrls.length === 0) {
      setStatusMessage({ text: t.imageRequiredError, type: "error" })
      return
    }
    
    setSubmitting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatusMessage({ text: t.loginRequired, type: "error" })
      setSubmitting(false)
      return
    }

    try {
      const finalSourceId = await getOrCreateOriginId(selectedSource, beanData.source, "source")
      const finalMarketId = await getOrCreateOriginId(selectedMarket, beanData.market, "market")

      let recipeObj: any = { mode: recipeState.recipeMode, gearIds: selectedGearIds }

      if (recipeState.recipeMode === "self") {
        recipeObj = {
          ...recipeObj,
          dripper: recipeState.selfRecipe.dripper.trim(),
          waterTemp: recipeState.selfRecipe.waterTemp ? String(recipeState.selfRecipe.waterTemp) : "",
          grindSize: recipeState.selfRecipe.grindSize.trim(),
          ratio: recipeState.selfRecipe.ratio.trim(),
          tdsInput: "", 
          bloomTime: "",
          totalTime: "",
          notes: recipeState.recipeNotes.trim()
        }
      } else if (recipeState.recipeMode === "barista") {
        recipeObj = {
          ...recipeObj,
          baristaName: recipeState.baristaRecipe.baristaName.trim(),
          shopName: recipeState.baristaRecipe.shopName.trim(),
          shopOriginId: recipeState.baristaRecipe.shopOriginId,
          servingStyle: "",
          notes: recipeState.recipeNotes.trim()
        }
      } else {
        recipeObj = { mode: "none" }
      }

      const { createPost } = await import("@/app/actions/createPost")

      await createPost({
        title: title.trim(),
        source_origin_id: finalSourceId,
        market_origin_id: finalMarketId, 
        variety_id: beanData.variety.trim() || null, 
        process_id: beanData.process.trim() || null,
        tastes: tastes.trim(),
        description: description.trim() || null,
        flavor_tags: selectedTasteIds,
        recipe_data: [recipeObj], 
        imageUrls: imageUrls,
        visibility: visibility,
        lang: currentLang
      }, user.id)
      
      setStatusMessage({ text: t.successMessage, type: "success" })

      setTimeout(() => {
        setStatusMessage(null)
      }, 4000)
      
      setTitle("")
      setTastes("")
      setDescription("")
      setSelectedTasteIds([])
      setSelectedGearIds([])
      setImageUrls([])
      setVisibility("draft")
      
      setBeanData({
        source: "",
        market: "",
        variety: "",
        process: ""
      })
      setSelectedSource(null)
      setSelectedMarket(null)
      
      setRecipeState({
        recipeMode: "self",
        selfRecipe: { 
          dripper: "Hario V60", 
          waterTemp: "", 
          grindSize: "", 
          ratio: "" 
        },
        baristaRecipe: { baristaName: "", shopName: "", shopOriginId: null },
        recipeNotes: ""
      })
      
      onLogCreated()
    } catch (err: any) {
      console.error("Form submit error:", err)
      setStatusMessage({ text: err?.message || t.errorMessage, type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white border border-neutral-200 p-6 sm:p-10 rounded-xl shadow-sm w-full max-w-5xl mx-auto">
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-wider text-neutral-900 uppercase">
          {t.mainTitle}
        </h2>
        <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-500">
          {t.mainDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 space-y-10">
        
        <HeroImageUploader 
          currentLang={currentLang} 
          initialImageUrls={imageUrls}
          onImagesChanged={setImageUrls} 
          isAdmin={isAdmin}
        />

        <div className="border-b border-neutral-100 pb-8">
          <CoffeeBeansInfoForm 
            currentLang={currentLang}
            title={title}
            onChangeTitle={setTitle}
            tastes={tastes}
            onChangeTastes={setTastes}
            description={description}
            onChangeDescription={setDescription}
            
            sourceInput={beanData.source}
            onChangeSourceInput={(val) => setBeanData(p => ({ ...p, source: val }))}
            selectedSource={selectedSource}
            onSelectSource={(item) => setSelectedSource(item)}
            
            marketInput={beanData.market}
            onChangeMarketInput={(val) => setBeanData(p => ({ ...p, market: val }))}
            selectedMarket={selectedMarket}
            onSelectMarket={(item) => setSelectedMarket(item)}
            
            variety={beanData.variety}
            onChangeVariety={(val) => setBeanData(p => ({ ...p, variety: val }))}
            process={beanData.process}
            onChangeProcess={(val) => setBeanData(p => ({ ...p, process: val }))}

            isAdmin={isAdmin}
          />
        </div>
        
        <BrewRecipeForm 
          currentLang={currentLang}
          initialRecipes={[{
            id: "new-recipe",
            mode: recipeState.recipeMode,
            equipments: [{ id: "1", name: "", gearId: null }],
            waterTemp: String(recipeState.selfRecipe.waterTemp),
            grindSize: String(recipeState.selfRecipe.grindSize),
            ratio: String(recipeState.selfRecipe.ratio), 
            tdsInput: "", 
            bloomTime: "",
            totalTime: "",
            pourSteps: [{ id: "1", amount: "", time: "" }],
            notes: String(recipeState.recipeNotes),
            baristaName: String(recipeState.baristaRecipe.baristaName),
            baristaUserId: "",
            shopName: String(recipeState.baristaRecipe.shopName),
            shopOriginId: recipeState.baristaRecipe.shopOriginId,
            servingStyle: ""
          }]}
          onChange={handleRecipeChange}
        />

        <TasteTagsForm 
          selectedIds={selectedTasteIds}
          onToggleTaste={(id) => setSelectedTasteIds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
          )}
          currentLang={currentLang}
        />

        {/* 公開設定セクション */}
        <div className="pt-4 border-t border-neutral-100 space-y-8">
          
          {statusMessage && (
            <div className={`text-sm p-4 rounded-xl border max-w-xl transition-all duration-300 ${
              statusMessage.type === "error" 
                ? "text-red-600 bg-red-50/40 border-red-200" 
                : "text-neutral-900 bg-neutral-50 border-neutral-200"
            }`}>
              {statusMessage.text}
            </div>
          )}

          <div className="space-y-3">
            <label className="text-[14px] font-bold text-neutral-900 tracking-wide block">
              {t.labelVisibility}
            </label>
            <div className="w-full overflow-x-auto no-scrollbar scroll-smooth -mx-2 px-2 py-1">
              <div className="flex flex-nowrap md:grid md:grid-cols-4 gap-3 min-w-max md:min-w-0">
                {/* ✨ followers から members へ配列を変更 */}
                {(["draft", "private", "members", "public"] as VisibilityType[]).map((type) => {
                  const labelMap = {
                    draft: t.statusDraft,
                    private: t.statusPrivate,
                    members: t.statusMembers, // ✨ 変更
                    public: t.statusPublic,
                  }
                  const isSelected = visibility === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setVisibility(type)
                      }}
                      className={`whitespace-nowrap px-2 py-3.5 text-[12px] sm:text-[13px] font-semibold rounded-xl border text-center transition-all duration-200 select-none flex-1 min-w-[145px] md:min-w-0 ${
                        isSelected
                          ? "bg-white border-neutral-900 text-neutral-900 shadow-sm ring-1 ring-neutral-900"
                          : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/50"
                      }`}
                    >
                      {labelMap[type]}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button 
              type="submit" 
              disabled={submitting || imageUrls.length === 0} 
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-900 text-white border border-transparent px-10 py-3.5 rounded-full text-sm font-medium tracking-wider transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? t.submitting : t.submitButton}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}
