"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import CoffeeBeanLikeIcon from "@/components/CoffeeBeanLikeIcon"
import RelatedContent from "@/components/RelatedContent"
import { ArticleSkeleton } from "@/components/ui/PageSkeletons"
import Image from "next/image"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import rehypeRaw from "rehype-raw"
import { canUseUserFeatures } from "@/lib/permissions"
import SocialShareButton from "@/components/SocialShareButton"

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
  created_at: string
}

type Props = {
  articleId: string
  lang: "ja" | "en"
  currentUserId: string | null
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
  avatar_url: string | null
}

const VIEW_DICT = {
  ja: {
    loading: "記事を読み込んでいます...",
    notFound: "記事が見つかりません。",
    accessDenied: "この記事にアクセスする権限がありません。",
    draftBadge: "下書き",
    privateBadge: "非公開",
    membersOnlyBadge: "ログインユーザー限定",
    requireMemberError: "この機能を利用するにはサインインしてください。",
    btnGoRegister: "サインイン",
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
    membersOnlyBadge: "Signed-in Users Only",
    requireMemberError: "Sign in to use this feature.",
    btnGoRegister: "Sign In",
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
  initialArticle,
}: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = VIEW_DICT[currentLang]

  const [article, setArticle] = useState<BlogArticle | null>(initialArticle)
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [bookmarked, setBookmarked] = useState(false)
  
  const [likeLoading, setLikeLoading] = useState(false)
  const [bookmarkLoading, setBookmarkLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [author, setAuthor] = useState<BlogAuthor | null>(null)

  useEffect(() => {
    async function initArticlePage() {
      try {
        setLoading(true)
        setError(null)

        const blog = initialArticle
        setArticle(initialArticle)

        const { data: authorData } = await supabase
          .from("users")
          .select("username, display_name, display_name_en, avatar_url")
          .eq("id", blog.user_id)
          .maybeSingle()
        setAuthor(authorData)

        if (Array.isArray(blog.image_urls)) {
          setImageUrls(blog.image_urls.filter(Boolean))
        } else if (typeof blog.image_urls === "string" && blog.image_urls.trim() !== "") {
          try {
            const parsed = JSON.parse(blog.image_urls)
            setImageUrls(Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string" && Boolean(url)) : [])
          } catch {
            setImageUrls(blog.image_urls.startsWith("http") ? [blog.image_urls.trim()] : [])
          }
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
  }, [articleId, currentUserId, currentLang, initialArticle, t.notFound])

  const requirePlus = () => {
    if (!canUseUserFeatures(currentUserId)) {
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
    <main className="public-page-shell px-4 py-8 text-left animate-fadeIn sm:px-8 md:px-12 md:py-12 lg:px-16">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-9 lg:grid-cols-12 lg:gap-16">
        <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:sticky lg:top-28 lg:col-span-6">
          {imageUrls.length > 0 ? imageUrls.map((url, index) => (
            <div key={`${url}-${index}`} className="public-media-frame w-full">
              <img
                src={url}
                alt={`${article.title} - ${index + 1}`}
                className="mx-auto block h-auto max-h-[80vh] w-full object-contain"
                loading={index === 0 ? "eager" : "lazy"}
              />
            </div>
          )) : (
            <div className="public-media-frame flex aspect-[4/5] w-full items-center justify-center border-dashed bg-neutral-50 text-[10px] uppercase tracking-[0.16em] text-neutral-400">
              No image
            </div>
          )}
        </div>

        <article className="public-panel space-y-8 p-4 sm:space-y-10 sm:p-8 lg:col-span-6 lg:p-10">
          <header className="space-y-6 border-b border-neutral-100 pb-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="public-kicker public-accent-warm">BLOG</span>
                {article.visibility === "draft" && <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-[10px] font-semibold text-amber-700">{t.draftBadge}</span>}
                {article.visibility === "private" && <span className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[10px] font-semibold text-neutral-600">{t.privateBadge}</span>}
                {article.visibility === "members" && <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[10px] font-semibold text-sky-700">{t.membersOnlyBadge}</span>}
              </div>
            </div>

            {author && (
              <Link
                href={author.username ? `/${currentLang}/users/${author.username}` : "#"}
                aria-disabled={!author.username}
                className={`flex w-fit items-center gap-3.5 transition ${author.username ? "hover:opacity-70" : "pointer-events-none"}`}
              >
                <div className="relative size-11 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-50">
                  {author.avatar_url ? (
                    <Image src={author.avatar_url} alt="" fill sizes="44px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center font-mono text-xs text-neutral-300">
                      {(author.display_name || author.username || "CJ").slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-neutral-400">{currentLang === "en" ? "Author" : "投稿者"}</p>
                  <p className="mt-0.5 truncate text-sm font-semibold text-neutral-800">
                    {currentLang === "en" ? author.display_name_en || author.display_name || author.username : author.display_name || author.username}
                  </p>
                </div>
              </Link>
            )}

            <div>
              <h1 className="text-3xl font-semibold leading-[1.15] tracking-[-0.035em] text-neutral-950 sm:text-4xl lg:text-5xl">{article.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                <time className="font-mono text-[10px] text-neutral-400">
                  {new Date(article.created_at).toLocaleDateString(currentLang === "ja" ? "ja-JP" : "en-US", { year: "numeric", month: "long", day: "numeric" })}
                </time>
              </div>
            </div>
          </header>

          <div className="public-reading-block prose-custom min-w-0 break-words text-sm leading-8 sm:pl-7 sm:text-base">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
              {article.content}
            </ReactMarkdown>
          </div>

          <div className="space-y-5 border-t border-neutral-100 pt-8">
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

            {article.visibility !== "draft" && article.visibility !== "private" && (
              <SocialShareButton title={article.title} text={article.content.slice(0, 140)} lang={currentLang} compact className="h-14 w-14" />
            )}

          </div>

          {statusMessage && (
            <div className="flex flex-col items-start gap-3 rounded-xl border border-red-200/80 bg-red-50/60 p-4 text-xs text-red-600 animate-fade-in sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <span className="font-medium leading-relaxed">{statusMessage.text}</span>
              <Link href={`/${currentLang}/login`} className="underline font-bold text-[11px] uppercase tracking-wider shrink-0 text-red-700 hover:text-red-900">
                {t.btnGoRegister}
              </Link>
            </div>
          )}
          </div>
        </article>
      </div>
      <RelatedContent
        source="blogs"
        currentId={article.id}
        authorId={article.user_id}
        lang={currentLang}
      />
    </main>
  )
}
