"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import CoffeeBeanLikeIcon from "@/components/CoffeeBeanLikeIcon"
import RelatedContent from "@/components/RelatedContent"
import { ArticleSkeleton } from "@/components/ui/PageSkeletons"

type BlogArticle = {
  id: string
  user_id: string
  author_type: "pro" | "owner"
  lang: "ja" | "en"
  title: string
  content: string
  image_urls: string[] | string | null
  visibility: "draft" | "private" | "members" | "public"
  publish_target: "experts" | "origins" | "both"
  membership_tier: string
  created_at: string
}

type Props = {
  articleId: string
  lang: "ja" | "en"
  currentUserId: string | null
  currentUserTier: "free" | "standard" | "pro" | "business" | null
  initialArticle: BlogArticle
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

type BlogAuthor = {
  username: string | null
  display_name: string | null
  display_name_en: string | null
}

const VIEW_DICT = {
  ja: {
    loading: "記事を読み込んでいます...",
    notFound: "記事が見つかりません。",
    accessDenied: "この記事にアクセスする権限がありません。",
    draftBadge: "下書き",
    privateBadge: "非公開",
    membersOnlyBadge: "会員限定",
    authorPro: "PROメンバー",
    authorOwner: "OWNERメンバー",
    targetExperts: "People向け",
    targetOrigins: "Places向け",
    targetBoth: "総合記事",
    requireMemberError: "本機能の利用にはMEMBER登録が必要です。",
    btnGoRegister: "登録画面へ",
    btnSaved: "保存済み",
    btnSave: "保存する",
    btnFollowing: "フォロー中",
    btnFollow: "フォローする",
  },
  en: {
    loading: "Loading article...",
    notFound: "Article not found.",
    accessDenied: "You do not have permission to view this article.",
    draftBadge: "Draft",
    privateBadge: "Private",
    membersOnlyBadge: "Members Only",
    authorPro: "PRO Member",
    authorOwner: "OWNER Member",
    targetExperts: "For People",
    targetOrigins: "For Places",
    targetBoth: "General",
    requireMemberError: "Membership is required to use this feature.",
    btnGoRegister: "Sign Up",
    btnSaved: "Saved",
    btnSave: "Save",
    btnFollowing: "Following",
    btnFollow: "Follow",
  }
} as const

export default function BlogPageClient({
  articleId,
  lang,
  currentUserId,
  currentUserTier,
  initialArticle,
}: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = VIEW_DICT[currentLang]

  const [article, setArticle] = useState<BlogArticle | null>(initialArticle)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isTierMember, setIsTierMember] = useState(false)
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [following, setFollowing] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  
  const [likeLoading, setLikeLoading] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [author, setAuthor] = useState<BlogAuthor | null>(null)

  useEffect(() => {
    async function initArticlePage() {
      try {
        setLoading(true)
        setError(null)

        setIsTierMember(Boolean(currentUserId && currentUserTier && currentUserTier !== "free"))

        const blog = initialArticle
        setArticle(initialArticle)

        const { data: authorData } = await supabase
          .from("users")
          .select("username, display_name, display_name_en")
          .eq("id", blog.user_id)
          .maybeSingle()
        setAuthor(authorData)

        if (Array.isArray(blog.image_urls)) {
          setImageUrls(blog.image_urls.filter(Boolean))
        } else if (typeof blog.image_urls === "string" && blog.image_urls.trim() !== "") {
          setImageUrls(blog.image_urls.split(",").map((s) => s.trim()).filter(Boolean))
        } else {
          setImageUrls([])
        }

        const { count } = await supabase
          .from("blog_likes")
          .select("*", { count: "exact", head: true })
          .eq("blog_id", articleId)
        setLikeCount(count || 0)

        if (currentUserId) {
          const { data: likedData } = await supabase
            .from("blog_likes")
            .select("id")
            .eq("blog_id", articleId)
            .eq("user_id", currentUserId)
            .maybeSingle()
          setLiked(!!likedData)

          const { data: followData } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("following_id", blog.user_id)
            .maybeSingle()
          setFollowing(!!followData)

          const { data: bookmarkData } = await supabase
            .from("blog_bookmarks")
            .select("id")
            .eq("blog_id", articleId)
            .eq("user_id", currentUserId)
            .maybeSingle()
          setBookmarked(!!bookmarkData)
        }

      } catch (err) {
        console.error("Fetch article error:", err)
        setError(t.notFound)
      } finally {
        setLoading(false)
      }
    }

    if (articleId) {
      initArticlePage()
    }
  }, [articleId, currentUserId, currentUserTier, currentLang, initialArticle, t.notFound])

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
    try {
      if (liked) {
        await supabase.from("blog_likes").delete().eq("blog_id", articleId).eq("user_id", currentUserId)
        setLiked(false)
        setLikeCount((prev) => Math.max(0, prev - 1))
      } else {
        await supabase.from("blog_likes").insert({ blog_id: articleId, user_id: currentUserId })
        setLiked(true)
        setLikeCount((prev) => prev + 1)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLikeLoading(false)
    }
  }

  const handleFollow = async () => {
    setStatusMessage(null)
    if (!requirePlus() || !currentUserId || !article?.user_id || followLoading) return
    setFollowLoading(true)
    try {
      if (following) {
        await supabase.from("follows").delete().eq("follower_id", currentUserId).eq("following_id", article.user_id)
        setFollowing(false)
      } else {
        await supabase.from("follows").insert({ follower_id: currentUserId, following_id: article.user_id })
        setFollowing(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setFollowLoading(false)
    }
  }

  const handleBookmark = async () => {
    setStatusMessage(null)
    if (!requirePlus() || !currentUserId || bookmarkLoading) return
    setBookmarkLoading(true)
    try {
      if (bookmarked) {
        await supabase.from("blog_bookmarks").delete().eq("blog_id", articleId).eq("user_id", currentUserId)
        setBookmarked(false)
      } else {
        await supabase.from("blog_bookmarks").insert({ blog_id: articleId, user_id: currentUserId })
        setBookmarked(true)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setBookmarkLoading(false)
    }
  }

  if (loading) return <ArticleSkeleton />

  if (error || !article) {
    return (
      <div className="max-w-md mx-auto my-24 p-6 border border-neutral-200 bg-neutral-50/50 rounded-xl text-center text-sm text-neutral-600 shadow-sm">
        {error}
      </div>
    )
  }

  const isOwnPost = currentUserId === article.user_id

  return (
    <article className="min-h-screen bg-[radial-gradient(circle_at_10%_3%,rgba(180,112,32,0.07),transparent_30%),radial-gradient(circle_at_88%_9%,rgba(71,127,151,0.055),transparent_27%)] px-4 py-8 text-left animate-fadeIn sm:px-8 sm:py-12">
      <div className="mx-auto max-w-5xl space-y-7 rounded-[22px] border border-white/80 bg-white/85 p-4 shadow-[0_24px_70px_-48px_rgba(0,0,0,0.32)] backdrop-blur-sm sm:space-y-9 sm:rounded-[30px] sm:p-9 md:p-12">
        
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-neutral-100 pb-5">
          <div className="flex flex-wrap items-center gap-2">
            {article.visibility === "draft" && (
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-md uppercase">
                {t.draftBadge}
              </span>
            )}
            {article.visibility === "private" && (
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 bg-neutral-100 border border-neutral-300 text-neutral-600 rounded-md uppercase">
                {t.privateBadge}
              </span>
            )}
            {article.visibility === "members" && (
              <span className="text-[10px] font-bold tracking-wider px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md uppercase">
                {t.membersOnlyBadge}
              </span>
            )}

            <span className="text-[11px] font-mono font-medium text-neutral-400 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
              {article.author_type === "pro" ? t.authorPro : t.authorOwner}
            </span>

            <span className="text-[11px] font-mono font-medium text-neutral-400 bg-neutral-50 border border-neutral-200 px-2 py-0.5 rounded">
              {article.publish_target === "experts" && t.targetExperts}
              {article.publish_target === "origins" && t.targetOrigins}
              {article.publish_target === "both" && t.targetBoth}
            </span>
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

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold leading-[1.2] tracking-[-0.025em] text-neutral-950 sm:text-4xl sm:tracking-[-0.035em] md:text-5xl">
            {article.title}
          </h1>
          <p className="text-xs font-mono text-neutral-400">
            {new Date(article.created_at).toLocaleDateString(currentLang === "ja" ? "ja-JP" : "en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })}
          </p>
          {author && (
            <Link
              href={author.username ? `/${currentLang}/users/${author.username}` : "#"}
              aria-disabled={!author.username}
              className={`inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 transition ${author.username ? "hover:text-neutral-400" : "pointer-events-none"}`}
            >
              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-neutral-400">
                {currentLang === "en" ? "Author" : "投稿者"}
              </span>
              <span>{currentLang === "en" ? author.display_name_en || author.display_name || author.username : author.display_name || author.username}</span>
            </Link>
          )}
        </div>

        {imageUrls.length > 0 && (
          <div className="w-full space-y-4 overflow-hidden rounded-[28px] border border-neutral-200 bg-neutral-50 p-2 shadow-[0_20px_60px_-38px_rgba(0,0,0,0.35)]">
            {imageUrls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`${article.title} - ${index}`}
                className="max-h-[680px] w-full rounded-[22px] object-cover"
                loading="eager"
              />
            ))}
          </div>
        )}

        <div className="whitespace-pre-wrap break-words border-l-2 border-amber-300/70 py-2 pl-4 text-sm font-normal leading-7 tracking-wide text-neutral-700 sm:pl-8 sm:text-base sm:leading-8">
          {article.content}
        </div>

        <div className="pt-8 border-t border-neutral-100 space-y-5">
          <div className="flex w-full items-center gap-2.5 sm:gap-4">
            
            <button 
              onClick={handleLike} 
              disabled={likeLoading}
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
              disabled={bookmarkLoading}
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
      <RelatedContent
        source="blogs"
        currentId={article.id}
        authorId={article.user_id}
        lang={currentLang}
      />
    </article>
  )
}