export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"
import PageLayout from "@/components/PageLayout"
import { supabase } from "@/lib/supabase"

type Props = {
  params: Promise<{ lang: string }>
  searchParams: Promise<{ category?: string; q?: string }>
}

type CategoryKey =
  | "barista"
  | "brewer"
  | "roaster"
  | "buyer"
  | "coach"
  | "cupper"
  | "technician"
  | "media"
  | "academic"
  | "geek"

type ExpertRow = {
  user_id: string
  display_name: string | null
  display_name_en: string | null
  bio_expert: string | null
  bio_expert_en: string | null
  current_store: string | null
  current_store_en: string | null
  primary_specialty: string | null
  primary_specialty_en: string | null
}

type UserRow = {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
}

type DirectoryExpert = {
  userId: string
  username: string
  displayName: string
  avatarUrl: string | null
  bio: string | null
  currentStore: string | null
  category: CategoryKey
}

const categories: Array<{
  key: CategoryKey
  ja: string
  en: string
  descriptionJa: string
  descriptionEn: string
}> = [
  { key: "barista", ja: "バリスタ", en: "Barista", descriptionJa: "抽出・サービス", descriptionEn: "Brewing & service" },
  { key: "brewer", ja: "ブリュワー", en: "Brewer", descriptionJa: "抽出技術・レシピ", descriptionEn: "Brewing & recipes" },
  { key: "roaster", ja: "ロースター", en: "Roaster", descriptionJa: "焙煎・プロファイル", descriptionEn: "Roasting & profiles" },
  { key: "buyer", ja: "バイヤー", en: "Buyer", descriptionJa: "調達・買付", descriptionEn: "Sourcing & buying" },
  { key: "coach", ja: "コーチ", en: "Coach", descriptionJa: "指導・育成", descriptionEn: "Coaching & education" },
  { key: "cupper", ja: "カッパー", en: "Cupper", descriptionJa: "品質評価・官能評価", descriptionEn: "Quality & sensory evaluation" },
  { key: "technician", ja: "テクニシャン", en: "Technician", descriptionJa: "機器・技術支援", descriptionEn: "Equipment & technical support" },
  { key: "media", ja: "メディア", en: "Media", descriptionJa: "編集・発信・記録", descriptionEn: "Editorial & communication" },
  { key: "academic", ja: "アカデミック", en: "Academic", descriptionJa: "研究・教育", descriptionEn: "Research & education" },
  { key: "geek", ja: "ギーク", en: "Geek", descriptionJa: "探究・実践", descriptionEn: "Exploration & practice" },
]

const categoryAliases: Record<string, CategoryKey> = {
  barista: "barista",
  バリスタ: "barista",
  brewer: "brewer",
  ブリュワー: "brewer",
  roaster: "roaster",
  ロースター: "roaster",
  buyer: "buyer",
  バイヤー: "buyer",
  coach: "coach",
  コーチ: "coach",
  cupper: "cupper",
  カッパー: "cupper",
  technician: "technician",
  テクニシャン: "technician",
  media: "media",
  メディア: "media",
  academic: "academic",
  アカデミック: "academic",
  geek: "geek",
  ギーク: "geek",
  ギーグ: "geek",
}

function normalizeCategory(...values: Array<string | null | undefined>): CategoryKey | null {
  for (const value of values) {
    const normalized = value?.trim().toLowerCase()
    if (normalized && categoryAliases[normalized]) return categoryAliases[normalized]
  }
  return null
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const isEn = lang === "en"

  return {
    title: isEn ? "EXPERTS - COFFEE JOURNAL" : "人物を探す - COFFEE JOURNAL",
    description: isEn
      ? "Discover people contributing to coffee through practice, research, technology, and communication."
      : "抽出、焙煎、研究、技術、発信など、コーヒーに関わる多様な人物を専門分野から探せます。",
  }
}

export default async function ExpertsPage({ params, searchParams }: Props) {
  const [{ lang }, filters] = await Promise.all([params, searchParams])
  const currentLang = lang === "en" ? "en" : "ja"
  const isEn = currentLang === "en"
  const selectedCategory = normalizeCategory(filters.category)
  const query = filters.q?.trim().toLocaleLowerCase() || ""

  const { data: expertData, error: expertError } = await supabase
    .from("experts")
    .select(
      "user_id, display_name, display_name_en, bio_expert, bio_expert_en, current_store, current_store_en, primary_specialty, primary_specialty_en"
    )
    .eq("is_approved", true)
    .eq("is_public", true)

  if (expertError) {
    console.error("Failed to load expert directory:", expertError)
  }

  const experts = (expertData || []) as ExpertRow[]
  const userIds = Array.from(new Set(experts.map((expert) => expert.user_id).filter(Boolean)))
  let users: UserRow[] = []

  if (userIds.length > 0) {
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("id, username, display_name, avatar_url")
      .in("id", userIds)

    if (userError) {
      console.error("Failed to load expert accounts:", userError)
    } else {
      users = (userData || []) as UserRow[]
    }
  }

  const usersById = new Map(users.map((user) => [user.id, user]))
  const directoryExperts: DirectoryExpert[] = experts.flatMap((expert) => {
    const user = usersById.get(expert.user_id)
    const category = normalizeCategory(expert.primary_specialty, expert.primary_specialty_en)
    if (!user?.username || !category) return []

    const displayName = (
      isEn
        ? expert.display_name_en || expert.display_name
        : expert.display_name || expert.display_name_en
    ) || user.display_name || user.username

    return [{
      userId: expert.user_id,
      username: user.username,
      displayName,
      avatarUrl: user.avatar_url,
      bio: isEn
        ? expert.bio_expert_en || expert.bio_expert
        : expert.bio_expert || expert.bio_expert_en,
      currentStore: isEn
        ? expert.current_store_en || expert.current_store
        : expert.current_store || expert.current_store_en,
      category,
    }]
  })

  const filteredExperts = directoryExperts.filter((expert) => {
    if (selectedCategory && expert.category !== selectedCategory) return false
    if (!query) return true

    return [expert.displayName, expert.username, expert.bio, expert.currentStore]
      .filter(Boolean)
      .some((value) => value!.toLocaleLowerCase().includes(query))
  })

  const counts = new Map<CategoryKey, number>()
  directoryExperts.forEach((expert) => {
    counts.set(expert.category, (counts.get(expert.category) || 0) + 1)
  })

  const visibleCategories = selectedCategory
    ? categories.filter((category) => category.key === selectedCategory)
    : categories

  const copy = isEn ? {
    subtitle: "People",
    breadcrumb: "People",
    eyebrow: "DIRECTORY",
    intro: "Explore people across brewing, roasting, sensory evaluation, sourcing, technology, coaching, research, media, and other fields connected to coffee.",
    categories: "Explore by primary category",
    all: "All",
    searchPlaceholder: "Search by name, profile, or affiliation",
    search: "Search",
    result: "people",
    empty: "No public profiles match these conditions.",
    profileFallback: "View profile and published work.",
  } : {
    subtitle: "人物",
    breadcrumb: "人物",
    eyebrow: "DIRECTORY",
    intro: "抽出、焙煎、品質評価、調達、技術、指導、研究、メディアなど、コーヒーに関わる人物を専門分野から探せます。",
    categories: "メインカテゴリから探す",
    all: "すべて",
    searchPlaceholder: "名前・プロフィール・所属から検索",
    search: "検索",
    result: "人",
    empty: "条件に一致する公開プロフィールはありません。",
    profileFallback: "プロフィールと公開中の活動を見ることができます。",
  }

  const categoryHref = (category?: CategoryKey) => {
    const next = new URLSearchParams()
    if (category) next.set("category", category)
    if (filters.q?.trim()) next.set("q", filters.q.trim())
    const suffix = next.toString()
    return `/${currentLang}/experts${suffix ? `?${suffix}` : ""}`
  }

  return (
    <div className="public-page-shell journal-page-wrapper w-full">
      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <PageLayout
          title="EXPERTS"
          subtitle={copy.subtitle}
          breadcrumbs={[
            { label: isEn ? "COFFEE JOURNAL" : "コーヒージャーナル", href: `/${currentLang}` },
            { label: copy.breadcrumb },
          ]}
        >
          <section className="mt-8 border-t border-neutral-200 pt-8 sm:mt-10 sm:pt-10">
            <div className="grid gap-6 rounded-2xl border border-neutral-200 bg-neutral-50/60 p-6 shadow-sm sm:grid-cols-[1fr_auto] sm:items-end sm:p-8">
              <div className="max-w-2xl">
                <p className="font-mono text-[10px] font-semibold tracking-[0.28em] text-neutral-400">
                  {copy.eyebrow}
                </p>
                <p className="mt-4 text-sm leading-7 text-neutral-700 sm:text-base sm:leading-8">
                  {copy.intro}
                </p>
              </div>
              <div className="flex items-baseline gap-2 border-t border-neutral-200 pt-4 sm:block sm:border-l sm:border-t-0 sm:py-1 sm:pl-8">
                <strong className="font-mono text-3xl font-medium tracking-tight text-neutral-900">
                  {directoryExperts.length}
                </strong>
                <span className="text-[10px] tracking-wider text-neutral-400 sm:mt-1 sm:block">
                  {isEn ? "PUBLIC PROFILES" : "公開プロフィール"}
                </span>
              </div>
            </div>

            <div className="mt-9">
              <div className="flex items-end justify-between gap-4">
                <h2 className="text-sm font-semibold tracking-wide text-neutral-900">
                  {copy.categories}
                </h2>
              </div>

              <div className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl border border-neutral-200 shadow-sm sm:grid-cols-3 lg:grid-cols-5">
                <Link
                  href={categoryHref()}
                  className={`group min-h-28 border-b border-r border-neutral-200 p-4 transition sm:p-5 ${
                    !selectedCategory
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "bg-white text-neutral-700 hover:bg-neutral-50"
                  }`}
                >
                  <span className={`font-mono text-[9px] tracking-[0.18em] ${!selectedCategory ? "text-white/50" : "text-neutral-300"}`}>
                    00
                  </span>
                  <span className="mt-5 block text-sm font-semibold">{copy.all}</span>
                  <span className={`mt-1 block text-[10px] ${!selectedCategory ? "text-white/55" : "text-neutral-400"}`}>
                    {directoryExperts.length} {copy.result}
                  </span>
                </Link>
                {categories.map((category, index) => {
                  const active = selectedCategory === category.key
                  return (
                    <Link
                      key={category.key}
                      href={categoryHref(category.key)}
                      className={`group min-h-28 border-b border-r border-neutral-200 p-4 transition sm:p-5 ${
                        active
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "bg-white text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      <span className={`font-mono text-[9px] tracking-[0.18em] ${active ? "text-white/50" : "text-neutral-300"}`}>
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="mt-5 block text-sm font-semibold transition group-hover:text-black">
                        {isEn ? category.en : category.ja}
                      </span>
                      <span className={`mt-1 block text-[10px] ${active ? "text-white/60" : "text-neutral-400"}`}>
                        {isEn ? category.descriptionEn : category.descriptionJa}
                        <span className="ml-1.5 font-mono">({counts.get(category.key) || 0})</span>
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>

            <form className="mt-6 flex gap-2" action={`/${currentLang}/experts`}>
              {selectedCategory && <input type="hidden" name="category" value={selectedCategory} />}
              <input
                type="search"
                name="q"
                defaultValue={filters.q || ""}
                placeholder={copy.searchPlaceholder}
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-5 py-4 text-sm shadow-sm outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:shadow-md"
              />
              <button
                type="submit"
                className="rounded-xl bg-neutral-900 px-7 py-4 text-xs font-semibold text-white shadow-sm transition hover:bg-neutral-700 hover:shadow-md sm:px-10"
              >
                {copy.search}
              </button>
            </form>
          </section>

          <section className="mt-14 space-y-14">
            {visibleCategories.map((category) => {
              const people = filteredExperts.filter((expert) => expert.category === category.key)
              if (people.length === 0) return null

              return (
                <div key={category.key}>
                  <div className="flex items-end justify-between border-b border-neutral-200 pb-4">
                    <div>
                      <p className="font-mono text-[10px] tracking-[0.2em] text-neutral-400">
                        {category.key.toUpperCase()}
                      </p>
                      <h2 className="mt-1 text-xl font-semibold tracking-tight text-neutral-900">
                        {isEn ? category.en : category.ja}
                      </h2>
                    </div>
                    <span className="font-mono text-xs text-neutral-400">{people.length}</span>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {people.map((person) => (
                      <Link
                        key={person.userId}
                        href={`/${currentLang}/experts/${encodeURIComponent(person.username)}`}
                        className="group flex min-h-44 flex-col justify-between rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-neutral-400 hover:shadow-md"
                      >
                        <div className="flex items-center gap-4">
                          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-50">
                            {person.avatarUrl ? (
                              <Image
                                src={person.avatarUrl}
                                alt=""
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <span className="text-lg font-semibold text-neutral-500">
                                {person.displayName.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h3 className="truncate text-base font-semibold text-neutral-900">
                              {person.displayName}
                            </h3>
                            <p className="mt-1 truncate font-mono text-[10px] text-neutral-400">
                              @{person.username}
                            </p>
                          </div>
                        </div>

                        <p className="mt-5 line-clamp-2 text-xs leading-6 text-neutral-600">
                          {person.bio || copy.profileFallback}
                        </p>

                        <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
                          <span className="truncate text-[10px] text-neutral-400">
                            {person.currentStore || (isEn ? category.descriptionEn : category.descriptionJa)}
                          </span>
                          <span aria-hidden className="ml-3 text-neutral-400 transition group-hover:translate-x-1 group-hover:text-neutral-900">
                            →
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )
            })}

            {filteredExperts.length === 0 && (
              <div className="rounded-2xl border border-dashed border-neutral-200 px-6 py-16 text-center">
                <p className="text-sm text-neutral-500">{copy.empty}</p>
              </div>
            )}
          </section>
        </PageLayout>
      </div>
    </div>
  )
}
