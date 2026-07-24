import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const admin = () => createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

function idsFrom(params: URLSearchParams, key: string, max: number) {
  return (params.get(key) || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^[a-zA-Z0-9-]+$/.test(value))
    .slice(0, max)
}

async function matchingIds(
  table: string,
  parentColumn: string,
  valueColumn: string,
  values: string[],
) {
  if (values.length === 0) return null
  const { data, error } = await admin()
    .from(table)
    .select(`${parentColumn}, ${valueColumn}`)
    .in(valueColumn, values)
  if (error) throw error

  const grouped = new Map<string, Set<string>>()
  ;(data || []).forEach((row: any) => {
    const parentId = String(row[parentColumn])
    const matchedValues = grouped.get(parentId) || new Set<string>()
    matchedValues.add(String(row[valueColumn]))
    grouped.set(parentId, matchedValues)
  })

  return new Set(
    Array.from(grouped.entries())
      .filter(([, matchedValues]) => matchedValues.size === values.length)
      .map(([parentId]) => parentId),
  )
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams
    const varietyIds = idsFrom(params, "variety_id", 3)
    const processIds = idsFrom(params, "process_id", 3)
    const tasteIds = idsFrom(params, "taste_ids", 4)
    const gearIds = idsFrom(params, "gear_ids", 3)

    const [varietyPosts, processPosts, tastePosts, gearPosts, gearRecipes] = await Promise.all([
      matchingIds("post_varieties", "post_id", "variety_id", varietyIds),
      matchingIds("post_processes", "post_id", "process_id", processIds),
      matchingIds("post_tastes", "post_id", "taste_id", tasteIds),
      matchingIds("post_gears", "post_id", "gear_id", gearIds),
      matchingIds("pro_recipe_gears", "pro_recipe_id", "gear_id", gearIds),
    ])

    const postSets = [varietyPosts, processPosts, tastePosts, gearPosts].filter(Boolean) as Set<string>[]
    const postIds = postSets.length === 0
      ? []
      : Array.from(postSets[0]).filter((postId) => postSets.every((set) => set.has(postId)))

    // 検証記事に品種・精製・テイストの関連テーブルはないため、
    // 器具だけで検索した場合に限り、関連する検証記事を返す。
    const canMatchRecipes = gearIds.length > 0
      && varietyIds.length === 0
      && processIds.length === 0
      && tasteIds.length === 0
    const recipeIds = canMatchRecipes && gearRecipes ? Array.from(gearRecipes) : []

    return NextResponse.json({ postIds, recipeIds })
  } catch (error) {
    console.error("Related-content search failed:", error)
    return NextResponse.json({ error: "Failed to resolve related content" }, { status: 500 })
  }
}
