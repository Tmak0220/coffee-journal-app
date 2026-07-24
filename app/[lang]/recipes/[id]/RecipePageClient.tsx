"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import PostLoading from "./loading"
import CoffeeBeanLikeIcon from "@/components/CoffeeBeanLikeIcon"

// ----------------------------------------------------
// DBテーブル型定義
// ----------------------------------------------------

export type PourStep = {
  time?: string | number
  water?: number
  note?: string
}

export type Recipe = {
  id: string
  user_id: string
  post_id?: string | null
  is_template: boolean
  template_title?: string | null
  bean_name?: string | null
  temperature?: number | null
  grind_size?: string | null
  brew_ratio?: number | null
  tds?: number | null
  extraction_yield_approx?: number | null
  extraction_yield_corrected?: number | null
  bloom_time_seconds?: number | null
  total_time_seconds?: number | null
  gears?: string[] | null
  pour_steps?: PourStep[] | null
  notes?: string | null
  created_at: string
  barista_name?: string | null
  mode?: string | null
  shop_name?: string | null
  sort_order: number
  barista_user_id?: string | null

  // Supabase JOIN データ
  users?: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
  posts?: {
    id: string
    title: string | null
    image_urls: string[] | null
  } | null
}

type Props = {
  lang: string
  recipeId?: string | null
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

// 多言語辞書
const pageDict = {
  ja: {
    titleRecipe: "抽出レシピ",
    notFound: "レシピが見つかりませんでした",
    labelBarista: "バリスタ / 投稿者",
    anonymous: "名称非公開",
    requireMemberError: "本機能の利用にはMEMBER登録が必要です。",
    btnGoRegister: "登録画面へ",
    btnSaved: "保存済み",
    btnSave: "保存する",
    btnFollowing: "フォロー中",
    btnFollow: "フォローする",
    labelTemperature: "湯温",
    labelGrindSize: "挽き目",
    labelBrewRatio: "抽出比率",
    labelTotalTime: "抽出時間",
    labelGears: "使用器具",
    labelPourSteps: "注ぎ工程",
    labelNotes: "メモ / 補足",
  },
  en: {
    titleRecipe: "Brew Recipe",
    notFound: "Recipe not found.",
    labelBarista: "Barista / Author",
    anonymous: "Anonymous",
    requireMemberError: "Membership is required to use this feature.",
    btnGoRegister: "Sign Up",
    btnSaved: "Saved",
    btnSave: "Save",
    btnFollowing: "Following",
    btnFollow: "Follow",
    labelTemperature: "Water Temp",
    labelGrindSize: "Grind Size",
    labelBrewRatio: "Brew Ratio",
    labelTotalTime: "Total Time",
    labelGears: "Gears",
    labelPourSteps: "Pouring Steps",
    labelNotes: "Notes",
  }
} as const

export default function RecipesPageClient({ lang, recipeId }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = pageDict[currentLang]

  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isTierMember, setIsTierMember] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [likeLoading, setLikeLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  useEffect(() => {
    const initPage = async () => {
      setLoading(true)

      // ユーザー認証チェック
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null
      setCurrentUserId(userId)

      if (user) {
        const isAdmin = user?.user_metadata?.role === "admin" || user?.role === "admin" || user?.app_metadata?.role === "admin"
        const { data: memberData } = await supabase
          .from("users")
          .select("membership_tier")
          .eq("id", user.id)
          .maybeSingle()

        setIsTierMember(isAdmin || (!!memberData?.membership_tier && memberData.membership_tier !== "free"))
      }

      if (recipeId) {
        // 1. レシピ本体の取得 (JOIN: users, posts)
        const { data: recipeData, error: recipeError } = await supabase
          .from("recipes")
          .select(`
            *,
            users (id, username, display_name, avatar_url),
            posts (id, title, image_urls)
          `)
          .eq("id", recipeId)
          .maybeSingle()

        let currentRecipe: Recipe
        let isProRecipe = false

        if (recipeData) {
          currentRecipe = recipeData as Recipe
        } else {
          const { data: proRecipe, error: proRecipeError } = await supabase
            .from("pro_recipes")
            .select("*")
            .eq("id", recipeId)
            .maybeSingle()

          if (proRecipeError || !proRecipe) {
            console.error("レシピ取得エラー:", recipeError || proRecipeError)
            setLoading(false)
            return
          }

          const { data: author } = await supabase
            .from("users")
            .select("id, username, display_name, avatar_url")
            .eq("id", proRecipe.user_id)
            .maybeSingle()

          isProRecipe = true
          currentRecipe = {
            id: proRecipe.id,
            user_id: proRecipe.user_id,
            is_template: false,
            template_title: proRecipe.recipe_title,
            bean_name: proRecipe.bean_name,
            temperature: proRecipe.temp,
            grind_size: proRecipe.grind_size,
            brew_ratio: proRecipe.ratio,
            tds: proRecipe.tds,
            bloom_time_seconds: null,
            total_time_seconds: null,
            notes: [proRecipe.log_purpose, proRecipe.log_process, proRecipe.log_conclusion].filter(Boolean).join("\n\n") || null,
            created_at: proRecipe.created_at,
            sort_order: 0,
            users: author
          }
        }

        if (isProRecipe) {
          const { data: proGearRows } = await supabase
            .from("pro_recipe_gears")
            .select("gear_id")
            .eq("pro_recipe_id", currentRecipe.id)
            .order("sort_order")
          const gearIds = (proGearRows || []).map(row => row.gear_id)
          if (gearIds.length > 0) {
            const { data: gearRows } = await supabase.from("gears").select("id, name, name_ja").in("id", gearIds)
            const gearMap = new Map((gearRows || []).map(gear => [gear.id, gear]))
            currentRecipe.gears = gearIds.flatMap(gearId => {
              const gear = gearMap.get(gearId)
              return gear ? [currentLang === "ja" ? (gear.name_ja || gear.name) : gear.name] : []
            })
          }
        }

        // 2. 紐づく post_id がある場合、投稿に登録された器具を取得
        if (currentRecipe.post_id) {
          const { data: postGearRows } = await supabase
            .from("post_gears")
            .select("gear_id")
            .eq("post_id", currentRecipe.post_id)

          const gearIds = (postGearRows || []).map(row => row.gear_id)
          if (gearIds.length > 0) {
            const { data: gearRows } = await supabase
              .from("gears")
              .select("id, name, name_ja")
              .in("id", gearIds)
            const gearMap = new Map((gearRows || []).map(gear => [gear.id, gear]))
            currentRecipe.gears = gearIds.flatMap(gearId => {
              const gear = gearMap.get(gearId)
              return gear ? [currentLang === "ja" ? (gear.name_ja || gear.name) : gear.name] : []
            })
          } else {
            currentRecipe.gears = []
          }

        }

        setRecipe(currentRecipe)

        // 3. いいね数・フォロー・ブックマーク状態の読み込み
        const targetPostId = currentRecipe.post_id || currentRecipe.id
        const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", targetPostId)
        setLikeCount(count || 0)

        if (user) {
          const { data: likedData } = await supabase.from("likes").select("id").eq("post_id", targetPostId).eq("user_id", user.id).maybeSingle()
          setLiked(!!likedData)

          if (currentRecipe.users?.id) {
            const { data: followData } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", currentRecipe.users.id).maybeSingle()
            setFollowing(!!followData)
          }

          const { data: bookmarkData } = await supabase.from("bookmarks").select("id").eq("post_id", targetPostId).eq("user_id", user.id).maybeSingle()
          setBookmarked(!!bookmarkData)
        }
      }

      setLoading(false)
    }

    initPage()
  }, [recipeId, currentLang])

  const requirePlus = () => {
    if (!currentUserId || !isTierMember) {
      setStatusMessage({ text: t.requireMemberError, type: "error" })
      return false
    }
    return true
  }

  const handleLike = async () => {
    setStatusMessage(null)
    const targetPostId = recipe?.post_id || recipe?.id
    if (!requirePlus() || !currentUserId || !targetPostId || likeLoading) return
    
    setLikeLoading(true)
    try {
      if (liked) {
        await supabase.from("likes").delete().eq("post_id", targetPostId).eq("user_id", currentUserId)
        setLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        await supabase.from("likes").insert({ post_id: targetPostId, user_id: currentUserId })
        setLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error("Like error:", err)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleFollow = async () => {
    setStatusMessage(null)
    if (!requirePlus() || !currentUserId || !recipe?.users?.id || followLoading) return
    
    setFollowLoading(true)
    try {
      if (following) {
        await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", recipe.users.id)
        setFollowing(false)
      } else {
        await supabase.from("follows").insert({ follower_id: currentUserId, following_id: recipe.users.id })
        setFollowing(true)
      }
    } catch (err) {
      console.error("Follow error:", err)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleBookmark = async () => {
    setStatusMessage(null)
    const targetPostId = recipe?.post_id || recipe?.id
    if (!requirePlus() || !currentUserId || !targetPostId || bookmarkLoading) return

    setBookmarkLoading(true)
    try {
      if (bookmarked) {
        await supabase.from("bookmarks").delete().eq("post_id", targetPostId).eq("user_id", currentUserId)
        setBookmarked(false)
      } else {
        await supabase.from("bookmarks").insert({ post_id: targetPostId, user_id: currentUserId })
        setBookmarked(true)
      }
    } catch (err) {
      console.error("Bookmark error:", err)
    } finally {
      setBookmarkLoading(false)
    }
  }

  if (loading) return <PostLoading />

  if (!recipe) {
    return (
      <div className="max-w-6xl mx-auto my-24 p-6 text-center text-sm text-neutral-400">
        {t.notFound}
      </div>
    )
  }

  const isOwnPost = currentUserId === recipe.user_id

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_3%,rgba(180,112,32,0.07),transparent_28%),radial-gradient(circle_at_90%_10%,rgba(71,127,151,0.06),transparent_27%)] px-4 py-8 animate-fadeIn sm:px-8 md:py-12">
      <div className="mx-auto max-w-5xl space-y-8 rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.32)] backdrop-blur-sm sm:space-y-10 sm:rounded-[30px] sm:p-9 md:p-12">
      {/* ユーザーヘッダー */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5 sm:pb-6">
        <div className="flex min-w-0 items-center gap-3.5">
          <div className="relative w-11 h-11 shrink-0 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
            {recipe.users?.avatar_url ? (
              <Image src={recipe.users.avatar_url} alt="" fill sizes="44px" className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300 text-xs font-mono">
                {recipe.users?.username?.slice(0, 2).toUpperCase() || "CU"}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wider text-neutral-400 uppercase">{t.labelBarista}</p>
            <span className="block truncate text-[14px] font-semibold text-neutral-800">
              {recipe.barista_name || recipe.users?.display_name || recipe.users?.username || t.anonymous}
            </span>
            {recipe.shop_name && (
              <span className="text-xs text-neutral-400 ml-2">(@{recipe.shop_name})</span>
            )}
          </div>
        </div>

        {!isOwnPost && (
          <button 
            onClick={handleFollow} 
            disabled={followLoading}
            className={`shrink-0 rounded-xl border px-4 py-2.5 text-xs font-semibold tracking-wide transition-all duration-200 sm:px-5 ${
              following 
                ? "bg-neutral-100 text-neutral-500 border-neutral-200/80" 
                : "bg-white text-neutral-900 border-neutral-900 hover:bg-neutral-50"
            }`}
          >
            {following ? t.btnFollowing : t.btnFollow}
          </button>
        )}
      </div>

      {/* レシピメインコンテンツ */}
      <div className="space-y-7 rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50/55 via-white to-white p-4 shadow-[0_18px_55px_-42px_rgba(14,116,144,0.45)] sm:space-y-8 sm:rounded-3xl sm:p-8">
        <div>
          <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-400 uppercase">{t.titleRecipe}</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-neutral-950 sm:text-4xl">
            {recipe.template_title || recipe.bean_name || "Coffee Recipe"}
          </h1>
          {recipe.bean_name && recipe.template_title && (
            <p className="text-sm font-medium text-neutral-500 mt-1">Beans: {recipe.bean_name}</p>
          )}
        </div>

        {/* 主要パラメータ グリッド表示 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-neutral-100">
          {recipe.temperature && (
            <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-100">
              <span className="text-[10px] font-mono text-neutral-400 block">{t.labelTemperature}</span>
              <span className="text-base font-bold text-neutral-800">{recipe.temperature}°C</span>
            </div>
          )}
          {recipe.grind_size && (
            <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-100">
              <span className="text-[10px] font-mono text-neutral-400 block">{t.labelGrindSize}</span>
              <span className="text-base font-bold text-neutral-800">{recipe.grind_size}</span>
            </div>
          )}
          {recipe.brew_ratio && (
            <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-100">
              <span className="text-[10px] font-mono text-neutral-400 block">{t.labelBrewRatio}</span>
              <span className="text-base font-bold text-neutral-800">1 : {recipe.brew_ratio}</span>
            </div>
          )}
          {recipe.total_time_seconds && (
            <div className="bg-neutral-50/80 p-3.5 rounded-xl border border-neutral-100">
              <span className="text-[10px] font-mono text-neutral-400 block">{t.labelTotalTime}</span>
              <span className="text-base font-bold text-neutral-800">{recipe.total_time_seconds}s</span>
            </div>
          )}
        </div>

        {/* Gears (使用器具) */}
        {recipe.gears && recipe.gears.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase">{t.labelGears}</h3>
            <div className="flex flex-wrap gap-2">
              {recipe.gears.map((gear, idx) => (
                <span key={idx} className="text-xs font-medium px-3 py-1 bg-neutral-100 rounded-full text-neutral-700">
                  {gear}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Pour Steps (注ぎ工程) */}
        {recipe.pour_steps && recipe.pour_steps.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase">{t.labelPourSteps}</h3>
            <div className="space-y-2">
              {recipe.pour_steps.map((step, idx) => (
                <div key={idx} className="flex items-center gap-4 text-xs p-3 bg-neutral-50/50 rounded-xl border border-neutral-100">
                  <span className="font-mono font-bold text-neutral-400 w-6">0{idx + 1}</span>
                  {step.time && <span className="font-mono font-semibold text-neutral-800 w-16">{step.time}s</span>}
                  {step.water && <span className="font-mono font-semibold text-neutral-800 w-16">{step.water}g</span>}
                  {step.note && <span className="text-neutral-600 flex-1">{step.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        {recipe.notes && (
          <div className="space-y-1.5 pt-2 border-t border-neutral-100">
            <h3 className="text-xs font-mono font-bold text-neutral-400 uppercase">{t.labelNotes}</h3>
            <p className="text-xs text-neutral-600 leading-relaxed whitespace-pre-line">{recipe.notes}</p>
          </div>
        )}
      </div>

      {/* インタラクションエリア (いいね・保存) */}
      <div className="pt-2 border-t border-neutral-100 space-y-4">
        <div className="flex items-center gap-4 w-full">
          <button 
            onClick={handleLike} 
            disabled={likeLoading}
            aria-label="Like this recipe"
            className={`h-12 px-5 rounded-xl border flex items-center justify-center gap-3 transition-all duration-200 group shrink-0 active:scale-95 ${
              liked 
                ? "bg-neutral-900 border-neutral-900 text-white" 
                : "bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400"
            }`}
          >
            <CoffeeBeanLikeIcon active={liked} className="h-6 w-5" />
            <span className="font-mono text-sm font-bold select-none">{likeCount}</span>
          </button>

          <button 
            onClick={handleBookmark} 
            disabled={bookmarkLoading}
            className={`h-12 px-8 text-xs tracking-widest font-bold uppercase rounded-xl border flex-1 transition-all duration-200 active:scale-[0.99] ${
              bookmarked 
                ? "bg-neutral-900 text-white border-neutral-900" 
                : "bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400"
            }`}
          >
            {bookmarked ? t.btnSaved : t.btnSave}
          </button>
        </div>

        {statusMessage && (
          <div className="text-xs p-4 rounded-xl border flex items-center justify-between gap-4 text-red-600 bg-red-50/60 border-red-200/80 animate-fadeIn">
            <span className="font-medium leading-relaxed">{statusMessage.text}</span>
            <Link href={`/${currentLang}/members`} className="underline font-bold text-[11px] uppercase tracking-wider shrink-0 text-red-700 hover:text-red-900">
              {t.btnGoRegister}
            </Link>
          </div>
        )}
      </div>
      </div>
    </main>
  )
}
