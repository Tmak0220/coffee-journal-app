import type { Metadata } from "next"
import { createClient } from "@/lib/supabase-server"
import { canViewContent } from "@/lib/permissions"
import RecipePageClient from "./RecipePageClient"
import ProVerificationDetail from "./ProVerificationDetail"
import { notFound } from "next/navigation"

type Props = {
  params: Promise<{
    lang: string
    id: string
  }>
}

async function getProVerification(id: string, lang: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recipe, error } = await supabase
    .from("pro_recipes")
    .select("*")
    .eq("id", id)
    .eq("lang", lang === "en" ? "en" : "ja")
    .maybeSingle()

  if (error || !recipe) return null

  const isOwner = Boolean(user && recipe.user_id === user.id)
  const visibility = recipe.visibility || "public"
  if (!canViewContent({ visibility, viewerId: user?.id, ownerId: recipe.user_id })) return { denied: true as const }

  const [{ data: author }, { data: gearLinks }] = await Promise.all([
    supabase
      .from("users")
      .select("id, username, display_name, display_name_en, avatar_url")
      .eq("id", recipe.user_id)
      .maybeSingle(),
    supabase
      .from("pro_recipe_gears")
      .select("gear_id, sort_order")
      .eq("pro_recipe_id", recipe.id)
      .order("sort_order"),
  ])

  const gearIds = (gearLinks || []).map((link) => link.gear_id)
  const { data: gearRows } = gearIds.length
    ? await supabase.from("gears").select("id, type, name, name_ja, brand, brand_ja").in("id", gearIds)
    : { data: [] }
  const gearMap = new Map((gearRows || []).map((gear) => [gear.id, gear]))
  const gears = gearIds.flatMap((gearId) => {
    const gear = gearMap.get(gearId)
    return gear ? [gear] : []
  })

  return { recipe, author, gears, isOwner, currentUserId: user?.id || null, viewerIsSignedIn: Boolean(user) }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, id } = await params
  const result = await getProVerification(id, lang)
  const recipe = result && !("denied" in result) ? result.recipe : null
  const isEn = lang === "en"

  return {
    title: recipe?.recipe_title || (isEn ? "Verification Article" : "検証記事"),
    description: recipe?.log_conclusion || recipe?.log_purpose || (isEn
      ? "Coffee verification article and extraction data."
      : "コーヒーの検証記事・抽出データです。"),
  }
}

export default async function RecipePage({ params }: Props) {
  const { lang, id } = await params
  const currentLang = lang === "en" ? "en" : "ja"
  const verification = await getProVerification(id, currentLang)

  if (verification && "denied" in verification) notFound()

  if (verification) {
    return <ProVerificationDetail {...verification} lang={currentLang} />
  }

  // 通常のrecipesテーブルに保存された抽出レシピは既存表示を利用する。
  return <RecipePageClient lang={currentLang} recipeId={id} />
}
