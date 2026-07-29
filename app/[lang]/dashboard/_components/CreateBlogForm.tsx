"use client"

import { useState, useEffect, useMemo, useRef, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import HeroImageUploader from "./HeroImageUploader"
import FormPublishSettings from "./FormPublishSettings" // ✨ インポート
import { serverMoveToPermanentStorage } from "@/app/actions/createPost"

type Props = { 
  onBlogCreated: () => void 
  lang?: string
  authorType: "pro" | "owner"
  membership_tier: "free" | "standard" | "pro" | "business"
  editId?: string
  secondaryAction?: ReactNode
  deleteStatusMessage?: StatusMessage | null
}

type StatusMessage = {
  text: string
  type: "error" | "success"
}

type VisibilityType = "draft" | "private" | "members" | "public"
type TargetCategoryType = "experts" | "origins" | "both"

const ADMIN_EMAIL = "rivu65622252@gmail.com"

const BLOG_FORM_DICT = {
  ja: {
    mainTitle: "PUBLISH ARTICLE",
    mainDesc: "記事の作成",
    labelTitle: "TITLE",
    subTitle: "記事のタイトルを入力してください（最大100文字）",
    placeholderTitle: "記事のタイトル",
    labelContent: "CONTENT",
    subContent: "記事の本文を入力してください（最大10,000文字）",
    placeholderContent: "内容をご記入ください。",
    imageRequiredError: "カバー画像のアップロードは必須です。",
    loginRequired: "ログインしてください",
    successMessage: "記事を投稿しました。",
    errorMessage: "エラーが発生しました。",
    submitting: "処理中...",
    submitButton: "投稿する",
    labelVisibility: "公開設定",
    statusDraft: "下書き",
    statusPrivate: "非公開 (自分のみ)",
    statusMembers: "限定公開 (会員のみ)",
    statusPublic: "公開 (全員に公開)",
    labelPublishTarget: "投稿先の選択",
    targetExperts: "人カテゴリー (experts)",
    targetOrigins: "場所カテゴリー (origins)",
    targetBoth: "両方のカテゴリー"
  },
  en: {
    mainTitle: "PUBLISH ARTICLE",
    mainDesc: "Create New Post",
    labelTitle: "TITLE",
    subTitle: "Please enter the article title (Max 100 characters)",
    placeholderTitle: "Title",
    labelContent: "CONTENT",
    subContent: "Please enter the article content (Max 10,000 characters)",
    placeholderContent: "Your content here...",
    imageRequiredError: "Hero image is required.",
    loginRequired: "Please log in",
    successMessage: "Post published successfully.",
    errorMessage: "An error occurred.",
    submitting: "Processing...",
    submitButton: "Publish",
    labelVisibility: "Visibility",
    statusDraft: "Draft",
    statusPrivate: "Private (Just me)",
    statusMembers: "Members Only",
    statusPublic: "Public (Everyone)",
    labelPublishTarget: "Publish Target Category",
    targetExperts: "People (experts)",
    targetOrigins: "Places (origins)",
    targetBoth: "Publish to Both"
  }
} as const

export default function CreateBlogForm({ onBlogCreated, lang = "ja", authorType, membership_tier, editId, secondaryAction, deleteStatusMessage }: Props) {
  const router = useRouter()
  const currentLang = lang === "en" ? "en" : "ja"
  const t = BLOG_FORM_DICT[currentLang]

  const normalizedTier = useMemo(() => membership_tier?.trim().toLowerCase(), [membership_tier])

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [visibility, setVisibility] = useState<VisibilityType>("draft")
  const [targetCategory, setTargetCategory] = useState<TargetCategoryType>("experts")

  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [_, setIsAdmin] = useState(false)
  const [loadingInitial, setLoadingInitial] = useState(Boolean(editId))
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([])
  const initialImagesRef = useRef<string[]>([])

  useEffect(() => {
    async function checkUserRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setIsAdmin(user.email === ADMIN_EMAIL)
      }
    }
    checkUserRole()
    return () => setStatusMessage(null)
  }, [])

  useEffect(() => {
    if (!editId) return
    let active = true
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data, error } = await supabase.from("blogs")
        .select("title, content, image_urls, visibility, publish_target, author_type")
        .eq("id", editId).eq("user_id", user.id).single()
      if (!active) return
      if (error || !data) {
        setStatusMessage({ text: currentLang === "en" ? "Article not found." : "ブログ記事が見つかりません。", type: "error" })
      } else {
        const urls = Array.isArray(data.image_urls) ? data.image_urls.filter((url): url is string => typeof url === "string") : []
        setTitle(data.title || "")
        setContent(data.content || "")
        setImageUrls(urls)
        initialImagesRef.current = urls
        setVisibility(data.visibility || "draft")
        setTargetCategory(data.publish_target || "experts")
      }
      setLoadingInitial(false)
    })()
    return () => { active = false }
  }, [currentLang, editId])

  const isTitleInvalid = !title.trim() || title.length > 100
  const isContentInvalid = !content.trim() || content.length > 10000
  const isImageInvalid = imageUrls.length === 0
  const isFormInvalid = isTitleInvalid || isContentInvalid || isImageInvalid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (isFormInvalid) {
      if (isImageInvalid) {
        setStatusMessage({ text: t.imageRequiredError, type: "error" })
      }
      return
    }

    setSubmitting(true)
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setStatusMessage({ text: t.loginRequired, type: "error" })
        setSubmitting(false)
        return
      }

      const finalCategory = normalizedTier === "business" ? targetCategory : "experts"
      const permanentImageUrls = await Promise.all(
        imageUrls.map(url => serverMoveToPermanentStorage(url))
      )

      const payload = {
        user_id: user.id,
        author_type: authorType,
        lang: currentLang,
        title: title.trim(),
        content: content.trim(),
        image_urls: permanentImageUrls,
        visibility: visibility,         
        publish_target: finalCategory,
        membership_tier: normalizedTier
      }
      const { error } = editId
        ? await supabase.from("blogs").update(payload).eq("id", editId).eq("user_id", user.id)
        : await supabase.from("blogs").insert(payload)

      if (error) throw error
      for (const url of removedImageUrls.filter(url => initialImagesRef.current.includes(url) && !imageUrls.includes(url))) {
        await fetch("/api/delete-object", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
      }
      initialImagesRef.current = permanentImageUrls
      setImageUrls(permanentImageUrls)
      setRemovedImageUrls([])

      setStatusMessage({ text: editId ? (currentLang === "en" ? "Article updated." : "ブログ記事を更新しました。") : t.successMessage, type: "success" })
      if (editId) {
        router.push(`/${currentLang}/blogs/${editId}`)
        router.refresh()
        return
      }
      
      setTimeout(() => setStatusMessage(null), 4000)

      setTitle("")
      setContent("")
      setImageUrls([])
      setVisibility("draft")
      setTargetCategory("experts")
      onBlogCreated()
    } catch (err: any) {
      console.error("Form submit error:", err)
      setStatusMessage({ text: err?.message || t.errorMessage, type: "error" })
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingInitial) return <div className="h-[620px] animate-pulse rounded-xl border border-neutral-100 bg-neutral-50" />

  return (
    <div className="bg-white border border-neutral-200 p-4 sm:p-10 rounded-xl shadow-sm w-full max-w-5xl mx-auto text-left transition-all duration-300">
      <div>
        <h2 className="text-base sm:text-lg font-bold tracking-wider text-neutral-900 uppercase">
          {t.mainTitle}
        </h2>
        <p className="mt-1 text-xs sm:text-[13px] font-normal tracking-wide text-neutral-500">
          {t.mainDesc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 sm:mt-10 space-y-6 sm:space-y-10">
        
        <HeroImageUploader 
          currentLang={currentLang} 
          initialImageUrls={imageUrls}
          onImagesChanged={setImageUrls} 
          deferDeletion={Boolean(editId)}
          onRemovedImagesChanged={setRemovedImageUrls}
          isAdmin={currentLang === "ja"} 
        />

        <div className="space-y-6 sm:space-y-8 border-t border-neutral-100 pt-6 sm:pt-8">
          
          {/* タイトル入力欄 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <p className="text-xs sm:text-[13px] tracking-[0.14em] text-neutral-900 font-bold uppercase">
                {t.labelTitle}
              </p>
              <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
                {title.length} / 100
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 leading-relaxed">{t.subTitle}</p>
            <input 
              type="text" 
              required 
              maxLength={100}
              placeholder={t.placeholderTitle} 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              className="w-full text-sm sm:text-[15px] border border-neutral-300 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 placeholder:text-neutral-400 transition-all duration-300 shadow-sm" 
            />
          </div>

          {/* 本文入力欄 */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <p className="text-xs sm:text-[13px] tracking-[0.14em] text-neutral-900 font-bold uppercase">
                {t.labelContent}
              </p>
              <span className="text-[10px] sm:text-[11px] font-mono text-neutral-400 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100">
                {content.length.toLocaleString()} / 10,000
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-neutral-500 leading-relaxed">{t.subContent}</p>
            <textarea 
              required 
              rows={10} 
              maxLength={10000}
              placeholder={t.placeholderContent} 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              className="w-full text-sm sm:text-[15px] border border-neutral-300 rounded-xl px-3.5 py-2.5 sm:px-4 sm:py-3 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 placeholder:text-neutral-400 resize-none leading-relaxed transition-all duration-300 shadow-sm min-h-[200px]" 
            />
          </div>
        </div>

        {/* ✅ 修正箇所: submitting にはローディング状態のみを渡し、入力不足の判定は disabled に分離 */}
        <FormPublishSettings 
          dict={t}
          normalizedTier={normalizedTier}
          visibility={visibility}
          setVisibility={setVisibility}
          targetCategory={targetCategory}
          setTargetCategory={setTargetCategory}
          submitting={submitting}
          disabled={isFormInvalid}
          statusMessage={deleteStatusMessage || statusMessage}
          secondaryAction={secondaryAction}
        />

      </form>
    </div>
  )
}
