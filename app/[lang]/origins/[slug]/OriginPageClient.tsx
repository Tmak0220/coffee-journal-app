'use client'

import Link from "next/link"
import Image from "next/image"
import { useEffect, useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import ProRecipeList from "@/components/ProRecipeList"
import PublicProfileCalendar from "@/components/PublicProfileCalendar"
import { useAuthModal } from "@/context/AuthModalContext"
import ProfileGearReviews from "@/components/ProfileGearReviews"
import B2BInquiryPanel from "@/components/B2BInquiryPanel"
import PeoplePostList from "@/components/PeoplePostList"
import ProfileTimeline from "@/components/ProfileTimeline"
import PublicShopProducts from "@/components/PublicShopProducts"

type BranchItem = {
  name: string
  address?: string
  hours?: string
  phone?: string
  email?: string
}

type LinkItem = {
  label: string
  url: string
}

type Origin = {
  id: number
  type: "market" | "source" | "event" | string | null
  name: string
  name_ja: string | null
  display_name: string | null
  display_name_en: string | null
  slug: string
  owner_id?: string | null
  avatar_url?: string | null
  cover_url?: string | null
  tags?: string[]
  website_url?: string | null
  description?: string | null
  description_en?: string | null
  headquarters?: BranchItem | string | null
  headquarters_en?: BranchItem | string | null
  branches?: BranchItem[] | null
  branches_en?: BranchItem[] | null
  links?: LinkItem[] | null
}

type RelatedOrigin = {
  id: number
  name: string
  name_ja: string | null
  slug: string
  image_url: string | null
}

type NotificationPost = {
  id: string
  title: string
  content: string
  link_url: string | null
  link_source: string | null
  target_group: string
  created_at: string
}

type OriginRecipe = {
  id: string
  title: string
  coffee_name?: string
  created_at: string
  thumbnail_url?: string
}

type Props = {
  origin: Origin
  relatedOrigins: RelatedOrigin[]
}

export default function OriginPageClient({ origin, relatedOrigins }: Props) {
  const router = useRouter()
  const { openAuthModal } = useAuthModal()
  const params = useParams()
  const pathname = usePathname()
  const slug = (params.slug as string) || origin.slug
  
  // Auth Modal Context が存在しない場合の安全対策
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)

  const [notifications, setNotifications] = useState<NotificationPost[]>([])
  const [recipes, setRecipes] = useState<OriginRecipe[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserTier, setCurrentUserTier] = useState<string | null>(null)

  const urlLang = params.lang as string | undefined
  const isEnglishPath = pathname.startsWith('/en/') || pathname === '/en'
  const lang = urlLang === 'en' || isEnglishPath ? 'en' : 'ja'
  const isEn = lang === 'en'

  const dict = {
    ja: {
      followers: "フォロワー",
      edit: "プロフィールの編集",
      follow: "フォローする",
      following: "フォロー中",
      aboutTitleJa: "ストーリー",
      locationsTitleJa: "活動拠点・アクセス",
      linksTitleJa: "公式リンク & SNS",
      updatesTitleJa: "お知らせ・タイムライン",
      noUpdates: "まだ投稿はありません。",
      newPost: "タイムラインへのお知らせを作成",
      titlePlaceholder: "お知らせのタイトルを入力...",
      contentPlaceholder: "ここにお知らせ、最新情報などを入力してください...",
      linkPlaceholder: "関連リンクURL（任意）",
      targetGroupLabel: "配信対象",
      targetAll: "全員に公開",
      targetPremium: "有料会員限定",
      publish: "投稿する",
      noCover: "NO COVER IMAGE",
      noBio: "ストーリーはまだ登録されていません。",
      noLinks: "登録されているリンクはありません。",
      noLocations: "登録されている活動拠点情報はありません。",
      premiumBadge: "有料会員限定",
      openLink: "リンクを見る",
      premiumMaskText: "このコンテンツは有料会員限定です。閲覧するにはプランのアップグレードが必要です。"
    },
    en: {
      followers: "FOLLOWERS",
      edit: "Edit Profile",
      follow: "Follow",
      following: "Following",
      aboutTitleJa: "Our Story",
      locationsTitleJa: "Locations & Access",
      linksTitleJa: "Links & Socials",
      updatesTitleJa: "Updates & Announcements",
      noUpdates: "No updates posted yet.",
      newPost: "Create a New Announcement",
      titlePlaceholder: "Enter announcement title...",
      contentPlaceholder: "Write your news, story, or updates here...",
      linkPlaceholder: "Related Link URL (Optional)",
      targetGroupLabel: "Target Audience",
      targetAll: "Public (Everyone)",
      targetPremium: "Premium Members Only",
      publish: "Publish",
      noCover: "NO COVER IMAGE",
      noBio: "Our story has not been registered yet.",
      noLinks: "No links registered yet.",
      noLocations: "No locations registered yet.",
      premiumBadge: "PREMIUM ONLY",
      openLink: "Visit Link",
      premiumMaskText: "This content is exclusive to premium members. Please upgrade your plan to view."
    }
  }[lang]

  const originTypeLabel = {
    market: "MARKET",
    source: "SOURCE",
    event: "EVENT",
  }[origin.type || ""] || (origin.type ? origin.type.toUpperCase() : "ORIGINS")
  const originAccent = {
    market: {
      badge: "border-amber-200/80 bg-amber-50 text-amber-900",
      fallback: "from-stone-950 via-stone-800 to-amber-950",
    },
    source: {
      badge: "border-emerald-200/80 bg-emerald-50 text-emerald-900",
      fallback: "from-emerald-950 via-stone-900 to-teal-950",
    },
    event: {
      badge: "border-rose-200/80 bg-rose-50 text-rose-900",
      fallback: "from-rose-950 via-stone-900 to-orange-950",
    },
  }[origin.type || ""] || {
    badge: "border-neutral-200 bg-neutral-50 text-neutral-800",
    fallback: "from-neutral-950 via-neutral-800 to-neutral-700",
  }

  useEffect(() => {
    let isMounted = true

    const initUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const loginUid = session?.user?.id || null

      if (loginUid) {
        if (!isMounted) return
        setCurrentUserId(loginUid)

        const followQuery = origin.owner_id
          ? supabase.from("follows").select("id").eq("follower_id", loginUid).eq("following_id", origin.owner_id).maybeSingle()
          : supabase.from("origin_follows").select("id").eq("user_id", loginUid).eq("origin_slug", slug).maybeSingle()
        const [userData, followStatus] = await Promise.all([
          supabase.from("users").select("membership_tier").eq("id", loginUid).maybeSingle(),
          followQuery,
        ])

        if (isMounted) {
          setCurrentUserTier(userData.data?.membership_tier || "free")
          setFollowing(!!followStatus.data)
        }
      } else {
        if (isMounted) {
          setCurrentUserId(null)
          setCurrentUserTier(null)
        }
      }
    }

    initUserData()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMounted) return
      if (session?.user) {
        setCurrentUserId(session.user.id)
        const followQuery = origin.owner_id
          ? supabase.from("follows").select("id").eq("follower_id", session.user.id).eq("following_id", origin.owner_id).maybeSingle()
          : supabase.from("origin_follows").select("id").eq("user_id", session.user.id).eq("origin_slug", slug).maybeSingle()
        const [{ data: userData }, { data: followData }] = await Promise.all([
          supabase.from("users").select("membership_tier").eq("id", session.user.id).maybeSingle(),
          followQuery,
        ])
        setCurrentUserTier(userData?.membership_tier || "free")
        setFollowing(Boolean(followData))
      } else {
        setCurrentUserId(null)
        setCurrentUserTier(null)
        setFollowing(false)
      }
    })

    return () => { isMounted = false; subscription.unsubscribe() }
  }, [slug, origin.owner_id])

  const fetchTimelineData = async () => {
    if (!slug) return
    const followCountQuery = origin.owner_id
      ? supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", origin.owner_id)
      : supabase.from("origin_follows").select("*", { count: "exact", head: true }).eq("origin_slug", slug)
    const [noticeRes, followCountRes] = await Promise.all([
      supabase.from("notifications").select("id, title, content, link_url, link_source, target_group, created_at, lang").eq("origin_slug", slug).eq("lang", lang).order("created_at", { ascending: false }),
      followCountQuery,
    ])
    setNotifications((noticeRes.data || []).map((notice: any) => ({
      ...notice,
      target_group: notice.target_group || "all",
    })))
    setFollowersCount(followCountRes.count || 0)
  }

  useEffect(() => { fetchTimelineData() }, [lang, slug, origin.owner_id])

  const isPremiumUser = currentUserTier === "standard" || currentUserTier === "pro" || currentUserTier === "business"

  useEffect(() => {
    const fetchRecipes = async () => {
      if (!origin.owner_id) {
        setRecipes([])
        return
      }

      const visibleStatuses = currentUserId === origin.owner_id
        ? ["draft", "private", "members", "public"]
        : isPremiumUser ? ["members", "public"] : ["public"]

      const { data } = await supabase
        .from("pro_recipes")
        .select("id, recipe_title, bean_name, image_urls, created_at")
        .eq("user_id", origin.owner_id)
        .eq("lang", lang)
        .in("target_category", ["origins", "both"])
        .in("visibility", visibleStatuses)
        .order("created_at", { ascending: false })

      setRecipes((data || []).map(recipe => ({
        id: recipe.id,
        title: recipe.recipe_title,
        coffee_name: recipe.bean_name,
        created_at: recipe.created_at,
        thumbnail_url: recipe.image_urls?.[0]
      })))
    }

    fetchRecipes()
  }, [origin.owner_id, currentUserId, isPremiumUser, lang])

  const handleFollow = async () => {
    if (!currentUserId) {
      openAuthModal()
      return
    }
    if (!currentUserTier || currentUserTier === "free") {
      router.push(`/${lang}/members`)
      return
    }
    if (followLoading) return
    setFollowLoading(true)

    if (following) {
      if (origin.owner_id) {
        await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", origin.owner_id)
      } else {
        await supabase.from("origin_follows").delete().eq("user_id", currentUserId).eq("origin_slug", slug)
      }
      setFollowing(false)
      setFollowersCount((prev) => Math.max(0, prev - 1))
    } else {
      if (origin.owner_id) {
        await supabase.from("follows").insert({ follower_id: currentUserId, following_id: origin.owner_id })
      } else {
        await supabase.from("origin_follows").insert({ user_id: currentUserId, origin_slug: slug })
      }
      setFollowing(true)
      setFollowersCount((prev) => prev + 1)
    }
    setFollowLoading(false)
  }

  const isOwner = !!(currentUserId && origin.owner_id === currentUserId)

  const displayName = isEn 
    ? (origin.display_name_en || origin.display_name || origin.name) 
    : (origin.display_name || origin.name_ja || origin.name)

  const displayBio = isEn ? (origin.description_en || origin.description) : origin.description
  const displayHQ = isEn ? (origin.headquarters_en || origin.headquarters) : origin.headquarters
  const displayBranches = isEn ? (origin.branches_en || origin.branches) : origin.branches

  const allLocations: BranchItem[] = []
  if (displayHQ) {
    allLocations.push(typeof displayHQ === "string"
      ? {
          name: isEn ? "Headquarters" : "本部・本拠地",
          address: displayHQ,
        }
      : displayHQ)
  }
  if (displayBranches && displayBranches.length > 0) {
    allLocations.push(...displayBranches)
  }

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      
      {/* 1. カバーイメージ */}
      <div className="w-full h-48 md:h-64 bg-zinc-100 relative overflow-hidden border-b border-border/30">
        {origin.cover_url ? (
          <Image src={origin.cover_url} alt="" fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-300 text-xs font-mono">
            {dict.noCover}
          </div>
        )}
      </div>

      <div className="relative z-10 mx-auto -mt-12 max-w-4xl px-4 py-6 sm:-mt-16 sm:p-12">
        
        {/* 2. プロフィール基本情報エリア */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 border-b border-border/40 pb-10">
          <div className="relative w-32 h-32 rounded-3xl overflow-hidden border-4 border-background bg-surface flex-shrink-0 shadow-sm">
            {origin.avatar_url ? (
              <Image src={origin.avatar_url} alt="" fill className="object-cover" />
            ) : (
              <div className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${originAccent.fallback} font-mono text-3xl text-white`}>
                {origin.name ? origin.name[0] : "O"}
              </div>
            )}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-3 pb-2">
            <div className="flex items-center justify-center md:justify-start gap-2.5 flex-wrap">
              <span className={`rounded border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${originAccent.badge}`}>
                {originTypeLabel}
              </span>
              {origin.tags && origin.tags.length > 0 && origin.tags.map((tag, idx) => (
                <span key={idx} className="text-[10px] bg-zinc-50 text-subtle px-2 py-0.5 rounded font-mono">
                  #{tag}
                </span>
              ))}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{displayName}</h1>

            <div className="flex items-center justify-center md:justify-start gap-6 pt-1">
              <div className="text-left">
                <span className="text-[10px] tracking-wider text-subtle font-mono uppercase block">{dict.followers}</span>
                <span className="text-lg font-bold text-foreground tabular-nums">{followersCount}</span>
              </div>

              {!isOwner && (
                <button
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-xl border px-6 py-2.5 text-xs font-semibold tracking-wide transition ${
                    following 
                      ? "border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200" 
                      : "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700"
                  }`}
                >
                  {following ? dict.following : dict.follow}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 3. ストーリー & 公式リンク (2カラムグリッド) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10">
          <div className="md:col-span-2 space-y-4">
            <h3 className="text-[10px] font-bold tracking-wider text-subtle uppercase font-mono">{dict.aboutTitleJa}</h3>
            <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line">
              {displayBio || dict.noBio}
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-bold tracking-wider text-subtle uppercase font-mono">{dict.linksTitleJa}</h3>
            {origin.links && origin.links.length > 0 ? (
              <div className="flex flex-col gap-2">
                {origin.links.map((link, index) => (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-foreground/90 hover:text-foreground font-medium inline-flex items-center justify-between bg-surface hover:bg-zinc-50 border border-border/60 p-3 rounded-xl transition-all shadow-sm group"
                  >
                    <span className="truncate">{link.label || 'Official Link'}</span>
                    <span className="text-[10px] text-subtle group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-subtle bg-surface border border-border/40 rounded-xl p-4 text-center font-mono">{dict.noLinks}</p>
            )}
          </div>
        </div>

        {/* 4. 活動拠点・アクセス */}
        <div className="mt-12">
          <h3 className="text-[10px] font-bold tracking-wider text-subtle uppercase font-mono mb-4">{dict.locationsTitleJa}</h3>
          {allLocations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {allLocations.map((location, index) => (
                <div key={index} className="border border-border/60 p-4 rounded-2xl bg-surface shadow-sm space-y-2">
                  <h4 className="font-bold text-foreground text-xs flex items-center gap-2">
                    <span className="w-1 h-3 bg-zinc-900 rounded-full inline-block"></span>
                    {location.name}
                  </h4>
                  <div className="space-y-1 text-xs text-subtle pl-3">
                    {location.address && <p><span className="font-mono text-[10px]">Add:</span> {location.address}</p>}
                    {location.hours && <p><span className="font-mono text-[10px]">Open:</span> {location.hours}</p>}
                    {location.phone && <p><span className="font-mono text-[10px]">Tel:</span> {location.phone}</p>}
                    {location.email && <p><span className="font-mono text-[10px]">Mail:</span> {location.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="border border-border/40 bg-surface rounded-xl py-6 text-center">
              <p className="text-xs text-subtle font-mono">{dict.noLocations}</p>
            </div>
          )}
        </div>

        <ProfileTimeline
          items={notifications}
          lang={lang}
          isPremiumUser={isPremiumUser}
        />

        <PublicProfileCalendar
          targetUserId={origin.owner_id}
          lang={lang}
          className="mt-12"
        />

        <B2BInquiryPanel originId={origin.id} ownerId={origin.owner_id} currentUserId={currentUserId} currentUserTier={currentUserTier} lang={lang} mode="public" />

        <section className="mt-14">
          <div className="flex items-end justify-between border-b border-border/40 pb-3 mb-6">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-subtle uppercase font-mono">Recipes</p>
              <h2 className="mt-1 text-sm font-bold tracking-wider text-foreground">
                {isEn ? "Published Recipes" : "公開レシピ"}
              </h2>
            </div>
          </div>
          <ProRecipeList
            recipes={recipes}
            username={origin.slug}
            lang={lang}
            t={{
              noRecipes: isEn ? "No recipes published for this category yet." : "このカテゴリーに公開されたレシピはまだありません。",
              viewRecipe: isEn ? "View Details" : "詳細を見る",
              coffeeName: isEn ? "Bean" : "使用豆"
            }}
          />
        </section>

        <PublicShopProducts userId={origin.owner_id} lang={lang} />

        <ProfileGearReviews userId={origin.owner_id} profileType="owner" lang={lang} />

        <div className="mt-14">
          <PeoplePostList
            userId={origin.owner_id || ""}
            originId={origin.id}
            targetType="origin"
            lang={lang}
          />
        </div>

      </div>
    </main>
  )
}
