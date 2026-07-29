"use client"

import { useState, useEffect, useRef } from "react"
import RecipeItemForm from "./RecipeItemForm"
import { supabase } from "@/lib/supabase"
import { useAppPopup } from "@/context/AppPopupContext"

export type RecipeMode = "self" | "barista" | "none"

export type PourStep = {
  id: string
  amount: string
  time: string
}

export type EquipmentItem = {
  id: string
  name: string
  gearId: number | null
}

export type GearMasterItem = {
  id: number
  name: string
  name_ja: string | null
  brand: string | null
  brand_ja: string | null
  search_keywords: string | null
}

export type RecipeItemData = {
  id: string
  mode: RecipeMode
  equipments: EquipmentItem[]
  waterTemp: string
  grindSize: string
  ratio: string
  tdsInput: string
  bloomTime: string
  totalTime: string
  pourSteps: PourStep[]
  notes: string
  baristaName: string
  baristaUserId: string // 💡 選択されたエキスパートの user_id
  baristaUsername?: string // 💡 選択されたエキスパートの URL スラッグ (username)
  shopName: string
  shopOriginId?: number | null
  servingStyle: string
}

type SavedRecipeTemplate = RecipeItemData & {
  templateName: string
}

type Props = {
  currentLang: "ja" | "en"
  onChange?: (recipes: RecipeItemData[]) => void
  initialRecipes?: RecipeItemData[]
  syncInitialRecipes?: boolean
  allowRemoveLast?: boolean
  gears?: GearMasterItem[]
  mode?: "self" | "barista" | "none"
  onChangeMode?: (mode: "self" | "barista" | "none") => void
}

export default function BrewRecipeForm({
  currentLang,
  onChange,
  initialRecipes,
  syncInitialRecipes = false,
  allowRemoveLast = false,
  gears
}: Props) {
  const { showPopup } = useAppPopup()
  const [templates, setTemplates] = useState<SavedRecipeTemplate[]>([])
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null)

  const [recipes, setRecipes] = useState<RecipeItemData[]>(() => {
    if (initialRecipes && initialRecipes.length > 0) return initialRecipes
    return [{
      id: String(Date.now()),
      mode: "self",
      equipments: [{ id: "1", name: "", gearId: null }],
      waterTemp: "",
      grindSize: "",
      ratio: "", 
      tdsInput: "", 
      bloomTime: "",
      totalTime: "",
      pourSteps: [{ id: "1", amount: "", time: "" }],
      notes: "",
      baristaName: "",
      baristaUserId: "",
      baristaUsername: "",
      shopName: "",
      shopOriginId: null,
      servingStyle: ""
    }]
  })

  const [gearOptions, setGearOptions] = useState<GearMasterItem[]>(gears || [])
  const initialRecipesSignature = JSON.stringify(initialRecipes || [])
  const lastSyncedInitialSignatureRef = useRef(initialRecipesSignature)
  const isHydratingInitialRecipesRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    const fetchTemplates = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) return

      const { data, error } = await supabase
        .from("recipes")
        .select(`
          id,
          template_title,
          mode,
          temperature,
          grind_size,
          brew_ratio,
          tds,
          bloom_time_seconds,
          total_time_seconds,
          gears,
          pour_steps,
          notes,
          barista_user_id,
          shop_name,
          shop_origin_id,
          serving_style
        `)
        .eq("user_id", user.id)
        .eq("is_template", true)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Recipe template fetch error:", error)
        return
      }
      if (cancelled) return

      setTemplates((data || []).map((row: any) => ({
        id: row.id,
        templateName: row.template_title || (currentLang === "en" ? "My Recipe" : "マイレシピ"),
        mode: row.mode === "barista" ? "barista" : "self",
        equipments: Array.isArray(row.gears) && row.gears.length > 0
          ? row.gears.map((name: unknown, index: number) => ({
              id: String(index + 1),
              name: String(name || ""),
              gearId: null,
            }))
          : [{ id: "1", name: "", gearId: null }],
        waterTemp: row.temperature != null ? String(row.temperature) : "",
        grindSize: row.grind_size || "",
        ratio: row.brew_ratio != null ? String(row.brew_ratio) : "",
        tdsInput: row.tds != null ? String(row.tds) : "",
        bloomTime: row.bloom_time_seconds != null ? String(row.bloom_time_seconds) : "",
        totalTime: row.total_time_seconds != null ? String(row.total_time_seconds) : "",
        pourSteps: Array.isArray(row.pour_steps) && row.pour_steps.length > 0
          ? row.pour_steps.map((step: any, index: number) => ({
              id: String(step.id || index + 1),
              amount: String(step.amount || ""),
              time: String(step.time || ""),
            }))
          : [{ id: "1", amount: "", time: "" }],
        notes: row.notes || "",
        baristaName: "",
        baristaUserId: row.barista_user_id || "",
        baristaUsername: "",
        shopName: row.shop_name || "",
        shopOriginId: row.shop_origin_id || null,
        servingStyle: row.serving_style || "",
      })))
    }

    void fetchTemplates()
    return () => {
      cancelled = true
    }
  }, [currentLang])

  useEffect(() => {
    if (!syncInitialRecipes || !initialRecipes?.length) return
    if (lastSyncedInitialSignatureRef.current === initialRecipesSignature) return

    lastSyncedInitialSignatureRef.current = initialRecipesSignature
    setRecipes(current => {
      if (JSON.stringify(current) === initialRecipesSignature) {
        isHydratingInitialRecipesRef.current = false
        return current
      }
      isHydratingInitialRecipesRef.current = true
      return initialRecipes
    })
  }, [initialRecipesSignature, syncInitialRecipes])

  useEffect(() => {
    if (gears) {
      setGearOptions(gears)
      return
    }

    const fetchGears = async () => {
      const { data, error } = await supabase
        .from("gears")
        .select("id, name, name_ja, brand, brand_ja, search_keywords")
        .order("brand", { ascending: true })
        .order("name", { ascending: true })

      if (!error && data) setGearOptions(data as GearMasterItem[])
    }
    fetchGears()
  }, [gears])

  useEffect(() => {
    if (!onChange) return

    // Only suppress the stale form value while DB rows are being hydrated.
    // User edits and removals must always flow back to the edit page.
    if (isHydratingInitialRecipesRef.current) {
      if (JSON.stringify(recipes) === initialRecipesSignature) {
        isHydratingInitialRecipesRef.current = false
      } else {
        return
      }
    }

    if (
      syncInitialRecipes &&
      lastSyncedInitialSignatureRef.current !== initialRecipesSignature
    ) {
      return
    }

    // "none" is also a meaningful selection. The parent needs it to avoid
    // accidentally saving the previously selected recipe mode.
    onChange(recipes)
  }, [recipes, onChange, initialRecipesSignature, syncInitialRecipes])

  const t = {
    ja: {
      title: "BREW RECIPE & RECORD",
      subTitle: "抽出・提供の記録",
      labelSelf: "自分で抽出",
      labelBarista: "他の人が抽出 / 提供",
      labelNone: "記録なし",
      labelDripper: "Equipment",
      descDripper: "ドリッパーやグラインダー、フィルターなどの器具を追加してください",
      placeholderDripper: "Hario V60, コマンダンテなど",
      addEquipment: "+ 器具を追加",
      labelWaterTemp: "Temperature",
      descWaterTemp: "抽出時の湯温（°C）",
      placeholderWaterTemp: "92",
      labelGrindSize: "Grind Size",
      descGrindSize: "挽き目・粒度",
      placeholderGrindSize: "中挽き、24クリックなど",
      labelRatio: "Brew Ratio (BR)",
      descRatio: "抽出比率（豆1gに対して注ぐ湯量、1:15なら「15」）",
      placeholderRatio: "15",
      labelTds: "Total Dissolved Solids (TDS)",
      descTds: "総溶解固形分（濃度 %）※TDSメーターでの測定値",
      placeholderTds: "1.30",
      labelEyCard: "Extraction Yield (EY) 計算結果",
      formulaTitle: "【計算式】",
      formulaApprox: "近似値 = TDS × BR",
      formulaCorrected: "補正値 = TDS × BR / (1 − TDS)",
      labelBloomTime: "Bloom Time",
      descBloomTime: "蒸らし時間を入力してください",
      placeholderBloomTime: "例: 30秒, 45秒など",
      labelTotalTime: "Total Time",
      descTotalTime: "全体の抽出時間またはプレス時間",
      placeholderTotalTime: "2分30秒, 1分15秒等",
      labelPourSteps: "Pour / Process Steps",
      descPourSteps: "注湯回数や工程の記録（ドリップの注湯量、エアロプレスの工程など）",
      placeholderAmount: "量 (例: 60ml / 9bar)",
      placeholderTime: "時間 (例: 0:00)",
      addStep: "+ ステップを追加",
      labelBaristaName: "Provider",
      descBaristaName: "提供者の名前",
      placeholderBaristaName: "名前を入力して登録ユーザーから選択...",
      descBaristaPrivacy: "※公開されている登録アカウントから検索・選択できます。",
      labelShopName: "Shop",
      descShopName: "ロースターを選択してください",
      placeholderShopName: "ロースターで検索",
      labelServingStyle: "Serving Style",
      descServingStyle: "提供形態やメニューを入力してください",
      placeholderServingStyle: "例: ハンドドリップ, カフェラテ, エスプレッソ, プアオーバーなど",
      labelNotes: "Notes",
      descNotesSelf: "抽出手順や詳細なメモ",
      placeholderNotesSelf: "60ccを4回に分けて注湯など自由に記述できます",
      descNotesBarista: "印象やコメント",
      placeholderNotesBarista: "サーブされた時の印象や、提供者から聞いたレシピのメモなどを入力してください",
      noneMessage: "※レシピ情報なしで記録します。このレシピは投稿ページには表示されません。",
      addRecipe: "+ レシピを追加 (最大5つまで)",
      removeRecipe: "削除",
      saveTemplate: "テンプレートとして保存",
      loadTemplate: "テンプレートから追加",
      numberWarning: "半角数字で入力してください",
      templatePlaceholder: "テンプレート名を入力",
      save: "保存",
      cancel: "キャンセル",
      maxLimitWarning: "レシピは最大5つまでしか登録できません。"
    },
    en: {
      title: "BREW RECIPE & RECORD",
      subTitle: "Brewing & Serving Record",
      labelSelf: "Brewed by Self",
      labelBarista: "Prepared / Served by Someone Else",
      labelNone: "No Record",
      labelDripper: "Equipment",
      descDripper: "Add equipment such as drippers, grinders, filters, etc.",
      placeholderDripper: "e.g., Hario V60, Comandante...",
      addEquipment: "+ Add equipment",
      labelWaterTemp: "Temperature",
      descWaterTemp: "Water temperature used for brewing (°C)",
      placeholderWaterTemp: "92",
      labelGrindSize: "Grind Size",
      descGrindSize: "Grind size or setting",
      placeholderGrindSize: "Medium, 24 clicks, etc.",
      labelRatio: "Brew Ratio (BR)",
      descRatio: "Brew ratio (e.g., enter '15' for a 1:15 ratio)",
      placeholderRatio: "15",
      labelTds: "Total Dissolved Solids (TDS)",
      descTds: "Total Dissolved Solids (%)\n*Measured by refractometer",
      placeholderTds: "1.30",
      labelEyCard: "Extraction Yield (EY) Results",
      formulaTitle: "【Formulas】",
      formulaApprox: "Approx = TDS × BR",
      formulaCorrected: "Corrected = TDS × BR / (1 − TDS)",
      labelBloomTime: "Bloom Time",
      descBloomTime: "Please enter the pre-infusion / bloom time",
      placeholderBloomTime: "e.g., 30s, 45s, etc.",
      labelTotalTime: "Total Time",
      descTotalTime: "Total brewing time or pressing time",
      placeholderTotalTime: "e.g., 2m 30s, 1m 15s, etc.",
      labelPourSteps: "Pour / Process Steps",
      descPourSteps: "Record of pours or process stages (e.g., pour amounts, aero press stages)",
      placeholderAmount: "Amt (e.g., 60ml / 9bar)",
      placeholderTime: "Time (e.g., 0:00)",
      addStep: "+ Add a step",
      labelBaristaName: "Provider",
      descBaristaName: "Name of the person who prepared or served your coffee",
      placeholderBaristaName: "Type name to search verified users...",
      descBaristaPrivacy: "*You can search and select from publicly listed accounts.",
      labelShopName: "Shop",
      descShopName: "Shop Name (Provider)",
      placeholderShopName: "Please enter the shop name",
      labelServingStyle: "Serving Style",
      descServingStyle: "Please enter the serving style or menu item",
      placeholderServingStyle: "e.g., Hand Drip, Cafe Latte, Espresso, Pour Over, etc.",
      labelNotes: "Notes",
      descNotesSelf: "Brew procedures and detailed notes",
      placeholderNotesSelf: "Describe your pour sequence, timing, agitation, and other brewing details.",
      descNotesBarista: "Serving impressions and comments from the provider",
      placeholderNotesBarista: "Enter your first impressions when served or any recipe details shared by the provider",
      noneMessage: "* Record without recipe information. This recipe will not be displayed on the post page.",
      addRecipe: "+ Add Recipe (Max 5)",
      removeRecipe: "Remove",
      saveTemplate: "Save as Template",
      loadTemplate: "Load Template",
      numberWarning: "Please enter using half-width numbers",
      templatePlaceholder: "Template name",
      save: "Save",
      cancel: "Cancel",
      maxLimitWarning: "You can add up to 5 recipes."
    }
  }[currentLang]

  const updateRecipe = (id: string, updatedFields: Partial<RecipeItemData>) => {
    setRecipes(prev => prev.map(r => (r.id === id ? { ...r, ...updatedFields } : r)))
  }

  const handleRemoveRecipe = (id: string) => {
    if (recipes.length === 1) {
      if (!allowRemoveLast) return
      setRecipes([{
        id: `no-recipe-${Date.now()}`,
        mode: "none",
        equipments: [{ id: "1", name: "", gearId: null }],
        waterTemp: "",
        grindSize: "",
        ratio: "",
        tdsInput: "",
        bloomTime: "",
        totalTime: "",
        pourSteps: [{ id: "1", amount: "", time: "" }],
        notes: "",
        baristaName: "",
        baristaUserId: "",
        baristaUsername: "",
        shopName: "",
        shopOriginId: null,
        servingStyle: ""
      }])
      return
    }
    setRecipes(recipes.filter(r => r.id !== id))
  }

  const handleSaveTemplate = async (recipe: RecipeItemData, templateName: string) => {
    const name = templateName.trim() || (currentLang === "en" ? "My Recipe" : "マイレシピ")
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showPopup(
        currentLang === "en" ? "Please sign in again." : "ログイン状態を確認できませんでした。再度ログインしてください。",
        "error"
      )
      return
    }

    const toSeconds = (value: string) => {
      const text = value.trim()
      if (!text) return null
      if (/^\d+(?:\.\d+)?$/.test(text)) return Math.round(Number(text))
      const colon = text.match(/^(\d+):(\d{1,2})$/)
      if (colon) return Number(colon[1]) * 60 + Number(colon[2])
      const minutes = text.match(/(\d+(?:\.\d+)?)\s*(?:分|min(?:ute)?s?)/i)
      const seconds = text.match(/(\d+(?:\.\d+)?)\s*(?:秒|sec(?:ond)?s?|s)\b/i)
      if (!minutes && !seconds) return null
      return Math.round(Number(minutes?.[1] || 0) * 60 + Number(seconds?.[1] || 0))
    }

    const { data, error } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        bean_name: name,
        template_title: name,
        is_template: true,
        mode: recipe.mode,
        sort_order: 0,
        temperature: recipe.waterTemp ? Number(recipe.waterTemp) || null : null,
        grind_size: recipe.grindSize.trim() || null,
        brew_ratio: recipe.ratio ? Number(recipe.ratio.replace(/[^0-9.]/g, "")) || null : null,
        tds: recipe.tdsInput ? Number(recipe.tdsInput) || null : null,
        bloom_time_seconds: toSeconds(recipe.bloomTime),
        total_time_seconds: toSeconds(recipe.totalTime),
        gears: recipe.equipments
          .map(equipment => equipment.name.trim())
          .filter(Boolean),
        pour_steps: recipe.pourSteps.filter(step => step.amount.trim() || step.time.trim()),
        notes: recipe.notes.trim() || null,
        barista_user_id: recipe.mode === "barista" ? recipe.baristaUserId || null : null,
        shop_name: recipe.mode === "barista" ? recipe.shopName.trim() || null : null,
        shop_origin_id: recipe.mode === "barista" ? recipe.shopOriginId || null : null,
        serving_style: recipe.mode === "barista" ? recipe.servingStyle.trim() || null : null,
      })
      .select("id")
      .single()

    if (error || !data) {
      console.error("Recipe template save error:", error)
      showPopup(
        currentLang === "en"
          ? `Could not save the template${error?.message ? `: ${error.message}` : "."}`
          : `テンプレートを保存できませんでした${error?.message ? `: ${error.message}` : "。"}`,
        "error"
      )
      return
    }

    setTemplates(current => [{
      ...recipe,
      id: data.id,
      templateName: name,
    }, ...current])
    showPopup(
      currentLang === "en" ? "Recipe template saved." : "レシピテンプレートを保存しました。",
      "success"
    )
  }

  const isBlankRecipe = (recipe: RecipeItemData) => (
    recipe.mode === "none" ||
    (
      recipe.equipments.every(equipment => !equipment.name.trim() && equipment.gearId === null) &&
      !recipe.waterTemp.trim() &&
      !recipe.grindSize.trim() &&
      !recipe.ratio.trim() &&
      !recipe.tdsInput.trim() &&
      !recipe.bloomTime.trim() &&
      !recipe.totalTime.trim() &&
      recipe.pourSteps.every(step => !step.amount.trim() && !step.time.trim()) &&
      !recipe.notes.trim() &&
      !recipe.baristaName.trim() &&
      !recipe.baristaUserId &&
      !recipe.shopName.trim() &&
      !recipe.shopOriginId &&
      !recipe.servingStyle.trim()
    )
  )

  const handleLoadTemplate = (template: SavedRecipeTemplate) => {
    const blankRecipeIndex = recipes.findIndex(isBlankRecipe)
    if (blankRecipeIndex < 0 && recipes.length >= 5) {
      showPopup(
        currentLang === "en" ? "You can save up to five recipes. Remove an existing recipe before adding another." : "登録できるレシピは最大5件です。既存のレシピを削除してから追加してください。",
        "info",
        currentLang === "en" ? "Recipe limit reached" : "登録上限に達しました"
      )
      return
    }
    const { templateName: _templateName, ...recipe } = template
    const loadedRecipe: RecipeItemData = {
      ...recipe,
      id: String(Date.now()),
      equipments: recipe.equipments.map((equipment, index) => ({
        ...equipment,
        id: `${Date.now()}-equipment-${index}`,
      })),
      pourSteps: recipe.pourSteps.map((step, index) => ({
        ...step,
        id: `${Date.now()}-step-${index}`,
      })),
    }

    if (blankRecipeIndex >= 0) {
      setRecipes(current => current.map((item, index) => (
        index === blankRecipeIndex ? loadedRecipe : item
      )))
    } else {
      setRecipes(current => [...current, loadedRecipe])
    }
    setShowTemplateDropdown(false)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      showPopup(
        currentLang === "en" ? "Please sign in again." : "ログイン状態を確認できませんでした。再度ログインしてください。",
        "error"
      )
      return
    }

    const { error } = await supabase
      .from("recipes")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id)
      .eq("is_template", true)

    if (error) {
      console.error("Recipe template delete error:", error)
      showPopup(
        currentLang === "en"
          ? `Could not delete the template: ${error.message}`
          : `テンプレートを削除できませんでした: ${error.message}`,
        "error"
      )
      return
    }

    setTemplates(current => current.filter(template => template.id !== templateId))
    setConfirmDeleteTemplateId(null)
    showPopup(
      currentLang === "en" ? "Recipe template deleted." : "レシピテンプレートを削除しました。",
      "success"
    )
  }

  const handleAddRecipe = () => {
    if (recipes.length >= 5) {
      showPopup(
        currentLang === "en" ? "You can save up to five recipes. Remove an existing recipe before adding another." : "登録できるレシピは最大5件です。既存のレシピを削除してから追加してください。",
        "info",
        currentLang === "en" ? "Recipe limit reached" : "登録上限に達しました"
      )
      return
    }

    const lastRecipeMode = recipes[recipes.length - 1]?.mode || "self"

    setRecipes([...recipes, {
      id: String(Date.now()),
      mode: lastRecipeMode,
      equipments: [{ id: "1", name: "", gearId: null }],
      waterTemp: "",
      grindSize: "",
      ratio: "", 
      tdsInput: "", 
      bloomTime: "",
      totalTime: "",
      pourSteps: [{ id: "1", amount: "", time: "" }],
      notes: "",
      baristaName: "",
      baristaUserId: "",
      baristaUsername: "",
      shopName: "",
      shopOriginId: null,
      servingStyle: ""
    }])
  }

  return (
    <div id="brew-recipe-section" className="space-y-8 scroll-mt-28">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-[15px] font-bold tracking-wider text-[#161616] uppercase">
            {t.title}
          </h2>
          <p className="mt-1 text-[13px] font-normal text-[#8e8e8e]">{t.subTitle}</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
            className="text-[13px] font-medium border border-[#e5e5e5] rounded-[10px] px-4 py-2 bg-white text-[#161616] hover:bg-neutral-50 transition-colors"
          >
            {t.loadTemplate}
          </button>
          {showTemplateDropdown && (
            <div className="absolute right-0 mt-2 w-64 bg-white border border-[#e5e5e5] rounded-[12px] shadow-lg z-50 p-2 space-y-1">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="flex items-center gap-1 rounded-[8px] hover:bg-neutral-50 transition-colors"
                >
                  {confirmDeleteTemplateId === tpl.id ? (
                    <div className="flex w-full items-center justify-between gap-2 px-2.5 py-2">
                      <span className="truncate text-[12px] text-[#555]">
                        {currentLang === "en" ? "Delete this template?" : "このテンプレートを削除しますか？"}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteTemplateId(null)}
                          className="text-[11px] text-[#777] hover:text-[#161616]"
                        >
                          {currentLang === "en" ? "Cancel" : "戻る"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteTemplate(tpl.id)}
                          className="text-[11px] font-medium text-red-500 hover:text-red-600"
                        >
                          {currentLang === "en" ? "Delete" : "削除"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleLoadTemplate(tpl)}
                        className="min-w-0 flex-1 truncate px-2.5 py-2.5 text-left text-[13px] text-[#161616]"
                      >
                        {tpl.templateName}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteTemplateId(tpl.id)}
                        className="shrink-0 px-2.5 py-2.5 text-[11px] text-[#999] hover:text-red-500"
                        aria-label={currentLang === "en" ? `Delete ${tpl.templateName}` : `${tpl.templateName}を削除`}
                      >
                        {currentLang === "en" ? "Delete" : "削除"}
                      </button>
                    </>
                  )}
                </div>
              ))}
              {templates.length === 0 && (
                <div className="text-[12px] text-[#8e8e8e] p-3 text-center">
                  {currentLang === "en" ? "No saved templates." : "保存されたテンプレートはありません"}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {recipes.map((recipe, index) => (
        <RecipeItemForm
          key={recipe.id}
          recipe={recipe}
          index={index}
          currentLang={currentLang}
          t={t}
          gears={gearOptions}
          allowRemove={recipes.length > 1 || (allowRemoveLast && recipe.mode !== "none")}
          onUpdate={updateRecipe}
          onRemove={handleRemoveRecipe}
          onSaveTemplate={handleSaveTemplate}
        />
      ))}

      <div className="pt-2">
        {recipes.length < 5 ? (
          <button
            type="button"
            onClick={handleAddRecipe}
            className="w-full text-[14px] font-semibold border-2 border-dashed border-[#e5e5e5] rounded-[14px] py-4 bg-white text-[#161616] hover:bg-neutral-50 hover:border-[#b5b5b5] transition-all text-center"
          >
            {t.addRecipe}
          </button>
        ) : (
          <div className="w-full text-[13px] text-neutral-400 font-normal border-2 border-dashed border-neutral-200 rounded-[14px] py-4 bg-neutral-50/50 text-center">
            {currentLang === "ja" ? "これ以上レシピを追加できません（最大5件）" : "Maximum of 5 recipes reached."}
          </div>
        )}
      </div>
    </div>
  )
}
