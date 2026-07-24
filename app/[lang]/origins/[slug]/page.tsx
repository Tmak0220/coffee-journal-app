export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { supabase } from "@/lib/supabase"
import PageLayout from "@/components/PageLayout"
import OriginPageClient from "./OriginPageClient"
import { SITE_URL } from "@/lib/site"

type Props = {
  params: Promise<{
    lang: string
    slug: string
  }>
}

async function getOriginWithBusinessProfile(slug: string) {
  // 1. origins テーブルから該当データを取得
  const { data: origin, error } = await supabase
    .from("origins")
    .select(`
      id, 
      slug,
      name, 
      name_ja, 
      type,
      display_name, 
      display_name_en, 
      user_id,
      parent_id,
      links,
      headquarters,
      headquarters_en,
      branches,
      branches_en,
      bio,
      bio_en
    `)
    .eq("slug", slug)
    .maybeSingle()

  if (error) {
    console.error("Failed to load origin profile:", error)
    return null
  }

  if (!origin) return null

  const { data: ownerUser } = origin.user_id
    ? await supabase
        .from("users")
        .select("avatar_url, cover_url")
        .eq("id", origin.user_id)
        .maybeSingle()
    : { data: null }

  // 2. クライアントコンポーネントの型要件に合わせてマッピングを最適化
  return {
    ...origin,
    owner_id: origin.user_id,
    avatar_url: ownerUser?.avatar_url || null,
    cover_url: ownerUser?.cover_url || null,
    tags: [] as string[],
    description: (origin.bio as string | null) || null,
    description_en: (origin.bio_en as string | null) || null,
    
    // jsonb / text の安全な文字列抽出処理
    headquarters: origin.headquarters || null,
    headquarters_en: origin.headquarters_en || null,
    
    branches: Array.isArray(origin.branches) ? origin.branches : [],
    branches_en: Array.isArray(origin.branches_en) ? origin.branches_en : [],
    links: Array.isArray(origin.links) ? origin.links : [],
    website_url: Array.isArray(origin.links) ? (origin.links as any[])?.[0]?.url || null : null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const lang = resolvedParams.lang || "ja"
  const isEn = lang === "en"

  const origin = await getOriginWithBusinessProfile(slug)

  if (!origin) {
    return {
      title: isEn ? "Origin Not Found | COFFEE JOURNAL" : "原産地が見つかりません | COFFEE JOURNAL",
    }
  }

  const name = isEn 
    ? (origin.display_name_en || origin.display_name || origin.name) 
    : (origin.display_name || origin.name_ja || origin.name)

  // descriptionの文字列型チェックを確実にして .slice を呼ぶ
  const displayBio = isEn ? origin.description_en : origin.description

  return {
    title: isEn 
      ? `${name} Archive & Profile | COFFEE JOURNAL`
      : `${name} 原産地アーカイブ＆プロフィール | COFFEE JOURNAL`,
    description: typeof displayBio === "string" && displayBio.length > 0
      ? displayBio.slice(0, 120)
      : isEn
        ? `Explore coffee details, roasters, farms, and news updates associated with ${name}.`
        : `${name}に関するコーヒー情報、生産地域、取り扱いロースターや農園のアーカイブを閲覧できます。`,
    alternates: { canonical: `${SITE_URL}/${lang}/origins/${encodeURIComponent(slug)}` },
  }
}

export default async function Page({ params }: Props) {
  const resolvedParams = await params
  const slug = resolvedParams.slug
  const lang = resolvedParams.lang || "ja"
  const currentLang = lang === "en" ? "en" : "ja"
  const isEn = currentLang === "en"

  const origin = await getOriginWithBusinessProfile(slug)

  if (!origin) {
    notFound()
  }

  // 関連ページを取得
  const { data: relatedOrigins } = await supabase
    .from("origins")
    .select("id, name, name_ja, display_name, display_name_en, slug")
    .eq("parent_id", origin.parent_id)
    .neq("slug", origin.slug)

  const sanitizedRelatedOrigins = (relatedOrigins || [])
    .sort(() => 0.5 - Math.random())
    .slice(0, 4)
    .map((o) => ({ 
      id: o.id,
      name: o.name,
      name_ja: o.name_ja,
      slug: o.slug,
      image_url: null
    }))

  const displayName = isEn 
    ? (origin.display_name_en || origin.display_name || origin.name) 
    : (origin.display_name || origin.name_ja || origin.name)

  const breadcrumbs = [
    { label: isEn ? "COFFEE JOURNAL" : "コーヒージャーナル", href: `/${currentLang}` },
    { label: isEn ? "Origins" : "原産地", href: `/${currentLang}/origins` },
    { label: displayName },
  ]

  return (
    <PageLayout breadcrumbs={breadcrumbs}>
      <OriginPageClient 
        origin={origin as any} 
        relatedOrigins={sanitizedRelatedOrigins} 
      />
    </PageLayout>
  )
}
