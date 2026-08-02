"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import { canUseUserFeatures, getVisibleContentStatuses } from "@/lib/permissions"
import { useAuthModal } from "@/context/AuthModalContext"
import { useRouter } from "next/navigation"
import FollowList from "@/components/FollowList"
import FollowingTimeline from "@/components/FollowingTimeline"
import MinimalCalendar from "@/app/[lang]/dashboard/_components/MinimalCalendar"

type UserProfile = {
  id: string
  username: string | null
  display_name: string | null
  display_name_en: string | null
  bio: string | null
  bio_en: string | null
  avatar_url: string | null
  role: "user" | "pro" | "owner" | "admin"
  membership_tier: "free" | "standard" | "pro" | "business" | null
}

type ContentType = "tasting" | "gear" | "event" | "blog" | "verification"
type ContentFilter = "all" | ContentType

type ProfileContent = {
  key: string
  id: string
  type: ContentType
  imageUrl: string | null
  title: string
  summary: string | null
  createdAt: string
  href: string
}

type CalendarEventItem = {
  id: string
  title: string
  event_date: string
  end_date?: string | null
  type: "report" | "memo"
  memo?: string | null
  visibility?: "draft" | "private" | "members" | "public"
}

type OwnerPageType = "origins" | "experts"
type TabType = "posts" | "timeline" | "followers" | "following"
type ClientProps = {
  username: string
  lang?: "ja" | "en"
}

export default function UserPageClient({ username: rawUsername, lang = "ja" }: ClientProps) {
  const router = useRouter()
  const { openAuthModal } = useAuthModal()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<ProfileContent[]>([])
  const [calendarItems, setCalendarItems] = useState<CalendarEventItem[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isTierMember, setIsTierMember] = useState(false)
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [postsCount, setPostsCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>("posts")
  const [initialFetched, setInitialFetched] = useState(false)
  
  const [availablePages, setAvailablePages] = useState<OwnerPageType[]>([])
  const [originPageSlug, setOriginPageSlug] = useState<string | null>(null)
  const [contentFilter, setContentFilter] = useState<ContentFilter>("all")
  const [postsLoading, setPostsLoading] = useState(false)

  const dict = {
    ja: {
      noUser: "ユーザーが見つかりませんでした",
      anonymous: "名称非公開",
      follow: "フォローする",
      following: "フォロー中",
      logArchive: "POSTS / 投稿一覧",
      logSub: "このアカウントが公開した記事",
      noPosts: "公開されている投稿はまだありません。",
      untitled: "無題の投稿",
      tabs: {
        logs: "投稿一覧",
        timeline: "タイムライン",
        followers: "フォロワー",
        following: "フォロー中",
      },
      modes: {
        origins: "Origins / ブランド・店舗",
        experts: "Experts / プロフェッショナル",
      },
      officialBadge: "公式アカウント",
      viewOfficialPage: "公式特設ページを閲覧する",
      pageDescription: "このアカウントが運営するブランド・活動ページへアクセスできます。"
    },
    en: {
      noUser: "User not found",
      anonymous: "Anonymous",
      follow: "Follow",
      following: "Following",
      logArchive: "POSTS",
      logSub: "Articles published by this account",
      noPosts: "No published posts yet.",
      untitled: "Untitled Post",
      tabs: {
        logs: "Posts",
        timeline: "Timeline",
        followers: "Followers",
        following: "Following",
      },
      modes: {
        origins: "Origins / Brand & Shop",
        experts: "Experts / Professional",
      },
      officialBadge: "Official Account",
      viewOfficialPage: "View Official Page",
      pageDescription: "Access the official profile and activity pages for this member."
    }
  }[lang]

  useEffect(() => {
    if (!rawUsername) return

    const targetUsername = decodeURIComponent(rawUsername).replace(/^@/, "")

    const fetchInitialData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      let userIsSignedIn = false
      let loggedInUserId: string | null = null

      if (user) {
        loggedInUserId = user.id
        setCurrentUserId(user.id)
        userIsSignedIn = true
        setIsTierMember(userIsSignedIn)
      }

      const { data: profileData } = await supabase
        .from("users")
        .select("id, username, display_name, display_name_en, bio, bio_en, avatar_url, role, membership_tier")
        .eq("username", targetUsername)
        .maybeSingle()

      if (!profileData) {
        setInitialFetched(true)
        return
      }

      setProfile(profileData as UserProfile)
      const targetUserId = profileData.id

      const originProfile = profileData.role === "owner" || profileData.role === "admin"
        ? await supabase
          .from("origins")
          .select("slug, is_approved, is_public")
          .eq("user_id", targetUserId)
          .eq("is_approved", true)
          .eq("is_public", true)
          .limit(1)
          .maybeSingle()
        : { data: null }
      const expertProfile = profileData.role === "pro" || profileData.role === "admin"
        ? await supabase
          .from("experts" as any)
          .select("is_approved, is_public")
          .eq("user_id", targetUserId)
          .eq("is_approved", true)
          .eq("is_public", true)
          .limit(1)
          .maybeSingle()
        : { data: null }

      const activeTypes: OwnerPageType[] = []
      if (originProfile.data?.slug) {
        activeTypes.push("origins")
        setOriginPageSlug(originProfile.data.slug)
      } else {
        setOriginPageSlug(null)
      }
      if (expertProfile.data) activeTypes.push("experts")
      setAvailablePages(activeTypes)

      const { count: followers } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", targetUserId)
      setFollowersCount(followers || 0)

      const [{ count: followingUsers }, { count: followingOrigins }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", targetUserId),
        supabase
          .from("origin_follows")
          .select("*", { count: "exact", head: true })
          .eq("user_id", targetUserId),
      ])
      setFollowingCount((followingUsers || 0) + (followingOrigins || 0))

      if (loggedInUserId) {
        const { data: followData } = await supabase
          .from("follows")
          .select("id")
          .eq("follower_id", loggedInUserId)
          .eq("following_id", targetUserId)
          .maybeSingle()
        setFollowing(!!followData)
      }

      // 🔑 カレンダー用データの取得条件（修正済み）
      const isOwn = loggedInUserId === targetUserId

      let memoQuery = supabase
        .from("calendar_memos")
        .select("id, title, start_date, end_date, memo, visibility")
        .eq("user_id", targetUserId)
        .eq("lang", lang)

      let postQuery = supabase
        .from("posts")
        .select("id, title, event_date, end_date, description, visibility")
        .eq("user_id", targetUserId)
        .eq("lang", lang)

      if (isOwn) {
        // 公開ページでは本人にも draft を表示しない。private は本人のみ、members は会員のみ。
        const ownVisibleStatuses = userIsSignedIn
          ? ["private", "members", "public"]
          : ["private", "public"]
        memoQuery = memoQuery.in("visibility", ownVisibleStatuses)
        postQuery = postQuery.in("visibility", ownVisibleStatuses)
      } else {
        // 他人が見ている場合
        if (userIsSignedIn) {
          // `members` は料金プランではなく、ログインユーザー限定の公開範囲。
          memoQuery = memoQuery.in("visibility", ["members", "public"])
          postQuery = postQuery.in("visibility", ["members", "public"])
        } else {
          // free 会員なら public のみ
          memoQuery = memoQuery.eq("visibility", "public")
          postQuery = postQuery.eq("visibility", "public")
        }
      }

      const [memosRes, postsRes] = await Promise.all([memoQuery, postQuery])
      if (memosRes.error) console.error("Failed to load profile calendar memos:", memosRes.error)
      if (postsRes.error) console.error("Failed to load profile calendar posts:", postsRes.error)

      const memoItems: CalendarEventItem[] = (memosRes.data || []).map(m => ({
        id: m.id, 
        title: m.title, 
        event_date: m.start_date, 
        end_date: m.end_date || null,
        memo: m.memo || null,
        visibility: m.visibility,
        type: "memo"
      }))

      const postItems: CalendarEventItem[] = (postsRes.data || []).map(p => ({
        id: p.id, 
        title: p.title || "Untitled", 
        event_date: p.event_date, 
        end_date: p.end_date || null,
        memo: p.description || null,
        visibility: p.visibility || "public",
        type: "report"
      }))

      setCalendarItems([...memoItems, ...postItems])
      setInitialFetched(true)
    }

    fetchInitialData()
  }, [rawUsername, lang])

  useEffect(() => {
    if (!profile) return

    const fetchPostsData = async () => {
      setPostsLoading(true)
      
      const visibleStatuses = getVisibleContentStatuses({ viewerId: currentUserId, ownerId: profile.id })

      const [postResult, blogResult, recipeResult] = await Promise.all([
        supabase
          .from("posts")
          .select("id, title, description, tastes, image_urls, created_at, type, event_origin_id, visibility")
          .eq("user_id", profile.id)
          .eq("lang", lang)
          .in("visibility", visibleStatuses)
          .order("created_at", { ascending: false }),
        supabase
          .from("blogs")
          .select("id, title, content, image_urls, created_at, visibility")
          .eq("user_id", profile.id)
          .eq("lang", lang)
          .in("visibility", visibleStatuses)
          .order("created_at", { ascending: false }),
        supabase
          .from("pro_recipes")
          .select("id, recipe_title, bean_name, image_urls, created_at, visibility")
          .eq("user_id", profile.id)
          .eq("lang", lang)
          .in("visibility", visibleStatuses)
          .order("created_at", { ascending: false }),
      ])
      if (postResult.error) console.error("Failed to load profile posts:", postResult.error)
      if (blogResult.error) console.error("Failed to load profile blogs:", blogResult.error)
      if (recipeResult.error) console.error("Failed to load profile verification posts:", recipeResult.error)

      const imageUrl = (value: unknown): string | null => {
        if (Array.isArray(value)) return typeof value[0] === "string" ? value[0] : null
        if (typeof value !== "string" || !value.trim()) return null
        try {
          const parsed = JSON.parse(value)
          return Array.isArray(parsed) && typeof parsed[0] === "string" ? parsed[0] : value
        } catch {
          return value
        }
      }

      const postItems: ProfileContent[] = (postResult.data || []).map((post) => {
        const type: ContentType = post.type === "gear_review"
          ? "gear"
          : post.type === "event" || post.event_origin_id
            ? "event"
            : "tasting"
        return {
          key: `post-${post.id}`,
          id: post.id,
          type,
          imageUrl: imageUrl(post.image_urls),
          title: post.title || dict.untitled,
          summary: post.description || post.tastes,
          createdAt: post.created_at || "",
          href: `/${lang}/posts/${post.id}`,
        }
      })
      const blogItems: ProfileContent[] = (blogResult.data || []).map((blog) => ({
        key: `blog-${blog.id}`,
        id: blog.id,
        type: "blog",
        imageUrl: imageUrl(blog.image_urls),
        title: blog.title || dict.untitled,
        summary: blog.content,
        createdAt: blog.created_at || "",
        href: `/${lang}/blogs/${blog.id}`,
      }))
      const recipeItems: ProfileContent[] = (recipeResult.data || []).map((recipe) => ({
        key: `verification-${recipe.id}`,
        id: recipe.id,
        type: "verification",
        imageUrl: imageUrl(recipe.image_urls),
        title: recipe.recipe_title || dict.untitled,
        summary: recipe.bean_name,
        createdAt: recipe.created_at || "",
        href: `/${lang}/recipes/${recipe.id}`,
      }))
      const allItems = [...postItems, ...blogItems, ...recipeItems].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )

      setPosts(allItems)
      setPostsCount(allItems.length)
      setPostsLoading(false)
    }

    fetchPostsData()
  }, [profile, currentUserId, isTierMember, lang, dict.untitled])

  const handleFollow = async () => {
    if (!canUseUserFeatures(currentUserId)) {
      openAuthModal()
      return
    }
    if (!profile || currentUserId === profile.id) return
    if (followLoading) return

    setFollowLoading(true)

    if (following) {
      await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id)

      setFollowing(false)
      setFollowersCount((prev) => prev - 1)
    } else {
      await supabase
        .from("follows")
        .insert({
          follower_id: currentUserId,
          following_id: profile.id,
        })

      setFollowing(true)
      setFollowersCount((prev) => prev + 1)
    }

    setFollowLoading(false)
  }

  const contentLabels: Record<ContentFilter, string> = lang === "en"
    ? { all: "All", tasting: "Tasting", gear: "Gear", event: "Events", blog: "Blogs", verification: "Verifications" }
    : { all: "すべて", tasting: "テイスト", gear: "器具", event: "イベント", blog: "ブログ", verification: "検証" }

  const contentCounts = useMemo(() => {
    const counts: Record<ContentFilter, number> = {
      all: posts.length,
      tasting: 0,
      gear: 0,
      event: 0,
      blog: 0,
      verification: 0,
    }
    posts.forEach((post) => { counts[post.type] += 1 })
    return counts
  }, [posts])

  const filteredPosts = contentFilter === "all"
    ? posts
    : posts.filter((post) => post.type === contentFilter)

  if (!initialFetched) {
    return (
      <main className="max-w-6xl mx-auto p-6 sm:p-10 md:p-14 lg:p-16">
        <section className="w-full animate-pulse">
          <div className="flex items-center gap-5 sm:gap-8 md:gap-10">
            <div className="w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-neutral-100 border border-neutral-200/30 flex-shrink-0" />
            <div className="flex-1 space-y-2.5">
              <div className="h-7 sm:h-9 bg-neutral-100 rounded w-48 sm:w-64" />
              <div className="h-4 bg-neutral-100 rounded w-24 sm:w-32" />
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (initialFetched && !profile) {
    return (
      <main className="max-w-6xl mx-auto p-6 sm:p-10 text-center py-20">
        <p className="text-sm text-subtle">{dict.noUser}</p>
      </main>
    )
  }

  if (!profile) return null

  const displayUsername = `@${profile.username}`
  const localizedDisplayName = lang === "en" ? profile.display_name_en : profile.display_name
  const localizedBio = lang === "en" ? profile.bio_en : profile.bio
  const isOwnProfile = currentUserId === profile.id

  const showExperts = availablePages.includes("experts")
  const showOrigins = availablePages.includes("origins")
  const isOfficialUser = showExperts || showOrigins

  return (
    <main className="public-page-shell mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-16">
      
      <section className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-12">
        
        <div className="public-panel min-w-0 p-5 sm:p-8">
          <div className="flex items-start gap-4 sm:gap-7">
            <div className="relative h-20 w-20 flex-shrink-0 sm:h-28 sm:w-28">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 80px, 112px"
                  className="rounded-full object-cover border border-border"
                />
              ) : (
                <div className="w-full h-full rounded-full border border-border bg-neutral-50 flex items-center justify-center font-mono text-zinc-400 text-xs">
                  ☕
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="break-words text-xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {localizedDisplayName || profile.username || dict.anonymous}
                    </h1>
                    {isOfficialUser && (
                      <span className="rounded-full bg-zinc-900 px-2.5 py-1 text-[9px] font-bold tracking-wide text-zinc-50">
                        {dict.officialBadge}
                      </span>
                    )}
                  </div>
                  {localizedDisplayName && profile.username && (
                    <p className="mt-1 truncate font-mono text-xs text-subtle sm:text-sm">
                      {displayUsername}
                    </p>
                  )}
                </div>

                {!isOwnProfile && (
                  <button
                    type="button"
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`w-full shrink-0 rounded-full border px-6 py-2.5 text-xs font-semibold tracking-wide transition disabled:cursor-wait disabled:opacity-60 sm:w-auto ${
                      following
                        ? "border-border bg-surface text-foreground hover:bg-neutral-50"
                        : "border-foreground bg-foreground text-background hover:opacity-80"
                    }`}
                  >
                    {following ? dict.following : dict.follow}
                  </button>
                )}
              </div>

              {localizedBio && (
                <p className="mt-5 max-w-2xl whitespace-pre-line text-left text-xs leading-relaxed text-foreground/75 sm:text-sm">
                  {localizedBio}
                </p>
              )}
            </div>
          </div>

          {isOfficialUser && profile.username && (
            <div className="mt-8 w-full border-t border-border pt-6 text-left">
              <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-foreground">
                {dict.viewOfficialPage}
              </h3>
              <p className="mb-4 text-[11px] text-subtle">
                {dict.pageDescription}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {showOrigins && (
                    <Link
                      href={`/${lang}/origins/${originPageSlug}`}
                      className="group flex items-center justify-between rounded-2xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-600 block w-fit mb-1.5">
                          Brand / Shop
                        </span>
                        <p className="text-sm font-bold text-neutral-800 truncate group-hover:text-neutral-900">
                          {localizedDisplayName || profile.username}
                        </p>
                      </div>
                      <div className="text-neutral-400 group-hover:text-neutral-900 pl-2 transition-transform group-hover:translate-x-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </Link>
                )}

                {showExperts && (
                    <Link
                      href={`/${lang}/experts/${profile.username}`}
                      className="group flex items-center justify-between rounded-2xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-sm"
                    >
                      <div className="min-w-0">
                        <span className="text-[9px] font-bold font-mono tracking-wider uppercase px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-600 block w-fit mb-1.5">
                          Professional
                        </span>
                        <p className="text-sm font-bold text-neutral-800 truncate group-hover:text-neutral-900">
                          {localizedDisplayName || profile.username}
                        </p>
                      </div>
                      <div className="text-neutral-400 group-hover:text-neutral-900 pl-2 transition-transform group-hover:translate-x-0.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                    </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 公開ページのカレンダーは、本人が見ている場合も常に表示専用 */}
        <div className="w-full lg:w-[360px]">
          <MinimalCalendar 
            events={calendarItems} 
            isOwnProfile={currentUserId !== null && profile !== null && currentUserId === profile.id}
            isTierMember={isTierMember}
            lang={lang}
          />
        </div>

      </section>

      <section className="mt-9">
        <div className="grid grid-cols-2 border-y border-border sm:flex sm:flex-wrap sm:gap-12">
          <button
            onClick={() => setActiveTab("posts")}
            className={`relative py-4 text-center transition duration-200 sm:text-left ${activeTab === "posts" ? "text-foreground font-bold" : "text-subtle hover:text-foreground"}`}
          >
            <p className="text-lg sm:text-2xl font-mono">{postsCount}</p>
            <p className="text-[10px] sm:text-xs tracking-wider text-subtle mt-0.5">{dict.tabs.logs}</p>
          </button>

          {isOwnProfile && (
            <button
              onClick={() => setActiveTab("timeline")}
              className={`relative flex flex-col items-center justify-center py-4 transition duration-200 sm:items-start ${activeTab === "timeline" ? "text-foreground font-bold" : "text-subtle hover:text-foreground"}`}
            >
              <div className="h-[27px] sm:h-[32px] flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="sm:w-[18px] sm:h-[18px]">
                  <path d="M3 10h18M3 14h18M3 18h18M3 6h18"/>
                </svg>
              </div>
              <p className="text-[10px] sm:text-xs tracking-wider text-subtle mt-0.5">{dict.tabs.timeline}</p>
            </button>
          )}

          <button
            onClick={() => setActiveTab("followers")}
            className={`relative py-4 text-center transition duration-200 sm:text-left ${activeTab === "followers" ? "text-foreground font-bold" : "text-subtle hover:text-foreground"}`}
          >
            <p className="text-lg sm:text-2xl font-mono">{followersCount}</p>
            <p className="text-[10px] sm:text-xs tracking-wider text-subtle mt-0.5">{dict.tabs.followers}</p>
          </button>

          <button
            onClick={() => setActiveTab("following")}
            className={`relative py-4 text-center transition duration-200 sm:text-left ${activeTab === "following" ? "text-foreground font-bold" : "text-subtle hover:text-foreground"}`}
          >
            <p className="text-lg sm:text-2xl font-mono">{followingCount}</p>
            <p className="text-[10px] sm:text-xs tracking-wider text-subtle mt-0.5">{dict.tabs.following}</p>
          </button>
        </div>
      </section>

      <section className="mt-10 sm:mt-14">
        {activeTab === "posts" && (
          <>
            <div className="flex flex-col gap-5 border-b border-border pb-5 text-left sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-0.5">
                <h2 className="text-xs font-bold tracking-[0.15em] uppercase font-mono text-foreground">
                  {dict.logArchive}
                </h2>
                <p className="text-[10px] tracking-[0.14em] text-subtle font-medium">
                  {dict.logSub}
                </p>
              </div>

              <div className="flex max-w-full gap-2 overflow-x-auto pb-1 no-scrollbar">
                {(Object.keys(contentLabels) as ContentFilter[]).map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setContentFilter(filter)}
                    className={`shrink-0 rounded-full px-4 py-2 text-[11px] font-medium transition ${
                      contentFilter === filter
                        ? "bg-foreground text-background"
                        : "border border-border bg-surface text-muted hover:text-foreground"
                    }`}
                  >
                    {contentLabels[filter]}
                    <span className="ml-1.5 opacity-55">{contentCounts[filter]}</span>
                  </button>
                ))}
              </div>
            </div>

            {postsLoading ? (
              <div aria-busy="true" className="mt-8 grid animate-pulse grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index}>
                    <div className="aspect-[4/5] rounded-2xl bg-neutral-100" />
                    <div className="mt-3 h-4 w-4/5 rounded bg-neutral-100" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-neutral-100" />
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <p className="mt-8 text-xs text-subtle italic text-left">{dict.noPosts}</p>
            ) : (
              <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-9 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
                {filteredPosts.map((post) => (
                  <Link key={post.key} href={post.href} className="group block min-w-0">
                    <article className="space-y-2.5">
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl border border-border bg-surface">
                        {post.imageUrl ? (
                          <Image
                            src={post.imageUrl}
                            alt={post.title}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-50 flex items-center justify-center font-mono text-[10px] text-zinc-400">NO IMAGE</div>
                        )}
                        <span className="absolute left-2 top-2 rounded-full bg-black/80 px-2.5 py-1 text-[9px] font-medium tracking-wider text-white backdrop-blur">
                          {contentLabels[post.type]}
                        </span>
                      </div>
                      <div className="min-w-0 px-0.5 text-left">
                        <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground group-hover:underline">
                          {post.title}
                        </h4>
                        {post.summary && <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-subtle">{post.summary}</p>}
                        {post.createdAt && (
                          <time className="mt-1.5 block text-[10px] text-subtle">
                            {new Intl.DateTimeFormat(lang === "en" ? "en" : "ja-JP", { year: "numeric", month: "short", day: "numeric" }).format(new Date(post.createdAt))}
                          </time>
                        )}
                      </div>
                    </article>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "timeline" && isOwnProfile && (
          <FollowingTimeline currentUserId={profile.id} lang={lang} />
        )}

        {(activeTab === "followers" || activeTab === "following") && (
          <div className="w-full text-left">
            <FollowList userId={profile.id} type={activeTab} lang={lang} />
          </div>
        )}
      </section>
    </main>
  )
}
