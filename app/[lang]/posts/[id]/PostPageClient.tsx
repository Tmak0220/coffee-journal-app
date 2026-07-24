"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"
import PostLoading from "./loading"
import CoffeeDetails from "./CoffeeDetails"
import EventPostDetails from "./EventPostDetails"
import GearReviewDetails from "./GearReviewDetails"
import CoffeeBeanLikeIcon from "@/components/CoffeeBeanLikeIcon"
import RelatedContent from "@/components/RelatedContent"

type RelatedPost = {
  id: string
  title: string | null
  image_urls: string[] | null
  origin_slug: string | null
}

export type Post = {
  id: string
  user_id: string
  title: string | null
  description: string | null
  image_urls: string[] | null
  source_origin_id: number | null
  market_origin_id: number | null
  variety_id?: number | null
  process_id?: number | null
  event_origin_id: number | null
  event_date?: string | null
  end_date?: string | null
  type?: string | null
  lang?: string | null
  created_at?: string
  updated_at?: string
  visibility?: "public" | "private" | "draft" | string
  
  // 💡 DBの origins テーブルと結びつく型定義
  origins?: {
    id: number
    name: string
    name_ja: string | null
  } | null

  users: { id: string; username: string | null; display_name: string | null; avatar_url: string | null } | null
  source_origin?: any | null
  market_origin?: any | null
  recipes?: any | null
  
  post_varieties?: Array<{
    varieties: {
      id: number
      name: string
      name_ja: string | null
    } | null
  }> | null

  post_processes?: Array<{
    processes: {
      id: number
      name: string
      name_ja: string | null
    } | null
  }> | null

  post_tastes?: Array<{
    tastes: {
      id: string
      name: string
      name_ja: string
      attribute_type?: string | null 
    } | null
  }> | null
  tastes?: any
  post_gears?: Array<{
    id: string
    gear_id: number
    rating: number | string | null
    grind_setting: string | null
    comment: string | null
    gears: {
      id: number
      type: string | null
      name: string
      name_ja: string | null
      brand: string | null
      brand_ja: string | null
      slug: string
    } | null
  }> | null
}

type Props = {
  id: string
  lang: string
  initialPost?: Post | null 
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

const pageDict = {
  ja: {
    notFound: "投稿が見つかりませんでした",
    labelAuthor: "投稿者",
    anonymous: "名称非公開",
    requireMemberError: "本機能の利用にはMEMBER登録が必要です。",
    btnGoRegister: "登録画面へ",
    relatedTitle: "Related Posts",
    btnSaved: "保存済み",
    btnSave: "保存する",
    btnFollowing: "フォロー中",
    btnFollow: "フォローする",
  },
  en: {
    notFound: "Post not found.",
    labelAuthor: "Author",
    anonymous: "Anonymous",
    requireMemberError: "Membership is required to use this feature.",
    btnGoRegister: "Sign Up",
    relatedTitle: "Related Posts",
    btnSaved: "Saved",
    btnSave: "Save",
    btnFollowing: "Following",
    btnFollow: "Follow",
  }
}

export default function PostPageClient({ id, lang, initialPost }: Props) {
  const currentLang = (lang === "en" ? "en" : "ja") as "ja" | "en"
  const t = pageDict[currentLang]

  const [post, setPost] = useState<Post | null>(initialPost || null)
  const [loading, setLoading] = useState(initialPost === undefined)
  
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([])
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
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id || null
      setCurrentUserId(userId)

      let tierMemberStatus = false
      if (user) {
        const isAdmin = user?.user_metadata?.role === "admin" || user?.role === "admin" || user?.app_metadata?.role === "admin"
        const { data: memberData } = await supabase
          .from("users")
          .select("membership_tier")
          .eq("id", user.id)
          .maybeSingle()
        tierMemberStatus = isAdmin || (!!memberData?.membership_tier && memberData.membership_tier !== "free")
        setIsTierMember(tierMemberStatus)
      }

      let currentPost: Post | null = initialPost || null

      if (!currentPost) {
        // サーバーがnullを返した場合は、非公開・限定公開または存在しない投稿。
        // クライアントから再取得して公開範囲を迂回しない。
        if (initialPost !== undefined) {
          setLoading(false)
          return
        }

        // 💡 origins リレーションの取得を追加（event_origin_id を外部キーとして参照）
        const { data: rawPost, error } = await supabase
          .from("posts")
          .select(`
            *,
            users (id, username, display_name, avatar_url),
            origins:event_origin_id(id, name, name_ja),
            source_origin:origins!posts_source_origin_id_fkey(*),
            market_origin:origins!posts_market_origin_id_fkey(*),
            post_varieties(
              varieties(*)
            ),
            post_processes(
              processes(*)
            ),
            post_tastes!fk_post_tastes_post_id(
              tastes!fk_post_tastes_taste_id(*)
            ),
            post_gears(
              id,
              gear_id,
              rating,
              grind_setting,
              comment,
              gears(id, type, name, name_ja, brand, brand_ja, slug)
            ),
            recipes(*)
          `)
          .eq("id", id)
          .maybeSingle()

        if (error || !rawPost) {
          console.error("投稿の取得失敗:", error)
          setLoading(false)
          return
        }
        
        currentPost = rawPost as unknown as Post
        setPost(currentPost)
      }

      const { data: oPosts } = await supabase
        .from("posts")
        .select("id, title, image_urls")
        .neq("id", id)
        .in("visibility", tierMemberStatus ? ["public", "members"] : ["public"])
        .limit(4)
      
      if (oPosts) {
        setRelatedPosts(oPosts as any)
      }

      const { count } = await supabase.from("likes").select("*", { count: "exact", head: true }).eq("post_id", id)
      setLikeCount(count || 0)

      if (user && currentPost) {
        const { data: likedData } = await supabase.from("likes").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        setLiked(!!likedData)

        if (currentPost.users?.id) {
          const { data: followDataCorrect } = await supabase.from("follows").select("id").eq("follower_id", user.id).eq("following_id", currentPost.users.id).maybeSingle()
          setFollowing(!!followDataCorrect)
        }

        const { data: bookmarkData } = await supabase.from("bookmarks").select("id").eq("post_id", id).eq("user_id", user.id).maybeSingle()
        setBookmarked(!!bookmarkData)
      }

      setLoading(false)
    }

    initPage()
  }, [id, currentLang, initialPost])
  
  const requirePlus = () => {
    if (!currentUserId || !isTierMember) {
      setStatusMessage({ text: t.requireMemberError, type: "error" })
      return false
    }
    return true
  }

  const handleLike = async () => {
    setStatusMessage(null)
    if (!requirePlus() || !currentUserId || likeLoading) return
    setLikeLoading(true)
    if (liked) {
      await supabase.from("likes").delete().eq("post_id", id).eq("user_id", currentUserId)
      setLiked(false)
      setLikeCount((prev) => prev - 1)
    } else {
      await supabase.from("likes").insert({ post_id: id, user_id: currentUserId })
      setLiked(true)
      setLikeCount((prev) => prev + 1)
    }
    setLikeLoading(false)
  }

  const handleFollow = async () => {
    setStatusMessage(null)
    if (!requirePlus() || !currentUserId || !post?.users?.id || followLoading) return
    setFollowLoading(true)
    if (following) {
      await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", post.users.id)
      setFollowing(false)
    } else {
      await supabase.from("follows").insert({ follower_id: currentUserId, following_id: post.users.id })
      setFollowing(true)
    }
    setFollowLoading(false)
  }

  const handleBookmark = async () => {
    setStatusMessage(null)
    if (!requirePlus() || !currentUserId || bookmarkLoading) return
    setBookmarkLoading(true)
    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("post_id", id).eq("user_id", currentUserId)
      setBookmarked(false)
    } else {
      await supabase.from("bookmarks").insert({ post_id: id, user_id: currentUserId })
      setBookmarked(true)
    }
    setBookmarkLoading(false)
  }

  if (loading) return <PostLoading />
  
  if (!post) {
    return <div className="max-w-6xl mx-auto p-6 text-center text-sm text-neutral-400">{t.notFound}</div>
  }

  const parsedImages = Array.isArray(post.image_urls)
    ? post.image_urls.filter((url) => typeof url === "string" && (url.startsWith("http://") || url.startsWith("https://")))
    : []

  const isOwnPost = currentUserId === post.user_id

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_8%_4%,rgba(180,112,32,0.07),transparent_28%),radial-gradient(circle_at_92%_12%,rgba(71,127,151,0.06),transparent_25%)] px-4 py-8 sm:px-8 md:px-12 md:py-12 lg:px-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-9 lg:grid-cols-12 lg:gap-16">
        
        {/* 左カラム：画像表示エリア */}
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:sticky lg:top-28 lg:col-span-6">
          {parsedImages.length > 0 ? (
            parsedImages.map((url, idx) => (
              <div key={idx} className="w-full overflow-hidden rounded-[28px] border border-neutral-200/80 bg-white shadow-[0_20px_60px_-35px_rgba(0,0,0,0.28)] transition-all duration-300">
                <img
                  src={url}
                  alt={post.title || "Uploaded content"}
                  className="w-full h-auto object-contain block max-h-[80vh] mx-auto"
                  loading={idx === 0 ? "eager" : "lazy"}
                />
              </div>
            ))
          ) : (
            <div className="w-full aspect-[4/5] bg-neutral-50 border border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center text-neutral-400 gap-2">
              <span className="text-[20px]">☕</span>
              <span className="text-xs tracking-wider">No Image Available</span>
            </div>
          )}
        </div>

        {/* 右カラム：コンテンツ詳細表示エリア */}
        <div className="space-y-8 rounded-[22px] border border-white/80 bg-white/80 p-4 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.3)] backdrop-blur-sm sm:space-y-10 sm:rounded-[28px] sm:p-8 lg:col-span-6 lg:p-10">
          
          {/* ユーザー情報・著者ヘッダー */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 pb-5 sm:pb-6">
            <Link
              href={post.users?.username ? `/${currentLang}/users/${post.users.username}` : "#"}
              aria-disabled={!post.users?.username}
              className={`flex min-w-0 items-center gap-3.5 rounded-xl transition ${post.users?.username ? "hover:opacity-70" : "pointer-events-none"}`}
            >
              <div className="relative w-11 h-11 shrink-0 bg-neutral-100 rounded-full overflow-hidden border border-neutral-200">
                {post.users?.avatar_url ? (
                  <Image src={post.users.avatar_url} alt="" fill sizes="44px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-neutral-50 text-neutral-300 text-xs font-mono">
                    {post.users?.username?.slice(0, 2).toUpperCase() || "CU"}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-medium tracking-wider text-neutral-400 uppercase">{t.labelAuthor}</p>
                <span className="block truncate text-[14px] font-semibold text-neutral-800">{post.users?.display_name || post.users?.username || t.anonymous}</span>
              </div>
            </Link>

            {!isOwnPost && (
              <button 
                onClick={handleFollow} 
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

          {/* 投稿タイプに応じたコンポーネント出し分け */}
          <div className="prose-custom">
            {post.type === "gear_review" ? (
              <GearReviewDetails post={post} lang={currentLang} />
            ) : post.event_origin_id ? (
              <EventPostDetails post={post} lang={currentLang} />
            ) : (
              <CoffeeDetails post={post} lang={currentLang} />
            )}
          </div>

          {/* インタラクションエリア */}
          <div className="pt-6 border-t border-neutral-100 space-y-5">
            <div className="flex w-full items-center gap-2.5 sm:gap-4">
              
              <button 
                onClick={handleLike} 
                aria-label="Like this post"
                className={`flex h-14 shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 transition-all duration-200 group active:scale-95 sm:gap-3 sm:px-5 ${
                  liked 
                    ? "bg-neutral-900 border-neutral-900 text-white" 
                    : "bg-white border-neutral-200 text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50/50"
                }`}
              >
                <CoffeeBeanLikeIcon active={liked} className="h-6 w-5" />

                <span className="font-mono text-sm font-bold select-none min-w-[10px]">
                  {likeCount}
                </span>
              </button>

              <button 
                onClick={handleBookmark} 
                className={`h-14 min-w-0 flex-1 rounded-2xl border px-4 text-xs font-bold uppercase tracking-widest transition-all duration-200 active:scale-[0.99] sm:px-8 ${
                  bookmarked 
                    ? "bg-neutral-900 text-white border-neutral-900" 
                    : "bg-white text-neutral-800 border-neutral-200 hover:border-neutral-400 hover:bg-neutral-50/50"
                }`}
              >
                {bookmarked ? t.btnSaved : t.btnSave}
              </button>

            </div>

            {statusMessage && (
              <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/60 p-4 text-xs text-red-600 animate-fade-in sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <span className="font-medium leading-relaxed">{statusMessage.text}</span>
                <Link href={`/${currentLang}/members`} className="underline font-bold text-[11px] uppercase tracking-wider shrink-0 text-red-700 hover:text-red-900">
                  {t.btnGoRegister}
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
      <RelatedContent
        source="posts"
        currentId={post.id}
        authorId={post.user_id}
        lang={currentLang}
        postType={post.type === "gear_review" ? "gear_review" : (post.type === "event" || post.event_origin_id) ? "event" : "blog"}
      />
    </main>
  )
}
