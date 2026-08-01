"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"

import HeroImageUploader from "./HeroImageUploader"
import CoffeeBeansInfoForm, { OriginSuggestion } from "./CoffeeBeansInfoForm"
import BrewRecipeForm, { RecipeItemData } from "./BrewRecipeForm"
import TasteTagsForm from "./TasteTagsForm"
import { useAppPopup } from "@/context/AppPopupContext"

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
    statusMembers: "限定公開（ログインユーザーのみ）",
    statusPublic: "公開 (全員に公開)",
    loginRequired: "ログインしてください",
    successMessage: "投稿しました。",
    errorMessage: "エラーが発生しました。",
    coffeeInfoRequired: "COFFEE INFOの必須項目をすべて入力してください。",
    coffeeInfoRequiredTitle: "基本情報を確認してください",
    recipeInputRequired: "「自分で抽出」または「他の人が抽出 / 提供」を選んだレシピは、少なくとも1つの項目を入力してください。",
    recipeInputRequiredTitle: "レシピ内容を確認してください"
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
    statusMembers: "Signed-in Users Only",
    statusPublic: "Public (Everyone)",
    loginRequired: "Please log in",
    successMessage: "Successfully posted.",
    errorMessage: "An error occurred.",
    coffeeInfoRequired: "Complete all required fields in COFFEE INFO.",
    coffeeInfoRequiredTitle: "Check the basic information",
    recipeInputRequired: "For each self-brewed or externally prepared recipe, enter at least one item.",
    recipeInputRequiredTitle: "Check the recipe details"
  }
}

export default function CreateLogForm({ onLogCreated, lang, formLanguage }: Props) {
  const currentLang = (lang === "en" || formLanguage === "en") ? "en" : "ja"
  const t = logFormDict[currentLang]
  const { showPopup } = useAppPopup()
  const router = useRouter()

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
      ratio: "",
      tdsInput: "",
      bloomTime: "",
      totalTime: "",
      pourSteps: [{ id: "1", amount: "", time: "" }]
    },
    baristaRecipe: {
      baristaName: "",
      baristaUserId: "",
      baristaUsername: "",
      shopName: "",
      shopOriginId: null as number | null,
      servingStyle: ""
    },
    recipeNotes: ""
  })
  const [recipeItems, setRecipeItems] = useState<RecipeItemData[]>([])
  const [recipeFormResetKey, setRecipeFormResetKey] = useState(0)
  
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
    setRecipeItems(updatedRecipes as RecipeItemData[])
    const r = updatedRecipes[0]
    setSelectedGearIds(Array.from(new Set(
      updatedRecipes
        .flatMap((recipe: any) => recipe.equipments || [])
        .map((item: any) => item.gearId)
        .filter((id: unknown): id is number => typeof id === "number")
    )))

    setRecipeState({
      recipeMode: r.mode,
      selfRecipe: {
        dripper: "Hario V60",
        waterTemp: r.waterTemp || "",
        grindSize: r.grindSize || "",
        ratio: r.ratio || "",
        tdsInput: r.tdsInput || "",
        bloomTime: r.bloomTime || "",
        totalTime: r.totalTime || "",
        pourSteps: Array.isArray(r.pourSteps) ? r.pourSteps : []
      },
      baristaRecipe: {
        baristaName: r.baristaName || "",
        baristaUserId: r.baristaUserId || "",
        baristaUsername: r.baristaUsername || "",
        shopName: r.shopName || "",
        shopOriginId: r.shopOriginId || null,
        servingStyle: r.servingStyle || ""
      },
      recipeNotes: r.notes || ""
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

    const hasRequiredCoffeeInfo = Boolean(
      title.trim() &&
      tastes.trim()
    )
    if (!hasRequiredCoffeeInfo) {
      showPopup(t.coffeeInfoRequired, "error", t.coffeeInfoRequiredTitle)
      document.getElementById("coffee-info-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

    const recipeHasAnyInput = (recipe: RecipeItemData) => {
      if (recipe.mode === "none") return true

      const hasEquipment = (recipe.equipments || []).some(
        equipment => equipment.gearId !== null || equipment.name.trim()
      )
      const hasNotes = Boolean(recipe.notes.trim())

      if (recipe.mode === "self") {
        return Boolean(
          hasEquipment ||
          recipe.waterTemp.trim() ||
          recipe.grindSize.trim() ||
          recipe.ratio.trim() ||
          recipe.tdsInput.trim() ||
          recipe.bloomTime.trim() ||
          recipe.totalTime.trim() ||
          recipe.pourSteps.some(step => step.amount.trim() || step.time.trim()) ||
          hasNotes
        )
      }

      return Boolean(
        hasEquipment ||
        recipe.baristaName.trim() ||
        recipe.baristaUserId ||
        recipe.shopName.trim() ||
        recipe.shopOriginId ||
        recipe.servingStyle.trim() ||
        hasNotes
      )
    }

    if (recipeItems.some(recipe => !recipeHasAnyInput(recipe))) {
      showPopup(t.recipeInputRequired, "error", t.recipeInputRequiredTitle)
      document.getElementById("brew-recipe-section")?.scrollIntoView({ behavior: "smooth", block: "start" })
      return
    }

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

      const recipePayloads = recipeItems.map((recipe) => ({
        mode: recipe.mode,
        gearIds: (recipe.equipments || [])
          .map((item) => item.gearId)
          .filter((id): id is number => typeof id === "number"),
        waterTemp: recipe.waterTemp.trim(),
        grindSize: recipe.grindSize.trim(),
        ratio: recipe.ratio.trim(),
        tdsInput: recipe.tdsInput.trim(),
        bloomTime: recipe.bloomTime.trim(),
        totalTime: recipe.totalTime.trim(),
        pourSteps: recipe.pourSteps,
        notes: recipe.notes.trim(),
        baristaName: recipe.baristaName.trim(),
        baristaUserId: recipe.baristaUserId,
        shopName: recipe.shopName.trim(),
        shopOriginId: recipe.shopOriginId || null,
        servingStyle: recipe.servingStyle.trim(),
      }))

      const { createPost } = await import("@/app/actions/createPost")

      const createdPost = await createPost({
        title: title.trim(),
        source_origin_id: finalSourceId,
        market_origin_id: finalMarketId, 
        variety_id: beanData.variety.trim() || null, 
        process_id: beanData.process.trim() || null,
        tastes: tastes.trim(),
        description: description.trim() || null,
        flavor_tags: selectedTasteIds,
        recipe_data: recipePayloads,
        imageUrls: imageUrls,
        visibility: visibility,
        lang: currentLang
      }, user.id)

      const originIds = [finalMarketId, finalSourceId].filter(
        (originId): originId is number => Number.isInteger(originId)
      )
      const { data: originRows } = originIds.length > 0
        ? await supabase.from("origins").select("id, slug").in("id", originIds)
        : { data: [] }
      const originSlugMap = new Map((originRows || []).map(origin => [origin.id, origin.slug]))
      const postSegments = [
        finalMarketId ? originSlugMap.get(finalMarketId) : null,
        finalSourceId ? originSlugMap.get(finalSourceId) : null,
        createdPost.id,
      ].filter((segment): segment is string => Boolean(segment))
      const postUrl = `/${currentLang}/posts/${postSegments.map(encodeURIComponent).join("/")}`
      
      setStatusMessage({ text: t.successMessage, type: "success" })

      setTimeout(() => {
        setStatusMessage(null)
      }, 4000)
      
      setTitle("")
      setTastes("")
      setDescription("")
      setSelectedTasteIds([])
      setSelectedGearIds([])
      setRecipeItems([])
      setRecipeFormResetKey((current) => current + 1)
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
          ratio: "",
          tdsInput: "",
          bloomTime: "",
          totalTime: "",
          pourSteps: [{ id: "1", amount: "", time: "" }]
        },
        baristaRecipe: {
          baristaName: "",
          baristaUserId: "",
          baristaUsername: "",
          shopName: "",
          shopOriginId: null,
          servingStyle: ""
        },
        recipeNotes: ""
      })
      
      onLogCreated()
      router.push(postUrl)
    } catch (err: any) {
      console.error("Form submit error:", err)
      setStatusMessage({ text: err?.message || t.errorMessage, type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  const preventImplicitSubmit = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key !== "Enter") return

    const target = e.target as HTMLElement
    // Enter is reserved for new lines in textareas and for activating the
    // explicit submit button. In ordinary inputs it must never submit the
    // complete tasting form (including during Japanese IME conversion).
    if (target.tagName === "INPUT" || target.isContentEditable) {
      e.preventDefault()
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-wider text-neutral-900 uppercase">
          {t.mainTitle}
        </h2>
        <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-500">
          {t.mainDesc}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        onKeyDownCapture={preventImplicitSubmit}
        className="mt-10 space-y-10"
      >
        
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
          key={recipeFormResetKey}
          currentLang={currentLang}
          initialRecipes={[{
            id: "new-recipe",
            mode: recipeState.recipeMode,
            equipments: [{ id: "1", name: "", gearId: null }],
            waterTemp: String(recipeState.selfRecipe.waterTemp),
            grindSize: String(recipeState.selfRecipe.grindSize),
            ratio: String(recipeState.selfRecipe.ratio), 
            tdsInput: String(recipeState.selfRecipe.tdsInput),
            bloomTime: String(recipeState.selfRecipe.bloomTime),
            totalTime: String(recipeState.selfRecipe.totalTime),
            pourSteps: recipeState.selfRecipe.pourSteps,
            notes: String(recipeState.recipeNotes),
            baristaName: String(recipeState.baristaRecipe.baristaName),
            baristaUserId: String(recipeState.baristaRecipe.baristaUserId),
            baristaUsername: String(recipeState.baristaRecipe.baristaUsername),
            shopName: String(recipeState.baristaRecipe.shopName),
            shopOriginId: recipeState.baristaRecipe.shopOriginId,
            servingStyle: String(recipeState.baristaRecipe.servingStyle)
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
              className="w-full rounded-xl border border-transparent bg-neutral-950 px-10 py-3.5 text-sm font-medium tracking-wider text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-900 hover:shadow-md active:scale-[0.98] disabled:opacity-50 sm:w-auto"
            >
              {submitting ? t.submitting : t.submitButton}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}
