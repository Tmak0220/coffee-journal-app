"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Post = {
  id: string
  title: string
  description?: string
  image_urls: string[] | null
  created_at: string
  visibility?: "draft" | "private" | "members" | "public"
  type?: string | null
  event_origin_id?: number | null
}

type PostCategory = "all" | "tasting" | "event" | "gear"

type PostListProps = {
  userId: string
  lang?: string
}

const postListDict = {
  ja: {
    emptyMessage: "該当する投稿データがありません。",
    moreImages: (count: number) => `他 ${count} 枚`,
    filterNewest: "新しい順",
    filterOldest: "古い順",
    allMonths: "すべての年月",
    allVisibilities: "すべてのステータス",
    allCategories: "すべての投稿",
    categoryTasting: "テイスティング",
    categoryEvent: "イベント",
    categoryGear: "ギア",
    loadMore: "もっと見る",
    loading: "読み込み中...",
    statusDraft: "下書き",
    statusPrivate: "非公開",
    statusFollowers: "ログインユーザー限定",
    statusPublic: "公開",
    locale: "ja-JP",
    btnView: "表示",
    btnEdit: "編集"
  },
  en: {
    emptyMessage: "No posts found.",
    moreImages: (count: number) => `+${count} photos`,
    filterNewest: "Newest first",
    filterOldest: "Oldest first",
    allMonths: "All Months",
    allVisibilities: "All Visibilities",
    allCategories: "All Posts",
    categoryTasting: "Tasting",
    categoryEvent: "Event",
    categoryGear: "Gear",
    loadMore: "Load More",
    loading: "Loading...",
    statusDraft: "Draft",
    statusPrivate: "Private",
    statusFollowers: "Signed-in Users",
    statusPublic: "Public",
    locale: "en-US",
    btnView: "View",
    btnEdit: "Edit"
  }
}

const ITEMS_PER_PAGE = 24

const parseSafeUrls = (input: string[] | null): string[] =>
  (input ?? []).map(url => url.trim()).filter(url => url.startsWith("http"))

export default function PostList({ userId, lang = "ja" }: PostListProps) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = postListDict[currentLang]

  const [posts, setPosts] = useState<Post[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [page, setPage] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>("all")
  const [selectedVisibility, setSelectedVisibility] = useState<string>("all")
  const [selectedCategory, setSelectedCategory] = useState<PostCategory>("all")

  const availableMonths = useMemo(() => {
    const months: string[] = []
    const startYear = 2018
    const currentYear = new Date().getFullYear()
    
    for (let year = currentYear; year >= startYear; year--) {
      for (let month = 12; month >= 1; month--) {
        const monthStr = String(month).padStart(2, "0")
        months.push(`${year}-${monthStr}`)
      }
    }
    return months
  }, [])

  const fetchPosts = async (isInitial = false) => {
    if (!userId || loading) return
    setLoading(true)

    const currentPage = isInitial ? 0 : page
    const from = currentPage * ITEMS_PER_PAGE
    const to = from + ITEMS_PER_PAGE - 1

    try {
      let query = supabase
        .from("posts")
        .select("id, title, description, image_urls, created_at, visibility, type, event_origin_id", { count: "exact" })
        .eq("user_id", userId)
        .eq("lang", currentLang)
        .order("created_at", { ascending: sortOrder === "oldest" })
        .range(from, to)

      if (selectedYearMonth !== "all") {
        const [yearStr, monthStr] = selectedYearMonth.split("-")
        const startOfMonth = `${yearStr}-${monthStr}-01T00:00:00Z`
        
        const year = parseInt(yearStr, 10)
        const month = parseInt(monthStr, 10)
        const nextYear = month === 12 ? year + 1 : year
        const nextMonth = month === 12 ? 1 : month + 1
        const nextMonthStr = String(nextMonth).padStart(2, "0")
        const startOfNextMonth = `${nextYear}-${nextMonthStr}-01T00:00:00Z`

        query = query.gte("created_at", startOfMonth).lt("created_at", startOfNextMonth)
      }

      if (selectedVisibility !== "all") {
        query = query.eq("visibility", selectedVisibility)
      }

      if (selectedCategory === "tasting") {
        query = query.eq("type", "blog")
      } else if (selectedCategory === "event") {
        query = query.eq("type", "event")
      } else if (selectedCategory === "gear") {
        query = query.eq("type", "gear_review")
      }

      const { data, count, error } = await query
      if (error) throw error

      if (data) {
        if (isInitial) {
          setPosts(data as Post[])
        } else {
          setPosts(prev => [...prev, ...(data as Post[])])
        }
        
        if (count !== null) setTotalCount(count)
        setHasMore(data.length === ITEMS_PER_PAGE)
        setPage(currentPage + 1)
      }
    } catch (err: any) {
      console.error("Error fetching posts:", err?.message || err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts(true)
  }, [userId, currentLang, sortOrder, selectedYearMonth, selectedVisibility, selectedCategory])

  const getCategory = (post: Post): Exclude<PostCategory, "all"> => {
    if (post.type === "gear_review") return "gear"
    if (post.type === "event" || post.event_origin_id) return "event"
    return "tasting"
  }

  const getCategoryLabel = (category: Exclude<PostCategory, "all">) => ({
    tasting: t.categoryTasting,
    event: t.categoryEvent,
    gear: t.categoryGear,
  }[category])

  const getStatusBadge = (visibility: Post["visibility"]) => {
    const baseStyle = "inline-flex min-w-[88px] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border px-2.5 py-1 text-[10px] font-medium uppercase tracking-wider select-none"
    switch (visibility) {
      case "draft": 
        return (
          <span className={`${baseStyle} bg-neutral-50 text-neutral-500 border-neutral-200`}>
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />
            {t.statusDraft}
          </span>
        )
      case "private": 
        return (
          <span className={`${baseStyle} bg-red-50 text-red-600 border-red-100`}>
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            {t.statusPrivate}
          </span>
        )
      case "members": 
        return (
          <span className={`${baseStyle} bg-blue-50 text-blue-600 border-blue-100`}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            {t.statusFollowers}
          </span>
        )
      case "public":
      default: 
        return (
          <span className={`${baseStyle} bg-neutral-900 text-white border-transparent`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t.statusPublic}
          </span>
        )
    }
  }

  const selectBoxStyle = "text-[14px] font-normal border border-neutral-200 hover:border-neutral-400 rounded-xl px-4 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-neutral-900 focus:ring-4 focus:ring-neutral-100 cursor-pointer transition-all duration-300 pr-9 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat shadow-sm"
  const actionButtonStyle = "text-[13px] font-medium border rounded-xl py-2.5 transition-all duration-300 active:scale-[0.97] select-none text-center flex-1"
  const getEditHref = (post: Post) => {
    if (post.type === "event") return `/${currentLang}/edit/event/${post.id}`
    if (post.type === "gear_review") return `/${currentLang}/edit/gear/${post.id}`
    return `/${currentLang}/edit-post/${post.id}`
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 rounded-2xl border border-neutral-200 bg-white px-5 pb-10 pt-6 shadow-sm sm:px-8 sm:pb-12 sm:pt-8">
      
      {/* ヘッダーセクション */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-100 pb-5">
        <div>
          <h2 className="text-[15px] font-bold tracking-wider text-neutral-900 uppercase">
            ARTICLES
          </h2>
          <p className="mt-0.5 text-[11px] font-mono tracking-wider text-neutral-400">
            TOTAL: {totalCount} POSTS
          </p>
        </div>
        
        {/* フィルター群 */}
        <div className="flex flex-wrap items-center gap-2">
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as PostCategory)} className={selectBoxStyle}>
            <option value="all">{t.allCategories}</option>
            <option value="tasting">{t.categoryTasting}</option>
            <option value="event">{t.categoryEvent}</option>
            <option value="gear">{t.categoryGear}</option>
          </select>

          <select value={selectedVisibility} onChange={(e) => setSelectedVisibility(e.target.value)} className={selectBoxStyle}>
            <option value="all">{t.allVisibilities}</option>
            <option value="draft">{t.statusDraft}</option>
            <option value="private">{t.statusPrivate}</option>
            <option value="members">{t.statusFollowers}</option>
            <option value="public">{t.statusPublic}</option>
          </select>

          <select value={selectedYearMonth} onChange={(e) => setSelectedYearMonth(e.target.value)} className={selectBoxStyle}>
            <option value="all">{t.allMonths}</option>
            {availableMonths.map((ym) => {
              const [year, month] = ym.split("-")
              return (
                <option key={ym} value={ym}>
                  {currentLang === "ja" ? `${year}年${parseInt(month, 10)}月` : ym}
                </option>
              )
            })}
          </select>

          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className={selectBoxStyle}>
            <option value="newest">{t.filterNewest}</option>
            <option value="oldest">{t.filterOldest}</option>
          </select>
        </div>
      </div>

      {/* スケルトンローディング */}
      {loading && posts.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[...Array(6)].map((_, index) => (
            <div key={index} className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-[360px] animate-pulse flex flex-col justify-between p-5">
              <div className="space-y-4">
                <div className="w-full aspect-video bg-neutral-100 rounded-lg" />
                <div className="h-3 bg-neutral-100 rounded w-1/4" />
                <div className="h-5 bg-neutral-100 rounded w-3/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-neutral-100 rounded w-full" />
                  <div className="h-3 bg-neutral-100 rounded w-5/6" />
                </div>
              </div>
              <div className="h-10 bg-neutral-100 rounded-xl w-full" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-24 text-neutral-400 text-[14px] tracking-wide font-normal">{t.emptyMessage}</div>
      ) : (
        <>
          {/* メイングリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-1">
            {posts
              .filter((post, index, self) => self.findIndex((p) => p.id === post.id) === index)
              .map((post) => {
                const urls = parseSafeUrls(post.image_urls)
                const hasImages = urls.length > 0

                return (
                  <div 
                    key={post.id} 
                    className="bg-white border border-neutral-200 hover:border-neutral-300/90 rounded-xl overflow-hidden flex flex-col justify-between transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-sm hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.06)] hover:-translate-y-1 group"
                  >
                    <div>
                      {/* 画像エリア */}
                      <div className="w-full aspect-video bg-neutral-50 border-b border-neutral-100 overflow-hidden relative">
                        {hasImages ? (
                          <img 
                            src={urls[0]} 
                            alt={post.title} 
                            className="w-full h-full object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]" 
                            loading="lazy" 
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-neutral-300 bg-neutral-50/50">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-8 h-8">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375 .375 0 1 1-.75 0 .375 .375 0 0 1 .75 0Z" />
                            </svg>
                          </div>
                        )}
                        {urls.length > 1 && (
                          <span className="absolute bottom-2.5 right-2.5 text-[10px] bg-neutral-900/80 text-white px-2 py-0.5 rounded-md backdrop-blur-[2px] font-semibold font-mono tracking-wider shadow-sm">
                            {t.moreImages(urls.length - 1)}
                          </span>
                        )}
                      </div>

                      {/* テキストコンテンツ */}
                      <div className="p-5 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="shrink-0 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-neutral-500">
                              {getCategoryLabel(getCategory(post))}
                            </span>
                            <span className="truncate text-[11px] font-mono tracking-wider text-neutral-400">
                              {new Date(post.created_at).toLocaleDateString(t.locale, { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </span>
                          </div>
                          {getStatusBadge(post.visibility)}
                        </div>
                        <h4 className="text-[15px] font-semibold text-neutral-900 tracking-wide line-clamp-1 group-hover:text-neutral-950 transition-colors duration-300">
                          {post.title}
                        </h4>
                        <p className="text-[13px] text-neutral-500 line-clamp-2 leading-relaxed font-normal tracking-wide">
                          {post.description ? post.description.replace(/<[^>]*>/g, '') : ""}
                        </p>
                      </div>
                    </div>
                    
                    {/* アクションボタン群 */}
                    <div className="px-5 pb-5 pt-3 border-t border-neutral-100 flex items-center justify-between gap-2.5">
                      <Link 
                        href={`/${currentLang}/posts/${post.id}`} 
                        className={`${actionButtonStyle} border-neutral-300 text-neutral-800 bg-white hover:bg-neutral-900 hover:text-white hover:border-transparent group-hover:border-neutral-400`}
                      >
                        {t.btnView}
                      </Link>
                      <Link 
                        href={getEditHref(post)}
                        className={`${actionButtonStyle} border-neutral-200 text-neutral-500 bg-neutral-50/40 hover:bg-neutral-100 hover:text-neutral-900 hover:border-neutral-300 group-hover:border-neutral-300`}
                      >
                        {t.btnEdit}
                      </Link>
                    </div>

                  </div>
                )
              })}
          </div>

          {/* もっと見るボタン */}
          {hasMore && (
            <div className="flex justify-center pt-8">
              <button
                onClick={() => fetchPosts(false)}
                disabled={loading}
                className="text-[14px] font-medium border border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:border-neutral-400 bg-white px-8 py-2.5 rounded-xl transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 select-none"
              >
                {loading ? t.loading : t.loadMore}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
