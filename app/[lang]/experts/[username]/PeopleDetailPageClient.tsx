"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import ProRecipeList from "@/components/ProRecipeList" 
import PeoplePostList from "../../../../components/PeoplePostList" 
import PublicProfileCalendar from "@/components/PublicProfileCalendar"
import { useAuthModal } from "@/context/AuthModalContext"
import { useRouter } from "next/navigation"
import ProfileGearReviews from "@/components/ProfileGearReviews"
import { ProfileSkeleton } from "@/components/ui/PageSkeletons"
import ProfileTimeline from "@/components/ProfileTimeline"
import ProfileBlogList from "@/components/ProfileBlogList"

type BaristaProfile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  cover_url: string | null
  bio: string | null
  base_shop: string | null
  achievements: string | null
  past_stores: string[] | null
  primary_specialty: string | null
  sub_specialties: string[]
}

type LabLog = {
  id: string
  title: string
  coffee_name?: string
  coffee_lot?: string
  selected_variables?: string[]
  log_purpose?: string
  log_process?: string
  log_conclusion?: string
  created_at: string
  thumbnail_url?: string
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

type ClientProps = {
  username: string
  lang?: string
}

export default function PeopleDetailPageClient({ username, lang = "ja" }: ClientProps) {
  const router = useRouter()
  const { openAuthModal } = useAuthModal()
  const isEn = lang === "en"
  const [profile, setProfile] = useState<BaristaProfile | null>(null)
  const [labLogs, setLabLogs] = useState<LabLog[] | null>(null)
  const [notifications, setNotifications] = useState<NotificationPost[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [following, setFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followLoading, setFollowLoading] = useState(false)
  const [currentUserTier, setCurrentUserTier] = useState<string | null>(null)

  const t = {
    noRecipes: isEn ? "No recipes published yet." : "現在公開されているレシピはありません。",
    viewRecipe: isEn ? "View Details" : "詳細を見る",
    coffeeName: isEn ? "Bean" : "使用豆",
    coffeeLot: isEn ? "Lot" : "ロット",
    achievementsTitle: isEn ? "Achievements & Career" : "受賞歴・実績",
    pastStoresTitle: isEn ? "Past Experience Stores" : "過去の所属・経験店舗",
    noBio: isEn ? "Biography is not registered yet." : "自己紹介文はまだ登録されていません。",
    notFound: isEn ? "PROFILE NOT FOUND OR NOT PUBLIC" : "プロフィールが見つからないか、非公開です。",
    recipesSectionTitle: isEn ? "Recipes" : "レシピ",
    servedPostsSectionTitle: isEn ? "Served & Provided Coffee" : "提供・関連された投稿",
    updatesSectionTitle: isEn ? "Updates & Announcements" : "お知らせ・タイムライン",
    noUpdates: isEn ? "No updates posted yet." : "まだ投稿はありません。",
    premiumBadge: isEn ? "PREMIUM ONLY" : "有料会員限定",
    openLink: isEn ? "Visit Link" : "リンクを見る",
    follow: isEn ? "Follow" : "フォローする",
    following: isEn ? "Following" : "フォロー中",
    followers: isEn ? "Followers" : "フォロワー",
    premiumMaskText: isEn 
      ? "This content is exclusive to premium members. Please upgrade your plan to view." 
      : "このコンテンツは有料会員限定です。閲覧するにはプランのアップグレードが必要です。"
  }

  useEffect(() => {
    const fetchBaristaData = async () => {
      const { data: sessionData } = await supabase.auth.getSession()
      const loginUid = sessionData?.session?.user?.id || null
      setCurrentUserId(loginUid)
      let viewerIsPremium = false
      
      if (loginUid) {
        const { data: viewerData } = await supabase
          .from("users")
          .select("membership_tier")
          .eq("id", loginUid)
          .maybeSingle()
        setCurrentUserTier(viewerData?.membership_tier || "free")
        viewerIsPremium = !!viewerData?.membership_tier && viewerData.membership_tier !== "free"
      } else {
        setCurrentUserTier(null)
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, username, display_name, avatar_url, cover_url")
        .eq("username", username)
        .maybeSingle()

      if (userError || !userData) {
        console.error("User not found or error:", userError)
        setProfile(null)
        setLoading(false)
        return
      }

      const { data: expertData, error: expertError } = await supabase
        .from("experts")
        .select(`
          is_approved,
          is_public,
          display_name,
          display_name_en,
          bio_expert,
          bio_expert_en,
          current_store,
          current_store_en,
          past_stores,
          past_stores_en,
          awards,
          awards_en,
          primary_specialty,
          primary_specialty_en,
          sub_specialties,
          sub_specialties_en
        `)
        .eq("user_id", userData.id)
        .maybeSingle()

      if (
        expertError ||
        !expertData ||
        !expertData.is_approved ||
        !expertData.is_public
      ) {
        if (expertError) console.error("Expert profile query error:", expertError)
        setProfile(null)
        setLoading(false)
        return
      }

      const mappedProfile: BaristaProfile = {
        id: userData.id,
        username: userData.username || "",
        avatar_url: userData.avatar_url,
        cover_url: userData.cover_url,
        display_name: (isEn ? expertData.display_name_en : expertData.display_name)
          || expertData.display_name
          || userData.username
          || "",
        bio: isEn ? expertData.bio_expert_en : expertData.bio_expert,
        base_shop: isEn ? expertData.current_store_en : expertData.current_store,
        achievements: isEn ? expertData.awards_en : expertData.awards,
        past_stores: isEn ? expertData.past_stores_en : expertData.past_stores,
        primary_specialty: (isEn ? expertData.primary_specialty_en : expertData.primary_specialty)
          || expertData.primary_specialty
          || expertData.primary_specialty_en
          || null,
        sub_specialties: (
          (isEn ? expertData.sub_specialties_en : expertData.sub_specialties)
          || []
        ).filter(Boolean),
      }

      setProfile(mappedProfile)

      const [{ count }, followStatus] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("following_id", userData.id),
        loginUid
          ? supabase
              .from("follows")
              .select("following_id")
              .eq("follower_id", loginUid)
              .eq("following_id", userData.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ])
      setFollowersCount(count || 0)
      setFollowing(Boolean(followStatus.data))

      const { data: noticeData } = await supabase
        .from("notifications")
        .select("id, title, content, link_url, link_source, target_group, created_at, lang")
        .eq("user_id", userData.id)
        .eq("lang", isEn ? "en" : "ja")
        .in("target_group", viewerIsPremium ? ["all", "premium"] : ["all"])
        .order("created_at", { ascending: false })

      setNotifications((noticeData || []).map((notice: any) => ({
        ...notice,
        target_group: notice.target_group || "all",
      })))

      const { data: recipeData } = await supabase
        .from("pro_recipes")
        .select("id, recipe_title, bean_name, image_urls, selected_variables, log_purpose, log_process, log_conclusion, created_at")
        .eq("user_id", userData.id)
        .eq("lang", isEn ? "en" : "ja")
        .in("target_category", ["experts", "both"])
        .in("visibility", viewerIsPremium ? ["members", "public"] : ["public"])
        .order("created_at", { ascending: false })
      
      setLabLogs((recipeData || []).map(recipe => ({
        id: recipe.id,
        title: recipe.recipe_title,
        coffee_name: recipe.bean_name,
        selected_variables: recipe.selected_variables || [],
        log_purpose: recipe.log_purpose || undefined,
        log_process: recipe.log_process || undefined,
        log_conclusion: recipe.log_conclusion || undefined,
        created_at: recipe.created_at,
        thumbnail_url: recipe.image_urls?.[0]
      })))
      setLoading(false)
    }

    if (username) fetchBaristaData()
  }, [username, isEn])

  const handleFollow = async () => {
    if (!currentUserId) {
      openAuthModal()
      return
    }
    if (!currentUserTier || currentUserTier === "free") {
      router.push(`/${isEn ? "en" : "ja"}/members`)
      return
    }
    if (!profile || currentUserId === profile.id || followLoading) return

    setFollowLoading(true)
    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", profile.id)

      if (!error) {
        setFollowing(false)
        setFollowersCount((count) => Math.max(0, count - 1))
      }
    } else {
      const { error } = await supabase.from("follows").insert({
        follower_id: currentUserId,
        following_id: profile.id,
      })

      if (!error) {
        setFollowing(true)
        setFollowersCount((count) => count + 1)
      }
    }
    setFollowLoading(false)
  }

  if (loading) return <ProfileSkeleton />
  if (!profile) return <div className="min-h-screen flex items-center justify-center text-xs text-subtle">{t.notFound}</div>

  const hasExpertDetails = !!(profile.achievements || (profile.past_stores && profile.past_stores.length > 0));
  const specialtyLabels: Record<string, { ja: string; en: string }> = {
    "バリスタ": { ja: "バリスタ", en: "BARISTA" },
    "barista": { ja: "バリスタ", en: "BARISTA" },
    "ブリュワー": { ja: "ブリュワー", en: "BREWER" },
    "brewer": { ja: "ブリュワー", en: "BREWER" },
    "ロースター": { ja: "ロースター", en: "ROASTER" },
    "roaster": { ja: "ロースター", en: "ROASTER" },
    "バイヤー": { ja: "バイヤー", en: "BUYER" },
    "buyer": { ja: "バイヤー", en: "BUYER" },
    "コーチ": { ja: "コーチ", en: "COACH" },
    "coach": { ja: "コーチ", en: "COACH" },
    "カッパー": { ja: "カッパー", en: "CUPPER" },
    "cupper": { ja: "カッパー", en: "CUPPER" },
    "テクニシャン": { ja: "テクニシャン", en: "TECHNICIAN" },
    "technician": { ja: "テクニシャン", en: "TECHNICIAN" },
    "メディア": { ja: "メディア", en: "MEDIA" },
    "media": { ja: "メディア", en: "MEDIA" },
    "アカデミック": { ja: "アカデミック", en: "ACADEMIC" },
    "academic": { ja: "アカデミック", en: "ACADEMIC" },
    "ギーク": { ja: "ギーク", en: "GEEK" },
    "geek": { ja: "ギーク", en: "GEEK" },
  }
  const specialtyKey = profile.primary_specialty?.trim() || ""
  const specialty = (specialtyLabels[specialtyKey] || specialtyLabels[specialtyKey.toLowerCase()])?.[isEn ? "en" : "ja"]
    || (specialtyKey ? specialtyKey.toUpperCase() : (isEn ? "PROFESSIONAL" : "プロフェッショナル"))
  const localizedSpecialties = profile.sub_specialties.map((item) => {
    const key = item.trim()
    return (specialtyLabels[key] || specialtyLabels[key.toLowerCase()])?.[isEn ? "en" : "ja"] || key
  })
  const specialtyAccentKey: Record<string, string> = {
    "バリスタ": "barista",
    "ブリュワー": "brewer",
    "ロースター": "roaster",
    "バイヤー": "buyer",
    "コーチ": "coach",
    "カッパー": "cupper",
    "テクニシャン": "technician",
    "メディア": "media",
    "アカデミック": "academic",
    "ギーク": "geek",
  }
  const specialtyAccent = {
    barista: "border-sky-200 bg-sky-50 text-sky-900",
    brewer: "border-cyan-200 bg-cyan-50 text-cyan-900",
    roaster: "border-amber-200 bg-amber-50 text-amber-900",
    buyer: "border-emerald-200 bg-emerald-50 text-emerald-900",
    coach: "border-violet-200 bg-violet-50 text-violet-900",
    cupper: "border-rose-200 bg-rose-50 text-rose-900",
    technician: "border-slate-200 bg-slate-50 text-slate-900",
    media: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-900",
    academic: "border-indigo-200 bg-indigo-50 text-indigo-900",
    geek: "border-lime-200 bg-lime-50 text-lime-950",
  }[specialtyAccentKey[specialtyKey] || specialtyKey.toLowerCase()]
    || "border-neutral-200 bg-neutral-50 text-neutral-800"

  const isPremiumUser = currentUserTier === "standard" || currentUserTier === "pro" || currentUserTier === "business"

  return (
    <main className="min-h-screen bg-background text-foreground pb-24">
      <div className="w-full h-48 md:h-64 bg-zinc-100 relative overflow-hidden border-b border-border/30">
        {profile.cover_url ? (
          <Image src={profile.cover_url} alt="" fill className="object-cover" priority />
        ) : (
          <div className="w-full h-full bg-zinc-50 flex items-center justify-center text-zinc-300 text-xs font-mono">NO COVER IMAGE</div>
        )}
      </div>

      <div className="relative z-10 mx-auto -mt-12 max-w-4xl px-4 py-6 sm:-mt-16 sm:p-12">
        <div className="grid grid-cols-1 items-end gap-8 border-b border-border/40 pb-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="flex flex-col items-center gap-6 md:flex-row md:items-end">
            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-background bg-surface flex-shrink-0 shadow-sm">
              {profile.avatar_url ? (
                <Image src={profile.avatar_url} alt="" fill className="object-cover" />
              ) : (
                <div className="w-full h-full bg-zinc-100 flex items-center justify-center text-zinc-400 text-xs">NO IMAGE</div>
              )}
            </div>
            
            <div className="flex-1 text-center md:text-left space-y-3 pb-2">
            <div className="flex justify-center md:justify-start">
              <span className={`rounded border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest ${specialtyAccent}`}>
                {specialty}
              </span>
            </div>
            {localizedSpecialties.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1.5 md:justify-start">
                {localizedSpecialties.map((item) => (
                  <span key={item} className="rounded-full border border-border bg-surface px-2.5 py-1 text-[9px] font-medium text-subtle">
                    {item}
                  </span>
                ))}
              </div>
            )}
            <h1 className="text-2xl font-bold tracking-tight">{profile.display_name}</h1>
            {profile.base_shop && (
              <p className="text-xs text-subtle font-medium">Current Base: <span className="text-foreground">{profile.base_shop}</span></p>
            )}
            <p className="text-xs leading-relaxed max-w-xl text-foreground/80 whitespace-pre-line">
              {profile.bio || t.noBio}
            </p>
            <div className="flex items-center justify-center gap-5 pt-2 md:justify-start">
              <div>
                <span className="block text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{t.followers}</span>
                <span className="text-lg font-semibold tabular-nums text-neutral-900">{followersCount}</span>
              </div>
              {currentUserId !== profile.id && (
                <button
                  type="button"
                  onClick={handleFollow}
                  disabled={followLoading}
                  className={`rounded-xl border px-6 py-2.5 text-xs font-semibold tracking-wide transition disabled:opacity-50 ${following ? "border-neutral-300 bg-neutral-100 text-neutral-700 hover:bg-neutral-200" : "border-neutral-900 bg-neutral-900 text-white hover:bg-neutral-700"}`}
                >
                  {following ? t.following : t.follow}
                </button>
              )}
            </div>
            </div>
          </div>

          <PublicProfileCalendar
            targetUserId={profile.id}
            lang={isEn ? "en" : "ja"}
            className="w-full lg:translate-y-8"
          />
        </div>

        {hasExpertDetails && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10">
            {profile.achievements && (
              <div className="bg-surface border border-border/60 p-5 rounded-2xl">
                <h3 className="text-[10px] font-bold tracking-wider text-subtle uppercase mb-3">{t.achievementsTitle}</h3>
                <p className="text-xs text-foreground/90 font-medium leading-relaxed whitespace-pre-line">{profile.achievements}</p>
              </div>
            )}
            {profile.past_stores && profile.past_stores.length > 0 && (
              <div className="bg-surface border border-border/60 p-5 rounded-2xl">
                <h3 className="text-[10px] font-bold tracking-wider text-subtle uppercase mb-3">{t.pastStoresTitle}</h3>
                <ul className="text-xs space-y-1.5 text-foreground/90 font-medium">
                  {profile.past_stores.map((item, i) => <li key={i}>• {item}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}

        <ProfileTimeline
          items={notifications}
          lang={isEn ? "en" : "ja"}
          isPremiumUser={isPremiumUser}
        />

        <ProfileBlogList userId={profile.id} target="experts" lang={isEn ? "en" : "ja"} />

        <ProfileGearReviews userId={profile.id} profileType="expert" lang={isEn ? "en" : "ja"} />

        <div className="mt-14">
          <h2 className="text-sm font-bold tracking-wider uppercase mb-6 text-zinc-800">
            {t.recipesSectionTitle} by {profile.display_name}
          </h2>
          <ProRecipeList recipes={labLogs || []} username={profile.username} lang={lang} t={t} />
        </div>

        <div className="mt-14">
          <PeoplePostList userId={profile.id} lang={lang} />
        </div>

      </div>
    </main>
  )
}
