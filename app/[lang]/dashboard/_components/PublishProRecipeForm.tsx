"use client"

import React, { useState, useEffect, useMemo } from "react"
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from "recharts"
import { supabase } from "@/lib/supabase"
import HeroImageUploader from "./HeroImageUploader"
import RecipeModuleForm from "./RecipeModuleForm"
import WaterProfileForm from "./WaterProfileForm"
import RoastingProfileForm from "./RoastingProfileForm"
import CuppingLogForm from "./CuppingLogForm"
import LabLogSection from "./LabLogSection"
import CoffeeBeansMetaForm from "./CoffeeBeansMetaForm"
import FormPublishSettings from "./FormPublishSettings"
import { useRouter } from "next/navigation"
import { serverMoveToPermanentStorage } from "@/app/actions/createPost"

export type RecipeModuleData = {
  id: string
  type: "recipe"
  gears: Array<{ gearId: number | null; name: string }>
  temp: string
  grindSize: string
  ratio: string
  tds: string
  bloomTime: string
  totalTime: string
  pourSteps: Array<{ id: string; amount: string; time: string }>
}

export type WaterModuleData = {
  id: string
  type: "water"
  name: string
  gh: string
  kh: string
  minerals: string
}

export type CuppingModuleData = {
  id: string
  type: "cupping"
  aroma: number
  flavor: number
  aftertaste: number
  acidity: number
  body: number
  balance: number
  overall: number
  notes: string
}

export type RoastModuleData = {
  id: string
  type: "roast"
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

export type VerificationModule = RecipeModuleData | WaterModuleData | CuppingModuleData | RoastModuleData

export type VerificationPattern = {
  id: string
  title: string
  isBest?: boolean
  modules: VerificationModule[]
}

export type RecipeFormData = {
  heroImageUrl?: string
  heroImageUrls?: string[]
  coffeeName: string
  coffeeLot: string
  coffeeUrl?: string
  roastDate?: string
  verifications: VerificationPattern[]
  labNotes?: string
  selectedVariables?: string[]
  logPurpose?: string
  logProcess?: string
  logConclusion?: string
}

type Props = { 
  userId?: string
  onRecipeCreated?: () => void 
  lang?: string
  authorType?: "pro" | "owner"
  membership_tier?: "free" | "standard" | "pro" | "business" | string
  editId?: string
  secondaryAction?: React.ReactNode
}

type VisibilityType = "draft" | "private" | "members" | "public"
type TargetCategoryType = "experts" | "origins" | "both"

const ADMIN_EMAIL = "rivu65622252@gmail.com"

const RECIPE_FORM_DICT = {
  ja: {
    loginRequired: "ログインしてください",
    successMessage: "レシピを投稿しました。",
    errorMessage: "エラーが発生しました。",
    imageRequiredError: "画像を1枚以上登録してください。",
    submitting: "処理中...",
    submitButton: "投稿する",
    labelVisibility: "公開設定",
    statusDraft: "下書き",
    statusPrivate: "非公開 (自分のみ)",
    statusMembers: "限定公開 (会員のみ)",
    statusPublic: "公開 (全員に公開)",
    labelPublishTarget: "投稿先の選択",
    targetExperts: "人カテゴリー (experts)",
    targetOrigins: "場所カテゴリー (origins)",
    targetBoth: "両方のカテゴリー"
  },
  en: {
    loginRequired: "Please log in",
    successMessage: "Recipe published successfully.",
    errorMessage: "An error occurred.",
    imageRequiredError: "Please add at least one image.",
    submitting: "Processing...",
    submitButton: "Publish",
    labelVisibility: "Visibility",
    statusDraft: "Draft",
    statusPrivate: "Private (Just me)",
    statusMembers: "Members Only",
    statusPublic: "Public (Everyone)",
    labelPublishTarget: "Publish Target Category",
    targetExperts: "People (experts)",
    targetOrigins: "Places (origins)",
    targetBoth: "Publish to Both"
  }
} as const

export default function PublishProRecipeForm({ 
  userId,
  onRecipeCreated, 
  lang = "ja", 
  authorType = "pro", 
  membership_tier,
  editId,
  secondaryAction,
}: Props) {
  const router = useRouter()
  const currentLang = lang === "en" ? "en" : "ja"
  const dict = RECIPE_FORM_DICT[currentLang]
  
  // membership_tier を小文字化・整形して判定用に保持
  const normalizedTier = useMemo(() => membership_tier?.trim().toLowerCase(), [membership_tier])

  const [data, setData] = useState<RecipeFormData>({
    heroImageUrl: "",
    heroImageUrls: [],
    coffeeName: "",
    coffeeLot: "",
    coffeeUrl: "", 
    roastDate: "",
    verifications: [
      {
        id: "pattern-1",
        title: "検証パターン A",
        isBest: false,
        modules: [
          {
            id: "recipe-1",
            type: "recipe",
            gears: [{ gearId: null, name: "" }],
            temp: "",
            grindSize: "",
            ratio: "",
            tds: "",
            bloomTime: "",
            totalTime: "",
            pourSteps: [{ id: "step-1", amount: "", time: "" }]
          }
        ]
      }
    ],
    labNotes: "",
    selectedVariables: [],
    logPurpose: "",
    logProcess: "",
    logConclusion: ""
  })

  const [customVariableInput, setCustomVariableInput] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [visibility, setVisibility] = useState<VisibilityType>("draft")
  const [targetCategory, setTargetCategory] = useState<TargetCategoryType>("experts")
  const [loadingInitial, setLoadingInitial] = useState(Boolean(editId))
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([])
  const initialImagesRef = React.useRef<string[]>([])

  useEffect(() => {
    return () => setStatusMessage(null)
  }, [])

  useEffect(() => {
    if (!editId) return
    let active = true
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = userId || user?.id
      if (!currentUserId) {
        setStatusMessage({ type: "error", text: dict.loginRequired })
        setLoadingInitial(false)
        return
      }
      const { data: recipe, error } = await supabase.from("pro_recipes")
        .select("*").eq("id", editId).eq("user_id", currentUserId).single()
      if (!active) return
      if (error || !recipe) {
        setStatusMessage({ type: "error", text: currentLang === "en" ? "Verification post not found." : "検証投稿が見つかりません。" })
        setLoadingInitial(false)
        return
      }
      const { data: gearLinks } = await supabase.from("pro_recipe_gears").select("gear_id").eq("pro_recipe_id", editId)
      const gearIds = (gearLinks || []).map(link => link.gear_id)
      const gearResult = gearIds.length
        ? await supabase.from("gears").select("id, name, name_ja").in("id", gearIds)
        : { data: [] as Array<{ id: number; name: string; name_ja: string | null }> }
      const recipeModule: RecipeModuleData = {
        id: "recipe-edit", type: "recipe",
        gears: (gearResult.data || []).map(gear => ({ gearId: gear.id, name: currentLang === "en" ? gear.name : (gear.name_ja || gear.name) })),
        temp: recipe.temp == null ? "" : String(recipe.temp),
        grindSize: recipe.grind_size || "",
        ratio: recipe.ratio == null ? "" : String(recipe.ratio),
        tds: recipe.tds == null ? "" : String(recipe.tds),
        bloomTime: recipe.bloom_time || "",
        totalTime: recipe.total_time || "",
        pourSteps: Array.isArray(recipe.pour_steps)
          ? recipe.pour_steps.map((step: any, index: number) => ({ id: `step-edit-${index}`, amount: String(step?.amount || ""), time: String(step?.time || "") }))
          : [{ id: "step-edit-1", amount: "", time: "" }],
      }
      const modules: VerificationModule[] = [recipeModule]
      if (recipe.water_profile || recipe.water_name || recipe.gh != null || recipe.kh != null) {
        const water = recipe.water_profile || {}
        modules.push({ id: "water-edit", type: "water", name: water.name || recipe.water_name || "", gh: String(water.gh ?? recipe.gh ?? ""), kh: String(water.kh ?? recipe.kh ?? ""), minerals: water.minerals || recipe.minerals || "" })
      }
      if (recipe.roast_profile) modules.push({ id: "roast-edit", type: "roast", ...recipe.roast_profile })
      if (recipe.cupping_profile) modules.push({ id: "cupping-edit", type: "cupping", ...recipe.cupping_profile })
      const urls = Array.isArray(recipe.image_urls) ? recipe.image_urls.filter((url: unknown): url is string => typeof url === "string") : []
      initialImagesRef.current = urls
      const savedPatterns = Array.isArray(recipe.verification_patterns) && recipe.verification_patterns.length > 0
        ? recipe.verification_patterns as VerificationPattern[]
        : [{ id: editId, title: recipe.recipe_title || recipe.bean_name || "", isBest: Boolean(recipe.is_best_pattern), modules }]
      setData({
        heroImageUrl: urls[0] || "", heroImageUrls: urls,
        coffeeName: recipe.bean_name || "", coffeeLot: recipe.coffee_lot || "",
        coffeeUrl: recipe.coffee_url || "", roastDate: recipe.roast_date || "",
        verifications: savedPatterns,
        selectedVariables: recipe.selected_variables || [],
        logPurpose: recipe.log_purpose || "", logProcess: recipe.log_process || "", logConclusion: recipe.log_conclusion || "",
      })
      setVisibility(recipe.visibility || "draft")
      setTargetCategory(recipe.target_category || "experts")
      setLoadingInitial(false)
    })()
    return () => { active = false }
  }, [currentLang, dict.loginRequired, editId, userId])

  const presetVariables = currentLang === "en"
    ? ["Pour Rate", "Brew Temperature", "Grind Size", "Agitation Count", "GH", "KH", "Drum Speed"]
    : ["注湯速度", "抽出温度", "挽き目（粒度）", "攪拌回数（抽出）", "総硬度（GH）", "炭酸塩硬度（KH）", "回転数（焙煎）"]
  
  const t = currentLang === "en" ? {
    saveTemplateBtn: "Save Template",
    duplicateBtn: "Duplicate Pattern",
    placeholderWaterName: "Water brand / composition",
    addModuleRecipe: "Add Recipe",
    addModuleWater: "Add Water Profile",
    addModuleCupping: "Add Cupping",
    addModuleRoasting: "Add Roast Profile",
    addVerificationBtn: "Add Verification Pattern (Up to 10)",
    submitting: dict.submitting,
    submitButton: dict.submitButton,
    sectionVerification: "VERIFICATION & ANALYSIS",
    subSectionVerification: "Summarize the variables examined and the findings from this verification.",
    labelVariableTags: "Variables Tested",
    placeholderVariableTags: "Add a custom variable (e.g., fines removal)",
    labelLogPurpose: "1. Purpose / Hypothesis",
    placeholderLogPurpose: "Describe what you wanted to test and the result you expected.",
    labelLogProcess: "2. Process and Differences",
    placeholderLogProcess: "Describe what was changed in each pattern.",
    labelLogConclusion: "3. Analysis and Conclusion",
    placeholderLogConclusion: "Describe conclusions from taste or data differences and possible next steps.",
    bestActive: "Selected as Best Pattern",
    bestSet: "Set as Best Pattern",
    remove: "Remove",
    noCupping: "No cupping module added",
    copySuffix: " (Copy)",
    maxPatterns: "You can register up to 10 verification patterns.",
  } : {
    saveTemplateBtn: "テンプレート保存",
    duplicateBtn: "パターンを複製",
    placeholderWaterName: "水の銘柄・調合",
    addModuleRecipe: "レシピを追加",
    addModuleWater: "水質を追加",
    addModuleCupping: "カッピングを追加",
    addModuleRoasting: "焙煎を追加",
    addVerificationBtn: "新しい検証パターンを追加（最大10個まで）",
    submitting: dict.submitting,
    submitButton: dict.submitButton,
    sectionVerification: "検証・考察",
    subSectionVerification: "この検証でフォーカスした変数と、そこから得られた知見をまとめます。",
    labelVariableTags: "検証した変数",
    placeholderVariableTags: "カスタム変数を追加 (例: 微粉除去)",
    labelLogPurpose: "1. 検証の目的・仮説",
    placeholderLogPurpose: "何を検証したくて、どのような結果を予測したかを記載します。",
    labelLogProcess: "2. 検証内容・プロセスの差異",
    placeholderLogProcess: "各パターンで具体的に何を変えて抽出したかを記載します。",
    labelLogConclusion: "3. 考察と結論",
    placeholderLogConclusion: "味やデータ（TDS/EY）の違いから得られた結論や、次への課題を記載します。",
    bestActive: "最適パターンに設定中",
    bestSet: "最適パターンに設定",
    remove: "削除",
    noCupping: "カッピングモジュール未配置",
    copySuffix: " (コピー)",
    maxPatterns: "検証パターンは最大10個まで登録できます。",
  }

  useEffect(() => {
    setData(previous => ({
      ...previous,
      verifications: previous.verifications.map((pattern, index) => {
        const isDefaultTitle = /^(検証パターン|Verification Pattern) [A-J]( \\((コピー|Copy)\\))?$/.test(pattern.title)
        if (!isDefaultTitle) return pattern
        const suffix = pattern.title.includes("コピー") || pattern.title.includes("Copy") ? t.copySuffix : ""
        return {
          ...pattern,
          title: `${currentLang === "en" ? "Verification Pattern" : "検証パターン"} ${String.fromCharCode(65 + index)}${suffix}`,
        }
      }),
    }))
  }, [currentLang, t.copySuffix])

  const isDifferent = (patternIndex: number, moduleType: "recipe" | "water" | "cupping" | "roast", field: string, value: any) => {
    if (patternIndex === 0) return false
    const prevPattern = data.verifications[patternIndex - 1]
    const prevModule = prevPattern.modules.find(m => m.type === moduleType)
    if (!prevModule) return false
    
    const prevValue = (prevModule as any)[field]
    if (Array.isArray(value) && Array.isArray(prevValue)) {
      return JSON.stringify(value) !== JSON.stringify(prevValue)
    }
    return prevValue !== value
  }

  const getDiffClass = (patternIndex: number, moduleType: "recipe" | "water" | "cupping" | "roast", field: string, value: any) => {
    return isDifferent(patternIndex, moduleType, field, value) ? "bg-amber-50/60 border-amber-200/80 focus:border-amber-400 text-amber-950 placeholder:text-amber-700/40" : ""
  }

  const getCuppingDataForChart = () => {
    return data.verifications.map(p => {
      const cuppingModule = p.modules.find(m => m.type === "cupping") as CuppingModuleData | undefined
      return {
        title: p.title,
        isBest: p.isBest || false,
        chartList: cuppingModule ? [
          { subject: "Aroma", value: cuppingModule.aroma },
          { subject: "Flavor", value: cuppingModule.flavor },
          { subject: "After", value: cuppingModule.aftertaste },
          { subject: "Acid", value: cuppingModule.acidity },
          { subject: "Body", value: cuppingModule.body },
          { subject: "Bal", value: cuppingModule.balance },
        ] : null,
        rawScores: cuppingModule ? {
          aroma: cuppingModule.aroma,
          flavor: cuppingModule.flavor,
          aftertaste: cuppingModule.aftertaste,
          acidity: cuppingModule.acidity,
          body: cuppingModule.body,
          balance: cuppingModule.balance,
        } : null
      }
    })
  }

  const getAgeingDays = (dateStr?: string) => {
    if (!dateStr) return null
    const roast = new Date(dateStr)
    const today = new Date()
    if (isNaN(roast.getTime())) return null
    
    roast.setHours(0,0,0,0)
    today.setHours(0,0,0,0)
    const diffTime = today.getTime() - roast.getTime()
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    if (diffDays >= 0) return currentLang === "en" ? `Roast +${diffDays} days` : `Roast +${diffDays}日`
    return currentLang === "en" ? "Future date" : "未来の日付"
  }

  const handleRemovePattern = (patternId: string) => {
    setData(p => ({ ...p, verifications: p.verifications.filter(s => s.id !== patternId) }))
  }

  const handleAddPattern = () => {
    if (data.verifications.length >= 10) {
      setStatusMessage({ type: "error", text: t.maxPatterns })
      return
    }
    const newId = `pattern-${Date.now()}`
    setData(p => ({
      ...p,
      verifications: [...p.verifications, { id: newId, title: `${currentLang === "en" ? "Verification Pattern" : "検証パターン"} ${String.fromCharCode(65 + p.verifications.length)}`, isBest: false, modules: [] }]
    }))
  }

  const handleDuplicatePattern = (sourcePattern: VerificationPattern) => {
    if (data.verifications.length >= 10) {
      setStatusMessage({ type: "error", text: t.maxPatterns })
      return
    }
    const newPatternId = `pattern-${Date.now()}`
    const duplicatedModules = sourcePattern.modules.map(mod => ({
      ...mod,
      id: `${mod.type}-${Math.random().toString(36).slice(2, 11)}`
    }))

    const newPattern: VerificationPattern = {
      ...sourcePattern,
      id: newPatternId,
      title: `${sourcePattern.title}${t.copySuffix}`,
      isBest: false,
      modules: duplicatedModules
    }

    setData(p => ({ ...p, verifications: [...p.verifications, newPattern] }))
  }

  const handleToggleBestPattern = (patternId: string) => {
    setData(p => ({
      ...p,
      verifications: p.verifications.map(s => {
        if (s.id === patternId) return { ...s, isBest: !s.isBest }
        return { ...s, isBest: false }
      })
    }))
  }

  const handleUpdateModuleData = (patternId: string, moduleId: string, updatedFields: Partial<VerificationModule>) => {
    setData(p => ({
      ...p,
      verifications: p.verifications.map(pat => {
        if (pat.id !== patternId) return pat
        return {
          ...pat,
          modules: pat.modules.map(mod => {
            if (mod.id !== moduleId) return mod
            return { ...mod, ...updatedFields } as VerificationModule
          })
        }
      })
    }))
  }

  const handleRemoveModuleFromPattern = (patternId: string, moduleId: string) => {
    setData(p => ({
      ...p,
      verifications: p.verifications.map(pat => {
        if (pat.id !== patternId) return pat
        return { ...pat, modules: pat.modules.filter(mod => mod.id !== moduleId) }
      })
    }))
  }

  const handleAddModuleToPattern = (patternId: string, type: "recipe" | "water" | "cupping" | "roast") => {
    const newId = `${type}-${Date.now()}`
    let newModule: VerificationModule

    if (type === "recipe") {
      newModule = { id: newId, type: "recipe", gears: [{ gearId: null, name: "" }], temp: "", grindSize: "", ratio: "", tds: "", bloomTime: "", totalTime: "", pourSteps: [{ id: `step-${Date.now()}`, amount: "", time: "" }] }
    } else if (type === "water") {
      newModule = { id: newId, type: "water", name: "", gh: "", kh: "", minerals: "" }
    } else if (type === "cupping") {
      newModule = { id: newId, type: "cupping", aroma: 4, flavor: 4, aftertaste: 4, acidity: 4, body: 4, balance: 4, overall: 4, notes: "" }
    } else {
      newModule = { id: newId, type: "roast", roasterMachine: "", batchSize: "", chargeTemp: "", ror: "", drumSpeed: "", firstCrack: "", dropTemp: "", totalTime: "", dtr: "", roastDegree: "", notes: "" }
    }

    setData(p => ({
      ...p,
      verifications: p.verifications.map(pat => {
        if (pat.id !== patternId) return pat
        return { ...pat, modules: [...pat.modules, newModule] }
      })
    }))
  }

  const handleFieldChange = (field: string, value: any) => {
    setData(p => ({ ...p, [field]: value }))
  }

  const handleToggleVariableTag = (tag: string) => {
    const current = data.selectedVariables || []
    const updated = current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag]
    handleFieldChange("selectedVariables", updated)
  }

  const handleAddCustomVariableTag = () => {
    if (!customVariableInput.trim()) return
    const current = data.selectedVariables || []
    if (!current.includes(customVariableInput.trim())) {
      handleFieldChange("selectedVariables", [...current, customVariableInput.trim()])
    }
    setCustomVariableInput("")
  }

  // DB保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)
    setSubmitting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentUserId = userId || user?.id

      if (!currentUserId) {
        setStatusMessage({ type: "error", text: dict.loginRequired })
        setSubmitting(false)
        return
      }

      const imageUrls = data.heroImageUrls?.length
        ? data.heroImageUrls
        : data.heroImageUrl ? [data.heroImageUrl] : []
      if (imageUrls.length === 0) {
        setStatusMessage({ type: "error", text: dict.imageRequiredError })
        return
      }
      const permanentImageUrls = await Promise.all(
        imageUrls.map(url => serverMoveToPermanentStorage(url))
      )
      // business以外はUIを改変されてもorigins/bothへ投稿できないよう保存時にも固定する。
      const finalTargetCategory: TargetCategoryType =
        normalizedTier === "business" ? targetCategory : "experts"

      const primaryPattern = data.verifications.find(pattern => pattern.isBest) || data.verifications[0]
      const recipeModule = primaryPattern?.modules.find((module): module is RecipeModuleData => module.type === "recipe")
      const waterModule = primaryPattern?.modules.find((module): module is WaterModuleData => module.type === "water")
      const roastModule = primaryPattern?.modules.find((module): module is RoastModuleData => module.type === "roast")
      const cuppingModule = primaryPattern?.modules.find((module): module is CuppingModuleData => module.type === "cupping")
      const recipePayload = {
        user_id: currentUserId,
        recipe_title: data.coffeeName.trim(),
        bean_name: data.coffeeName.trim(),
        image_urls: permanentImageUrls.length ? permanentImageUrls : null,
        verification_patterns: data.verifications,
        water_name: waterModule?.name?.trim() || null,
        gh: waterModule?.gh ? Number(waterModule.gh) : null,
        kh: waterModule?.kh ? Number(waterModule.kh) : null,
        minerals: waterModule?.minerals?.trim() || null,
        selected_variables: data.selectedVariables || [],
        log_purpose: data.logPurpose?.trim() || null,
        log_process: data.logProcess?.trim() || null,
        log_conclusion: data.logConclusion?.trim() || null,
        temp: recipeModule?.temp ? Number(recipeModule.temp) : null,
        grind_size: recipeModule?.grindSize?.trim() || null,
        ratio: recipeModule?.ratio ? Number(recipeModule.ratio) : null,
        tds: recipeModule?.tds ? Number(recipeModule.tds) : null,
        bloom_time: recipeModule?.bloomTime?.trim() || null,
        total_time: recipeModule?.totalTime?.trim() || null,
        pour_steps: (recipeModule?.pourSteps || []).filter(step => step.amount.trim() || step.time.trim()),
        water_profile: waterModule || null,
        roast_profile: roastModule || null,
        cupping_profile: cuppingModule || null,
        coffee_lot: data.coffeeLot.trim() || null,
        coffee_url: data.coffeeUrl?.trim() || null,
        roast_date: data.roastDate || null,
        is_best_pattern: Boolean(primaryPattern?.isBest),
        visibility,
        target_category: finalTargetCategory,
        lang: currentLang,
      }
      const recipeQuery = editId
        ? supabase.from("pro_recipes").update(recipePayload).eq("id", editId).eq("user_id", currentUserId)
        : supabase.from("pro_recipes").insert(recipePayload)
      const { data: proRecipe, error: recipeError } = await recipeQuery.select("id").single()
      if (recipeError) throw recipeError

      const { error: deleteGearError } = await supabase.from("pro_recipe_gears").delete().eq("pro_recipe_id", proRecipe.id)
      if (deleteGearError) throw deleteGearError
      const gearIds = Array.from(new Set(
        data.verifications.flatMap(pattern => pattern.modules)
          .filter((module): module is RecipeModuleData => module.type === "recipe")
          .flatMap(module => module.gears)
          .map(gear => gear.gearId)
          .filter((id): id is number => id !== null)
      ))
      if (gearIds.length > 0) {
        const { error: gearError } = await supabase.from("pro_recipe_gears").insert(
          gearIds.map((gearId, sort_order) => ({ pro_recipe_id: proRecipe.id, gear_id: gearId, sort_order }))
        )
        if (gearError) throw gearError
      }

      for (const url of removedImageUrls.filter(url => initialImagesRef.current.includes(url) && !permanentImageUrls.includes(url))) {
        await fetch("/api/delete-object", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
      }
      initialImagesRef.current = permanentImageUrls
      setData(previous => ({ ...previous, heroImageUrls: permanentImageUrls, heroImageUrl: permanentImageUrls[0] || "" }))
      setRemovedImageUrls([])
      setStatusMessage({ type: "success", text: editId ? (currentLang === "en" ? "Verification post updated." : "検証投稿を更新しました。") : dict.successMessage })
      if (onRecipeCreated) onRecipeCreated()
      if (proRecipe.id) {
        router.push(`/${currentLang}/recipes/${proRecipe.id}`)
        router.refresh()
      }
    } catch (err: any) {
      console.error(err)
      setStatusMessage({ type: "error", text: dict.errorMessage })
    } finally {
      setSubmitting(false)
    }
  }

  const ageingLabel = getAgeingDays(data.roastDate)
  const chartData = getCuppingDataForChart()
  const hasImage = Boolean(data.heroImageUrls?.length || data.heroImageUrl)
  const isFormInvalid = !data.coffeeName.trim() || !hasImage

  if (loadingInitial) return <div className="h-[720px] animate-pulse rounded-[24px] border border-neutral-100 bg-neutral-50" />

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto space-y-8 bg-white border border-neutral-200 rounded-[24px] p-6 sm:p-10 shadow-sm font-sans text-neutral-900">
      
      <HeroImageUploader 
        currentLang={currentLang}
        initialImageUrls={data.heroImageUrls?.length ? data.heroImageUrls : data.heroImageUrl ? [data.heroImageUrl] : []} 
        onImagesChanged={(urls) => {
          handleFieldChange("heroImageUrls", urls)
          handleFieldChange("heroImageUrl", urls[0] || "")
        }}
        deferDeletion={Boolean(editId)}
        onRemovedImagesChanged={setRemovedImageUrls}
      />

      <CoffeeBeansMetaForm 
        data={data} 
        handleFieldChange={handleFieldChange} 
        ageingLabel={ageingLabel} 
        currentLang={currentLang}
      />

      {data.verifications?.map((slot, sIdx) => {
        return (
          <div 
            key={slot.id} 
            className={`border rounded-[20px] p-6 bg-white transition-all duration-300 space-y-6 relative ${
              slot.isBest 
                ? "border-neutral-900 shadow-[0_4px_24px_rgba(0,0,0,0.03)] ring-1 ring-neutral-900" 
                : "border-neutral-200 shadow-[0_4px_30px_rgba(0,0,0,0.005)]"
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-neutral-100 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">
                  {slot.title.includes("コピー") || slot.title.includes("Copy") ? "COPY" : "PATTERN"}
                </span>
                <input 
                  type="text" 
                  value={slot.title} 
                  onChange={(e) => setData(p => ({
                    ...p,
                    verifications: p.verifications.map(s => s.id === slot.id ? { ...s, title: e.target.value } : s)
                  }))} 
                  className="text-xs border border-neutral-200 rounded-xl px-2.5 py-1 font-sans font-medium text-neutral-700 focus:outline-none focus:border-neutral-400 bg-neutral-50/50 min-w-[140px]" 
                />
                
                <button
                  type="button"
                  onClick={() => handleToggleBestPattern(slot.id)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg font-bold transition-all border ${
                    slot.isBest
                      ? "bg-neutral-950 text-white border-neutral-950 shadow-sm"
                      : "bg-white text-neutral-400 border-neutral-200 hover:text-neutral-995 hover:border-neutral-300"
                  }`}
                >
                  {slot.isBest ? t.bestActive : t.bestSet}
                </button>
              </div>

              <div className="flex items-center gap-4 self-end sm:self-auto">
                <button 
                  type="button" 
                  onClick={() => handleDuplicatePattern(slot)}
                  className="text-[11px] font-bold text-neutral-400 hover:text-neutral-950 transition-colors"
                >
                  {t.duplicateBtn}
                </button>
                
                <button type="button" className="text-[11px] font-medium text-neutral-400 hover:text-neutral-600 transition-colors">
                  {t.saveTemplateBtn}
                </button>
                
                {data.verifications.length > 1 && (
                  <button 
                    type="button" 
                    onClick={() => handleRemovePattern(slot.id)}
                    className="text-[11px] font-medium text-neutral-400 hover:text-red-500 transition-colors"
                  >
                    {t.remove}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {(slot.modules || []).map((module) => {
                if (module.type === "recipe") {
                  return (
                    <div key={module.id} className="space-y-2">
                      <RecipeModuleForm 
                        slotId={slot.id}
                        module={module}
                        lang={currentLang}
                        diffClasses={{
                          temp: getDiffClass(sIdx, "recipe", "temp", module.temp),
                          grindSize: getDiffClass(sIdx, "recipe", "grindSize", module.grindSize),
                          ratio: getDiffClass(sIdx, "recipe", "ratio", module.ratio),
                          tds: getDiffClass(sIdx, "recipe", "tds", module.tds),
                          bloomTime: getDiffClass(sIdx, "recipe", "bloomTime", module.bloomTime),
                          totalTime: getDiffClass(sIdx, "recipe", "totalTime", module.totalTime),
                          gears: getDiffClass(sIdx, "recipe", "gears", module.gears),
                          pourSteps: getDiffClass(sIdx, "recipe", "pourSteps", module.pourSteps)
                        }}
                        onUpdate={(updatedFields) => handleUpdateModuleData(slot.id, module.id, updatedFields)}
                        onRemove={() => handleRemoveModuleFromPattern(slot.id, module.id)}
                      />
                    </div>
                  )
                }

                if (module.type === "water") {
                  return (
                    <div key={module.id} className="border border-neutral-200 rounded-xl p-5 space-y-4 bg-white shadow-sm relative">
                      <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
                        <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest">WATER COMPONENT</span>
                        <button type="button" onClick={() => handleRemoveModuleFromPattern(slot.id, module.id)} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">{t.remove}</button>
                      </div>
                      <WaterProfileForm 
                        module={module}
                        lang={currentLang}
                        diffClasses={{
                          name: getDiffClass(sIdx, "water", "name", module.name),
                          gh: getDiffClass(sIdx, "water", "gh", module.gh),
                          kh: getDiffClass(sIdx, "water", "kh", module.kh),
                          minerals: getDiffClass(sIdx, "water", "minerals", module.minerals)
                        }}
                        onChange={(updatedFields) => handleUpdateModuleData(slot.id, module.id, updatedFields)}
                        placeholderWaterName={t.placeholderWaterName}
                      />
                    </div>
                  )
                }

                if (module.type === "cupping") {
                  return (
                    <div key={module.id} className="border border-neutral-200 rounded-xl p-5 space-y-4 bg-white shadow-sm relative">
                      <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
                        <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest">CUPPING COMPONENT</span>
                        <button type="button" onClick={() => handleRemoveModuleFromPattern(slot.id, module.id)} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">{t.remove}</button>
                      </div>
                      <CuppingLogForm 
                        module={module} 
                        lang={currentLang}
                        diffClasses={{
                          aroma: getDiffClass(sIdx, "cupping", "aroma", module.aroma),
                          flavor: getDiffClass(sIdx, "cupping", "flavor", module.flavor),
                          aftertaste: getDiffClass(sIdx, "cupping", "aftertaste", module.aftertaste),
                          acidity: getDiffClass(sIdx, "cupping", "acidity", module.acidity),
                          body: getDiffClass(sIdx, "cupping", "body", module.body),
                          balance: getDiffClass(sIdx, "cupping", "balance", module.balance),
                          overall: getDiffClass(sIdx, "cupping", "overall", module.overall),
                          notes: getDiffClass(sIdx, "cupping", "notes", module.notes)
                        }}
                        onChange={(updatedFields) => handleUpdateModuleData(slot.id, module.id, updatedFields)} 
                      />
                    </div>
                  )
                }

                if (module.type === "roast") {
                  return (
                    <div key={module.id} className="border border-neutral-200 rounded-xl p-5 space-y-4 bg-white shadow-sm relative">
                      <div className="flex justify-between items-center border-b border-neutral-100 pb-2.5">
                        <span className="text-[11px] text-neutral-400 font-bold uppercase tracking-widest">ROASTING COMPONENT</span>
                        <button type="button" onClick={() => handleRemoveModuleFromPattern(slot.id, module.id)} className="text-xs text-neutral-400 hover:text-red-500 transition-colors">{t.remove}</button>
                      </div>
                      <RoastingProfileForm 
                        module={module} 
                        lang={currentLang}
                        diffClasses={{
                          roasterMachine: getDiffClass(sIdx, "roast", "roasterMachine", module.roasterMachine),
                          batchSize: getDiffClass(sIdx, "roast", "batchSize", module.batchSize),
                          chargeTemp: getDiffClass(sIdx, "roast", "chargeTemp", module.chargeTemp),
                          ror: getDiffClass(sIdx, "roast", "ror", module.ror),
                          drumSpeed: getDiffClass(sIdx, "roast", "drumSpeed", module.drumSpeed),
                          firstCrack: getDiffClass(sIdx, "roast", "firstCrack", module.firstCrack),
                          dropTemp: getDiffClass(sIdx, "roast", "dropTemp", module.dropTemp),
                          totalTime: getDiffClass(sIdx, "roast", "totalTime", module.totalTime),
                          dtr: getDiffClass(sIdx, "roast", "dtr", module.dtr),
                          roastDegree: getDiffClass(sIdx, "roast", "roastDegree", module.roastDegree),
                          notes: getDiffClass(sIdx, "roast", "notes", module.notes)
                        }}
                        onChange={(updatedFields) => handleUpdateModuleData(slot.id, module.id, updatedFields)} 
                      />
                    </div>
                  )
                }
                return null
              })}
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-neutral-100">
              <button type="button" onClick={() => handleAddModuleToPattern(slot.id, "recipe")} className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-700 transition-colors">
                {t.addModuleRecipe}
              </button>
              <button type="button" onClick={() => handleAddModuleToPattern(slot.id, "water")} className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-700 transition-colors">
                {t.addModuleWater}
              </button>
              <button type="button" onClick={() => handleAddModuleToPattern(slot.id, "cupping")} className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-700 transition-colors">
                {t.addModuleCupping}
              </button>
              <button type="button" onClick={() => handleAddModuleToPattern(slot.id, "roast")} className="px-3 py-1.5 text-xs font-medium border border-neutral-200 rounded-xl hover:bg-neutral-50 text-neutral-700 transition-colors">
                {t.addModuleRoasting}
              </button>
            </div>
          </div>
        )
      })}

      <div className="text-center pt-1">
        <button
          type="button"
          onClick={handleAddPattern}
          disabled={data.verifications.length >= 10}
          className="w-full sm:w-auto px-8 py-3.5 border border-dashed border-neutral-300 rounded-xl text-[14px] font-medium text-neutral-600 hover:border-neutral-400 hover:text-neutral-900 bg-white hover:bg-neutral-50/50 transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.addVerificationBtn}
        </button>
      </div>

      <div className="p-5 border border-neutral-200 rounded-[20px] bg-neutral-50/50 space-y-4">
        <div className="flex justify-between items-center border-b border-neutral-200 pb-2">
          <h4 className="text-[11px] font-mono font-bold tracking-widest text-neutral-400 uppercase">VISUALIZATION COMPONENT DATA</h4>
          <span className="text-[10px] text-neutral-400 font-medium font-mono">SYNC ACTIVE</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {chartData.map((cd, index) => (
            <div key={index} className="p-4 bg-white border border-neutral-200 rounded-xl space-y-3 flex flex-col justify-between min-h-[220px]">
              <div className="flex justify-between items-center font-bold text-neutral-800 text-xs">
                <span className="tracking-wide">{cd.title}</span>
                {cd.isBest && <span className="text-[9px] bg-neutral-950 text-white px-2 py-0.5 rounded-lg uppercase font-mono tracking-wider font-bold">Optimal</span>}
              </div>
              
              {cd.chartList ? (
                <div className="flex flex-col sm:flex-row items-center gap-2 flex-1 w-full justify-center">
                  <div className="w-full sm:w-40 h-36 flex items-center justify-center shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="65%" data={cd.chartList}>
                        <PolarGrid stroke="#f5f5f5" />
                        <PolarAngleAxis 
                          dataKey="subject" 
                          tick={{ fill: "#a3a3a3", fontSize: 9, fontFamily: "monospace", fontWeight: "600" }} 
                        />
                        <PolarRadiusAxis domain={[0, 10]} tick={false} axisLine={false} />
                        <Radar
                          name="Scores"
                          dataKey="value"
                          stroke="#171717"
                          fill="#171717"
                          fillOpacity={0.04}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {cd.rawScores && (
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-neutral-500 font-mono flex-1 w-full border-t sm:border-t-0 sm:border-l border-neutral-100 pt-2 sm:pt-0 sm:pl-3">
                      <div>Aroma: {cd.rawScores.aroma}</div>
                      <div>Flavor: {cd.rawScores.flavor}</div>
                      <div>After: {cd.rawScores.aftertaste}</div>
                      <div>Acid: {cd.rawScores.acidity}</div>
                      <div>Body: {cd.rawScores.body}</div>
                      <div>Bal: {cd.rawScores.balance}</div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-neutral-400 text-[11px] italic h-36 border border-dashed border-neutral-100 rounded-xl bg-neutral-50/40">
                  {t.noCupping}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <hr className="border-neutral-200/60 my-6" />

      <LabLogSection
        data={data}
        currentUserEmail={ADMIN_EMAIL}
        onChangeField={handleFieldChange}
        onToggleVariableTag={handleToggleVariableTag}
        onAddCustomVariableTag={handleAddCustomVariableTag}
        customVariableInput={customVariableInput}
        setCustomVariableInput={setCustomVariableInput}
        presetVariables={presetVariables}
        t={t}
        lang={currentLang}
      />

      <FormPublishSettings 
        dict={dict}
        normalizedTier={normalizedTier}
        visibility={visibility}
        setVisibility={setVisibility}
        targetCategory={targetCategory}
        setTargetCategory={setTargetCategory}
        submitting={submitting}
        disabled={isFormInvalid}
        statusMessage={statusMessage}
        secondaryAction={secondaryAction}
      />
    </form>
  )
}
