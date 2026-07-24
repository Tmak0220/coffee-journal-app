"use client"

import { useEffect, useState, useLayoutEffect, useRef, use, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { FormSkeleton } from "@/components/ui/PageSkeletons"

// 外部のサーバーアクションをインポート
import { serverMoveToPermanentStorage } from "@/app/actions/createPost"

import HeroImageUploader from "@/app/[lang]/dashboard/_components/HeroImageUploader"
import CoffeeBeansInfoForm from "@/app/[lang]/dashboard/_components/CoffeeBeansInfoForm"
import BrewRecipeForm from "@/app/[lang]/dashboard/_components/BrewRecipeForm"
import TasteTagsForm from "@/app/[lang]/dashboard/_components/TasteTagsForm"

type OriginSuggestion = {
  id: number
  slug: string
  name: string
  name_ja: string
  type: string
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

type VisibilityType = "draft" | "private" | "followers" | "public"

type Props = {
  params: Promise<{
    lang: string
    id: string
  }>
}

const logFormDict = {
  ja: {
    mainTitle: "EDIT TASTING LOG & RECIPE",
    mainDesc: "コーヒー豆のテイスティング記録と抽出レシピの編集",
    imageRequiredError: "カバー画像のアップロードは必須です。",
    submitting: "変更を保存中...",
    submitButton: "変更を保存する",
    defaultGrindSize: "中挽き",
    labelVisibility: "公開設定",
    statusDraft: "下書き",
    statusPrivate: "非公開 (自分のみ)",
    statusFollowers: "限定公開 (フォロワーのみ)",
    statusPublic: "公開 (全員に公開)",
    confirmDeleteTitle: "投稿の削除",
    confirmDeleteDesc: "この投稿を削除しますか？\n（アップロードされた画像も同時に完全に削除されます。この操作は取り消せません）",
    cancelButton: "キャンセル",
    deleteButton: "削除する"
  },
  en: {
    mainTitle: "EDIT TASTING LOG & RECIPE",
    mainDesc: "Edit your tasting notes and specific brewing recipe",
    imageRequiredError: "Hero image is required.",
    submitting: "Saving...",
    submitButton: "Save Changes",
    defaultGrindSize: "Medium",
    labelVisibility: "Visibility",
    statusDraft: "Draft",
    statusPrivate: "Private (Just me)",
    statusFollowers: "Followers Only",
    statusPublic: "Public (Everyone)",
    confirmDeleteTitle: "Delete Log",
    confirmDeleteDesc: "Are you sure you want to delete this log? (The associated images will also be permanently deleted. This action cannot be undone.)",
    cancelButton: "Cancel",
    deleteButton: "Delete"
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const cleanImageUrls = (input: string[] | null): string[] =>
  (input ?? []).map(url => url.trim()).filter(url => url.startsWith("http"))

export default function EditPostPage({ params }: Props) {
  const { lang, id: postId } = use(params)
  const currentLang = lang === "en" ? "en" : "ja"
  const t = logFormDict[currentLang]
  
  const router = useRouter()

  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  // 1. COFFEE BEANS INFO ステート
  const [title, setTitle] = useState("")
  const [varietyId, setVarietyId] = useState("") // カンマ区切り文字列
  const [processId, setProcessId] = useState("") // カンマ区切り文字列
  const [tastes, setTastes] = useState("")
  const [description, setDescription] = useState("")
  
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [pendingDeletedImageUrls, setPendingDeletedImageUrls] = useState<string[]>([])
  const [visibility, setVisibility] = useState<VisibilityType>("draft")

  const [sourceInput, setSourceInput] = useState("")
  const [selectedSource, setSelectedSource] = useState<OriginSuggestion | null>(null)

  const [marketInput, setMarketInput] = useState("")
  const [selectedMarket, setSelectedMarket] = useState<OriginSuggestion | null>(null)
  
  // 2. BREW RECIPE 関連の統合ステート
  const [recipeState, setRecipeState] = useState({
    editingRecipeId: null as string | number | null,
    recipeMode: "none" as "self" | "barista" | "none",
    selfRecipe: { 
      dripper: "Hario V60", 
      waterTemp: "", 
      grindSize: "", 
      ratio: ""
    },
    baristaRecipe: { baristaUserId: "", shopName: "", shopOriginId: null as number | null },
    recipeNotes: ""
  })
  
  // 3. TASTE & FLAVOR TAGS ステート
  const [selectedTasteIds, setSelectedTasteIds] = useState<string[]>([])
  const [selectedGears, setSelectedGears] = useState<Array<{ id: string; name: string; gearId: number | null }>>([
    { id: "1", name: "", gearId: null }
  ])

  const [isAdmin, setIsAdmin] = useState(false)

  const initialImageUrlsRef = useRef<string[]>([])
  const currentImageUrlsRef = useRef<string[]>([])
  const pendingDeletedImageUrlsRef = useRef<string[]>([])

  useEffect(() => {
    currentImageUrlsRef.current = imageUrls
  }, [imageUrls])

  useEffect(() => {
    pendingDeletedImageUrlsRef.current = pendingDeletedImageUrls
  }, [pendingDeletedImageUrls])

  useEffect(() => {
    const handleBeforeUnload = () => {
      const originalUrls = initialImageUrlsRef.current || []
      const currentUrls = currentImageUrlsRef.current || []
      const abandonedUrls = Array.from(new Set([
        ...(Array.isArray(currentUrls) ? currentUrls.filter(url => !originalUrls.includes(url)) : []),
        ...pendingDeletedImageUrlsRef.current.filter(url => !originalUrls.includes(url)),
      ]))

      if (abandonedUrls.length > 0) {
        const blob = new Blob([JSON.stringify({ urls: abandonedUrls })], { type: "application/json" })
        navigator.sendBeacon("/api/delete-object-beacon", blob)
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [])

  useLayoutEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    const fetchPostAndVerify = async () => {
      if (!postId) return

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsAuthorized(false)
        setIsAuthChecked(true)
        return
      }

      const adminEmail = "rivu65622252@gmail.com"
      const userIsAdmin = user.email === adminEmail
      setIsAdmin(userIsAdmin)

      const { data: memberData } = await supabase
        .from("users")
        .select("membership_tier")
        .eq("id", user.id)
        .single()

      if (!memberData || memberData.membership_tier === "free") {
        setIsAuthorized(false)
        setIsAuthChecked(true)
        return
      }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select(`
          *,
          users (id, username, avatar_url)
        `)
        .eq("id", postId)
        .single()

      if (postError || !postData) {
        console.error("Fetch Error:", postError?.message)
        setIsAuthorized(false)
        setIsAuthChecked(true)
        return
      }

      if (postData.user_id !== user.id) {
        setIsAuthorized(false)
        setIsAuthChecked(true)
        return
      }

      setIsAuthorized(true)

      setTitle(postData.title || "")
      setTastes(postData.tastes || "")
      setDescription(postData.description || "")
      setVisibility(postData.visibility || "draft")
      
      // 💡 複数選択(中間テーブル)から選択済みの品種ID群を取得し、カンマ区切りで復元
      const { data: vPivot } = await supabase.from("post_varieties").select("variety_id").eq("post_id", postId)
      if (vPivot && vPivot.length > 0) {
        setVarietyId(vPivot.map(v => v.variety_id).join(","))
      } else {
        setVarietyId("")
      }

      // 💡 複数選択(中間テーブル)から選択済みの精製方法ID群を取得し、カンマ区切りで復元
      const { data: pPivot } = await supabase.from("post_processes").select("process_id").eq("post_id", postId)
      if (pPivot && pPivot.length > 0) {
        setProcessId(pPivot.map(p => p.process_id).join(","))
      } else {
        setProcessId("")
      }

      const urls = cleanImageUrls(postData.image_urls)

      setImageUrls((current) => current.length === 0 ? urls : current)
      if (initialImageUrlsRef.current.length === 0) {
        initialImageUrlsRef.current = urls
      }

      const { data: postGearRows } = await supabase
        .from("post_gears")
        .select("gear_id")
        .eq("post_id", postId)

      const gearIds = (postGearRows || []).map(row => row.gear_id)
      if (gearIds.length > 0) {
        const { data: gearRows } = await supabase
          .from("gears")
          .select("id, name, name_ja")
          .in("id", gearIds)

        const gearMap = new Map((gearRows || []).map(gear => [gear.id, gear]))
        setSelectedGears(gearIds.flatMap((gearId, index) => {
          const gear = gearMap.get(gearId)
          return gear ? [{
            id: `saved-gear-${index}`,
            name: currentLang === "ja" ? (gear.name_ja || gear.name) : gear.name,
            gearId: gear.id
          }] : []
        }))
      }

      if (postData.source_origin_id) {
        const { data: srcOrg } = await supabase.from("origins").select("*").eq("id", postData.source_origin_id).single()
        if (srcOrg) {
          setSelectedSource(srcOrg as any)
          setSourceInput(currentLang === "en" ? srcOrg.name : srcOrg.name_ja)
        }
      }
      if (postData.market_origin_id) {
        const { data: mktOrg } = await supabase.from("origins").select("*").eq("id", postData.market_origin_id).single()
        if (mktOrg) {
          setSelectedMarket(mktOrg as any)
          setMarketInput(currentLang === "en" ? mktOrg.name : mktOrg.name_ja)
        }
      }

      const { data: recipeData } = await supabase
        .from("recipes")
        .select("*")
        .eq("post_id", postId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (recipeData) {
        setRecipeState({
          editingRecipeId: recipeData.id,
          recipeMode: recipeData.mode || "none",
          selfRecipe: {
            dripper: "Hario V60",
            waterTemp: recipeData.temperature ? String(recipeData.temperature) : "",
            grindSize: recipeData.grind_size ? String(recipeData.grind_size) : "",
            ratio: recipeData.brew_ratio ? String(recipeData.brew_ratio) : ""
          },
          baristaRecipe: {
            baristaUserId: recipeData.barista_user_id || "",
            shopName: recipeData.shop_name || "",
            shopOriginId: recipeData.shop_origin_id || null
          },
          recipeNotes: recipeData.notes || ""
        })
      } else {
        setRecipeState({
          editingRecipeId: "new-recipe",
          recipeMode: "none",
          selfRecipe: { dripper: "Hario V60", waterTemp: "", grindSize: "", ratio: "" },
          baristaRecipe: { baristaUserId: "", shopName: "", shopOriginId: null },
          recipeNotes: ""
        })
      }

      const { data: pivotData } = await supabase
        .from("post_tastes")
        .select("taste_id")
        .eq("post_id", postId)
      
      if (pivotData) {
        setSelectedTasteIds(pivotData.map(p => String(p.taste_id)))
      }

      setIsAuthChecked(true)
    }

    fetchPostAndVerify()
  }, [postId, currentLang])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!title.trim()) return
    if (imageUrls.length === 0) {
      setStatusMessage({ text: t.imageRequiredError, type: "error" })
      return
    }

    setSaving(true)
    
    try {
      const permanentImageUrls = await Promise.all(
        imageUrls.map((url: string) => serverMoveToPermanentStorage(url))
      )

      // 💡 複数選択に対応するため、posts テーブル本体から variety_id と process_id を除外
      const postPayload = {
        title: title.trim(),
        source_origin_id: selectedSource?.id || null,
        market_origin_id: selectedMarket?.id || null,
        tastes: tastes.trim(),
        description: description.trim() || null,
        image_urls: permanentImageUrls.length > 0 ? permanentImageUrls : null, // ✅ 配列のまま渡す
        visibility: visibility,
      }

      const { error: postError } = await supabase
        .from("posts")
        .update(postPayload)
        .eq("id", postId)

      if (postError) throw postError

      // 💡 品種 (Variety) 中間テーブルの更新ロジック (全削除 -> 再構築)
      await supabase.from("post_varieties").delete().eq("post_id", postId)
      if (varietyId) {
        const varietyIds = varietyId.split(",").map(id => parseInt(id.trim(), 10)).filter(Boolean)
        if (varietyIds.length > 0) {
          const varietyRows = varietyIds.map(vId => ({ post_id: postId, variety_id: vId }))
          const { error: vError } = await supabase.from("post_varieties").insert(varietyRows)
          if (vError) throw vError
        }
      }

      // 💡 精製方法 (Process) 中間テーブルの更新ロジック (全削除 -> 再構築)
      await supabase.from("post_processes").delete().eq("post_id", postId)
      if (processId) {
        const processIds = processId.split(",").map(id => parseInt(id.trim(), 10)).filter(Boolean)
        if (processIds.length > 0) {
          const processRows = processIds.map(pId => ({ post_id: postId, process_id: pId }))
          const { error: pError } = await supabase.from("post_processes").insert(processRows)
          if (pError) throw pError
        }
      }

      const { error: deleteGearsError } = await supabase.from("post_gears").delete().eq("post_id", postId)
      if (deleteGearsError) throw deleteGearsError

      const gearIds = Array.from(new Set(selectedGears.map(item => item.gearId).filter((id): id is number => id !== null)))
      if (gearIds.length > 0) {
        const { error: insertGearsError } = await supabase.from("post_gears").insert(
          gearIds.map(gearId => ({ post_id: postId, gear_id: gearId }))
        )
        if (insertGearsError) throw insertGearsError
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const cleanRatio = Number(recipeState.selfRecipe.ratio.replace(/[^0-9.]/g, "")) || null
        const linkedExpertId = recipeState.recipeMode === "barista"
          ? (recipeState.baristaRecipe.baristaUserId || null)
          : null
        let expertDisplayStatus: "approved" | "pending" = "approved"
        if (linkedExpertId) {
          const { data: linkedExpert } = await supabase
            .from("experts")
            .select("linked_posts_mode")
            .eq("user_id", linkedExpertId)
            .maybeSingle()
          expertDisplayStatus = linkedExpert?.linked_posts_mode === "review" ? "pending" : "approved"
        }

        const recipePayload: any = {
          post_id: postId,
          user_id: user.id,
          bean_name: title.trim(),
          mode: recipeState.recipeMode,
          temperature: recipeState.recipeMode === "self" ? (Number(recipeState.selfRecipe.waterTemp) || null) : null,
          grind_size: recipeState.recipeMode === "self" ? recipeState.selfRecipe.grindSize.trim() : null,
          brew_ratio: recipeState.recipeMode === "self" ? cleanRatio : null,
          barista_user_id: linkedExpertId,
          shop_name: recipeState.recipeMode === "barista" ? recipeState.baristaRecipe.shopName.trim() : null,
          shop_origin_id: recipeState.recipeMode === "barista" ? recipeState.baristaRecipe.shopOriginId : null,
          notes: recipeState.recipeNotes.trim() || null,
          is_template: false
        }

        const isExistingRecipe = 
          recipeState.editingRecipeId && 
          recipeState.editingRecipeId !== "new-recipe" && 
          recipeState.editingRecipeId !== "" &&
          (uuidPattern.test(String(recipeState.editingRecipeId)) || !/^\d+$/.test(String(recipeState.editingRecipeId)))

        if (isExistingRecipe) {
          const { data: currentRecipe } = await supabase
            .from("recipes")
            .select("barista_user_id")
            .eq("id", recipeState.editingRecipeId)
            .maybeSingle()
          if (currentRecipe?.barista_user_id !== linkedExpertId) {
            recipePayload.expert_display_status = linkedExpertId ? expertDisplayStatus : "approved"
            recipePayload.expert_is_pinned = false
          }
          const { error: recipeError } = await supabase
            .from("recipes")
            .update(recipePayload)
            .eq("id", recipeState.editingRecipeId)

          if (recipeError) throw recipeError
        } else {
          recipePayload.expert_display_status = linkedExpertId ? expertDisplayStatus : "approved"
          recipePayload.expert_is_pinned = false
          const { error: recipeError } = await supabase
            .from("recipes")
            .insert(recipePayload)

          if (recipeError) throw recipeError
        }
      }

      const { error: deletePivotError } = await supabase
        .from("post_tastes")
        .delete()
        .eq("post_id", postId)

      if (deletePivotError) throw deletePivotError

      if (selectedTasteIds && selectedTasteIds.length > 0) {
        const validTasteIds = selectedTasteIds.filter(id => id && String(id).trim() !== "")
        const uniqueTasteIds = Array.from(new Set(validTasteIds))

        if (uniqueTasteIds.length > 0) {
          const pivotRows = uniqueTasteIds.map(tasteId => ({
            post_id: postId,
            taste_id: tasteId
          }))

          const { error: insertPivotError } = await supabase
            .from("post_tastes")
            .insert(pivotRows)

          if (insertPivotError) throw insertPivotError
        }
      }

      const removedStoredUrls = Array.from(new Set([
        ...initialImageUrlsRef.current.filter((url) => !permanentImageUrls.includes(url)),
        ...pendingDeletedImageUrls.filter((url) => !permanentImageUrls.includes(url)),
      ]))
      if (removedStoredUrls.length > 0) {
        await Promise.all(removedStoredUrls.map(async (url) => {
          const response = await fetch("/api/delete-object", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          })
          if (!response.ok) {
            console.error("Failed to delete removed post image from R2:", url)
          }
        }))
      }

      initialImageUrlsRef.current = permanentImageUrls
      setImageUrls(permanentImageUrls)
      setPendingDeletedImageUrls([])

      setStatusMessage({ text: currentLang === "en" ? "Changes saved successfully" : "投稿を更新しました。", type: "success" })
      
      setTimeout(() => {
        router.push(`/${currentLang}/dashboard`)
      }, 1000)

    } catch (err: any) {
      console.error("Update Error:", err)
      setStatusMessage({ text: err.message || "更新に失敗しました。", type: "error" })
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    setShowDeleteModal(false)
    setStatusMessage(null)
    setDeleting(true)

    try {
      const res = await fetch("/api/delete-post", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ postId }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "削除に失敗しました。")
      }
      await res.json()

      initialImageUrlsRef.current = []
      setStatusMessage({ text: "投稿と画像を削除しました", type: "success" })
      
      setTimeout(() => {
        router.push(`/${currentLang}/dashboard`)
      }, 1000)
    } catch (err: any) {
      console.error(err)
      setStatusMessage({ text: err.message || "削除に失敗しました。", type: "error" })
    } finally {
      setDeleting(false)
    }
  }

  const handleRecipeChange = useCallback((updatedRecipes: any[]) => {
    if (!updatedRecipes || updatedRecipes.length === 0) return
    const r = updatedRecipes[0]
    setSelectedGears(r.equipments?.length ? r.equipments : [{ id: "1", name: "", gearId: null }])

    setRecipeState((prev) => {
      const isModeChanged = prev.recipeMode !== r.mode

      let isDataChanged = false
      if (r.mode === "self") {
        isDataChanged =
          String(prev.selfRecipe.waterTemp) !== String(r.waterTemp || "") ||
          String(prev.selfRecipe.grindSize) !== String(r.grindSize || "") ||
          String(prev.selfRecipe.ratio) !== String(r.ratio || "")
      } else if (r.mode === "barista") {
        isDataChanged =
          String(prev.baristaRecipe.baristaUserId) !== String(r.baristaUserId || "") ||
          String(prev.baristaRecipe.shopName) !== String(r.shopName || "") ||
          prev.baristaRecipe.shopOriginId !== (r.shopOriginId || null)
      }

      const isNotesChanged = String(prev.recipeNotes) !== String(r.notes || "")

      if (isModeChanged || isDataChanged || isNotesChanged) {
        return {
          editingRecipeId: (r.id && r.id !== "new-recipe" && !/^\d+$/.test(String(r.id))) ? r.id : prev.editingRecipeId,
          recipeMode: r.mode,
          selfRecipe: {
            dripper: "Hario V60",
            waterTemp: r.mode === "self" ? (r.waterTemp || "") : prev.selfRecipe.waterTemp,
            grindSize: r.mode === "self" ? (r.grindSize || "") : prev.selfRecipe.grindSize,
            ratio: r.mode === "self" ? (r.ratio || "") : prev.selfRecipe.ratio
          },
          baristaRecipe: {
            baristaUserId: r.mode === "barista" ? (r.baristaUserId || "") : prev.baristaRecipe.baristaUserId,
            shopName: r.mode === "barista" ? (r.shopName || "") : prev.baristaRecipe.shopName,
            shopOriginId: r.mode === "barista" ? (r.shopOriginId || null) : prev.baristaRecipe.shopOriginId
          },
          recipeNotes: r.notes || ""
        }
      }
      return prev
    })
  }, [])

  if (!isAuthChecked) return <FormSkeleton />

  if (!isAuthorized) {
    return (
      <main className="mx-auto flex min-h-[65vh] max-w-6xl items-center justify-center px-6 py-12 sm:px-10 md:px-14 lg:px-16">
        <section className="w-full max-w-lg rounded-3xl border border-neutral-200 bg-white/70 p-7 text-left shadow-sm backdrop-blur-sm sm:p-10">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-neutral-400">MEMBERSHIP</p>
          <h1 className="mt-4 text-2xl font-light tracking-[0.04em] text-neutral-900 sm:text-3xl">
            {currentLang === "en" ? "Editing is available to members" : "投稿の編集は会員限定です"}
          </h1>
          <p className="mt-5 text-sm leading-7 text-neutral-500">
            {currentLang === "en" 
              ? "To edit, manage, or delete posts, you must be logged in as the MEMBER who owns this post."
              : "投稿を編集・管理・削除するには、その投稿を所有する会員アカウントでログインしてください。"}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={`/${currentLang}/members`} className="flex-1 rounded-xl border border-neutral-900 bg-neutral-900 px-5 py-3 text-center text-xs font-semibold tracking-wide text-white transition hover:bg-neutral-700">
              {currentLang === "en" ? "VIEW MEMBERSHIP" : "プランを見る"}
            </Link>
            <Link href={`/${currentLang}`} className="flex-1 rounded-xl border border-neutral-200 bg-white px-5 py-3 text-center text-xs font-semibold tracking-wide text-neutral-700 transition hover:bg-neutral-50">
              {currentLang === "en" ? "BACK TO HOME" : "トップページへ戻る"}
            </Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-neutral-50/50 py-12 px-4 sm:px-6">
      <div className="bg-white border border-neutral-200 pt-6 sm:pt-12 pb-10 sm:pb-20 px-6 sm:px-12 rounded-xl shadow-sm w-full max-w-5xl mx-auto space-y-12">
        <div>
          <h2 className="text-[15px] font-semibold tracking-wider text-neutral-900 uppercase">
            {t.mainTitle}
          </h2>
          <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-500">
            {t.mainDesc}
          </p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-10 pt-2">
          
          <HeroImageUploader 
            currentLang={currentLang} 
            initialImageUrls={imageUrls}
            onImagesChanged={setImageUrls} 
            deferDeletion
            onRemovedImagesChanged={setPendingDeletedImageUrls}
            isAdmin={isAdmin}
          />
          
          <CoffeeBeansInfoForm 
            currentLang={currentLang}
            title={title}
            onChangeTitle={setTitle}
            variety={varietyId ? String(varietyId) : ""}
            onChangeVariety={setVarietyId}
            process={processId ? String(processId) : ""}
            onChangeProcess={setProcessId}
            tastes={tastes}
            onChangeTastes={setTastes}
            description={description}
            onChangeDescription={setDescription}
            sourceInput={sourceInput}
            onChangeSourceInput={setSourceInput}
            selectedSource={selectedSource as any}
            onSelectSource={(item) => setSelectedSource(item as any)}
            marketInput={marketInput}
            onChangeMarketInput={setMarketInput}
            selectedMarket={selectedMarket as any}
            onSelectMarket={(item) => setSelectedMarket(item as any)}
            isAdmin={isAdmin}
          />

          <BrewRecipeForm 
            currentLang={currentLang}
            syncInitialRecipes={true}
            initialRecipes={[{
              id: recipeState.editingRecipeId ? String(recipeState.editingRecipeId) : "new-recipe",
              mode: recipeState.recipeMode,
              equipments: selectedGears,
              waterTemp: recipeState.selfRecipe.waterTemp,
              grindSize: recipeState.selfRecipe.grindSize,
              ratio: recipeState.selfRecipe.ratio,
              tdsInput: "", 
              bloomTime: "",
              totalTime: "",
              pourSteps: [{ id: "1", amount: "", time: "" }],
              notes: String(recipeState.recipeNotes),
              baristaName: "",
              baristaUserId: recipeState.recipeMode === "barista" ? String(recipeState.baristaRecipe.baristaUserId) : "",
              shopName: recipeState.recipeMode === "barista" ? String(recipeState.baristaRecipe.shopName) : "",
              shopOriginId: recipeState.recipeMode === "barista" ? recipeState.baristaRecipe.shopOriginId : null,
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

          <div className="pt-4 border-t border-neutral-100 space-y-8">
            
            {statusMessage && (
              <div className={`text-xs p-4 rounded-xl border max-w-xl transition-all duration-300 ${
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
                  {(["draft", "private", "followers", "public"] as VisibilityType[]).map((type) => {
                    const labelMap = {
                      draft: t.statusDraft,
                      private: t.statusPrivate,
                      followers: t.statusFollowers,
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

            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-end gap-3.5">
              <button 
                type="submit" 
                disabled={saving || deleting || imageUrls.length === 0} 
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:w-auto bg-neutral-950 hover:bg-neutral-900 text-white border border-transparent px-10 py-3.5 rounded-full text-sm font-medium tracking-wider transition-all duration-300 shadow-sm hover:shadow active:scale-[0.98] disabled:opacity-50"
              >
                {saving ? t.submitting : t.submitButton}
              </button>

              <button 
                type="button"
                onClick={() => setShowDeleteModal(true)}
                disabled={saving || deleting}
                className="w-full sm:w-auto border border-red-200 text-red-600 hover:bg-red-50 px-8 py-3.5 rounded-full text-sm font-medium tracking-wider transition-all duration-300 disabled:opacity-40"
              >
                {deleting ? (currentLang === "en" ? "Deleting..." : "削除中...") : t.deleteButton}
              </button>
            </div>
          </div>
        </form>
      </div>

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-6 transform scale-100 transition-all duration-300">
            <div className="space-y-2">
              <h3 className="text-base font-bold text-neutral-900 tracking-wide">
                {t.confirmDeleteTitle}
              </h3>
              <p className="text-[13px] text-neutral-500 leading-relaxed whitespace-pre-wrap">
                {t.confirmDeleteDesc}
              </p>
            </div>
            
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 rounded-full border border-neutral-200 text-neutral-600 hover:bg-neutral-50 text-xs font-semibold tracking-wide transition-all duration-200"
              >
                {t.cancelButton}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm"
              >
                {t.deleteButton}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
