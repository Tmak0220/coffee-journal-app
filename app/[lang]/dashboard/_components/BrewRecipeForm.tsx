"use client"

import { useState, useEffect } from "react"
import RecipeItemForm from "./RecipeItemForm"
import { supabase } from "@/lib/supabase" // 💡 追加: バリスタ検索用
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

// 💡 データベースと連携できるよう baristaUserId を追加
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
  baristaUserId: string // 💡 追加: 選択されたエキスパートの user_id を保持する
  shopName: string
  shopOriginId?: number | null
  servingStyle: string
}

type Props = {
  currentLang: "ja" | "en"
  onChange?: (recipes: RecipeItemData[]) => void
  initialRecipes?: RecipeItemData[]
  syncInitialRecipes?: boolean
  gears?: GearMasterItem[]
  mode?: "self" | "barista" | "none"
  onChangeMode?: (mode: "self" | "barista" | "none") => void
}

export default function BrewRecipeForm({
  currentLang,
  onChange,
  initialRecipes,
  syncInitialRecipes = false,
  gears
}: Props) {
  const { showPopup } = useAppPopup()
  const [templates, setTemplates] = useState<RecipeItemData[]>([])
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false)

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
      baristaUserId: "", // 💡 初期化
      shopName: "",
      shopOriginId: null,
      servingStyle: ""
    }]
  })

  const [gearOptions, setGearOptions] = useState<GearMasterItem[]>(gears || [])

  useEffect(() => {
    if (!syncInitialRecipes || !initialRecipes?.length) return
    setRecipes(current => JSON.stringify(current) === JSON.stringify(initialRecipes) ? current : initialRecipes)
  }, [initialRecipes, syncInitialRecipes])

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
    if (onChange) {
      const activeRecipes = recipes.filter(r => r.mode !== "none")
      onChange(activeRecipes)
    }
  }, [recipes, onChange])

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
      formulaCorrected: "補正式 = TDS × BR / (1 − TDS)",
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
    setRecipes(recipes.map(r => (r.id === id ? { ...r, ...updatedFields } : r)))
  }

  const handleRemoveRecipe = (id: string) => {
    if (recipes.length === 1) return
    setRecipes(recipes.filter(r => r.id !== id))
  }

  const handleSaveTemplate = (recipe: RecipeItemData, templateName: string) => {
    const name = templateName.trim() || "My Recipe"
    const newTemplate = {
      ...recipe,
      id: `template-${Date.now()}`,
      notes: `[Template: ${name}] ${recipe.notes}`
    }
    setTemplates([...templates, newTemplate])
  }

  const handleLoadTemplate = (template: RecipeItemData) => {
    if (recipes.length >= 5) {
      showPopup(
        currentLang === "en" ? "You can save up to five recipes. Remove an existing recipe before adding another." : "登録できるレシピは最大5件です。既存のレシピを削除してから追加してください。",
        "info",
        currentLang === "en" ? "Recipe limit reached" : "登録上限に達しました"
      )
      return
    }
    setRecipes([...recipes, { ...template, id: String(Date.now()) }])
    setShowTemplateDropdown(false)
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
      baristaUserId: "", // 💡 初期化
      shopName: "",
      shopOriginId: null,
      servingStyle: ""
    }])
  }

  return (
    <div className="space-y-8">
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
              {templates.map((tpl, idx) => {
                const match = tpl.notes.match(/^\[Template: (.*?)\]/)
                const displayName = match ? match[1] : `Template #${idx + 1}`
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handleLoadTemplate(tpl)}
                    className="w-full text-left text-[13px] p-2.5 rounded-[8px] hover:bg-neutral-50 text-[#161616] transition-colors truncate block"
                  >
                    📌 {displayName}
                  </button>
                )
              })}
              {templates.length === 0 && (
                <div className="text-[12px] text-[#8e8e8e] p-3 text-center">
                  保存されたテンプレートはありません
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
          recipesCount={recipes.length}
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
