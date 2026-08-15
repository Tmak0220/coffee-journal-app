"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { supabase } from "@/lib/supabase"

import AvatarUpload from "./AvatarUpload"
import ProfileForm from "./ProfileForm"
import OwnerProfileForm from "./OwnerProfileForm" 
import ProProfileForm from "./ProProfileForm" 
import CoffeeAnalyticsCharts from "./CoffeeAnalyticsCharts"
import CreateLogForm from "./CreateLogForm"
import CreateBlogForm from "./CreateBlogForm"
import GearReviewForm from "./GearReviewForm"
import NotificationCenter from "./NotificationCenter"
import PostList from "./PostList"
import AdminJournalManager from "./AdminJournalManager"
import AdminTranslationManager from "./AdminTranslationManager"
import AdminNotificationManager from "./AdminNotificationManager" 
import LanguageSwitcherTabs from "./LanguageSwitcherTabs" 
import PublishProRecipeForm from "./PublishProRecipeForm"
import ShopProductsSection from "./ShopProductsSection"
import BroadcastNotificationForm from "./BroadcastNotificationForm"
import PeoplePostList from "components/PeoplePostList"
import B2BInquiryPanel from "@/components/B2BInquiryPanel"
import ProPostList from "./ProPostList"
import { useAppPopup } from "@/context/AppPopupContext"
import ServiceMarketplacePanel from "@/components/ServiceMarketplacePanel"

type ToolType = "recipe" | "profile" | "cupping"

type UserProfile = {
  id: string
  username: string
  display_name: string | null
  display_name_en?: string | null
  bio: string | null
  bio_en?: string | null
  avatar_url: string | null
  cover_url: string | null
  role: "user" | "pro" | "owner" | "admin"
  current_store?: string | null
  past_stores?: string[] | null
  awards?: string | null
  categories?: string[] | null
}

type DashboardView =
  | "home"
  | "create"
  | "library"
  | "analytics"
  | "profiles"
  | "business"
  | "notifications"
  | "settings"
  | "admin"
  | "r2_viewer"

type Props = {
  profile: UserProfile
  userId: string
  logs: any[]
  enabledTools: ToolType[]                
  onToggleTool: (tool: ToolType) => void 
  t: any
  lang: "ja" | "en"
}

type R2Image = {
  key: string
  url: string
  size: number
  lastModified: string
  isTemporary?: boolean
  references?: Array<{
    type: "post" | "blog" | "verification" | "avatar" | "cover"
    id: string
    userId: string
    href: string | null
    label: string
  }>
}

function ProfileReviewGuard({ lang, accountType }: { lang: "ja" | "en"; accountType: "pro" | "owner" }) {
  const label = accountType === "pro"
    ? (lang === "en" ? "professional" : "プロ")
    : (lang === "en" ? "owner" : "オーナー")

  return (
    <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 px-6 py-10 text-center shadow-sm">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-neutral-400 uppercase mb-3">
        {lang === "en" ? "PROFILE REVIEW REQUIRED" : "プロフィール審査が必要です"}
      </p>
      <p className="text-sm leading-relaxed text-neutral-600">
        {lang === "en"
          ? `Features for your ${label} public page will become available after the profile is approved and published. Tasting records, event posts, and gear reviews remain available.`
          : `${label}公開ページ向けの投稿・ビジネス機能は、プロフィールの審査が完了し公開された後に利用できます。テイスト投稿・イベント投稿・器具レビューは引き続き利用できます。`}
      </p>
    </div>
  )
}

function UserProfileGuard({ lang }: { lang: "ja" | "en" }) {
  return (
    <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 px-6 py-10 text-center shadow-sm">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
        {lang === "en" ? "COMPLETE YOUR PROFILE" : "プロフィール入力が必要です"}
      </p>
      <p className="text-sm leading-relaxed text-neutral-600">
        {lang === "en"
          ? "Set your username and display name above to unlock posting features."
          : "上のプロフィール設定でユーザーネームと表示名を入力すると、投稿機能をご利用いただけます。"}
      </p>
    </div>
  )
}

function DashboardSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title?: string
  description?: string
}) {
  return (
    <div className="border-b border-neutral-200 pb-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-900">{eyebrow}</p>
      {title && <h3 className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{title}</h3>}
      {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>}
    </div>
  )
}

type DashboardScope = "user" | "expert" | "origin" | "expert-origin"

function DashboardScopeDivider({ scope, lang }: { scope: DashboardScope; lang: "ja" | "en" }) {
  const content: Record<DashboardScope, {
    eyebrow: string
    title: { ja: string; en: string }
    destination: { ja: string; en: string }
    description: { ja: string; en: string }
  }> = {
    user: {
      eyebrow: "USER ACCOUNT",
      title: { ja: "ユーザーアカウントの機能", en: "User account tools" },
      destination: { ja: "表示先：USERページ", en: "Appears on: USER page" },
      description: { ja: "共通プロフィール、テイスト投稿、イベント投稿、器具レビューを管理します。", en: "Manage your shared profile, tasting posts, event posts, and gear reviews." },
    },
    expert: {
      eyebrow: "PRO / EXPERT",
      title: { ja: "プロアカウントの機能", en: "Pro account tools" },
      destination: { ja: "表示先：EXPERTページ", en: "Appears on: EXPERT page" },
      description: { ja: "専門プロフィール、ブログ、検証記事、プロ向けのお知らせを管理します。", en: "Manage your expert profile, blogs, verification articles, and professional updates." },
    },
    origin: {
      eyebrow: "OWNER / ORIGIN",
      title: { ja: "オーナーアカウントの機能", en: "Owner account tools" },
      destination: { ja: "表示先：ORIGINページ", en: "Appears on: ORIGIN page" },
      description: { ja: "店舗・ブランドプロフィール、ブログ、検証記事、店舗からのお知らせを管理します。", en: "Manage your shop or brand profile, blogs, verification articles, and origin updates." },
    },
    "expert-origin": {
      eyebrow: "ADMIN / PROFESSIONAL",
      title: { ja: "専門ページ共通の機能", en: "Professional page tools" },
      destination: { ja: "表示先：EXPERT・ORIGIN両ページ", en: "Appears on: EXPERT and ORIGIN pages" },
      description: { ja: "ここで作成したブログと検証記事は、EXPERTとORIGINの両方に表示されます。", en: "Blogs and verification articles created here appear on both EXPERT and ORIGIN pages." },
    },
  }
  const item = content[scope]

  return (
    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/70 px-4 py-4 sm:px-5" role="group" aria-label={item.title[lang]}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-neutral-400">{item.eyebrow}</p>
          <h2 className="mt-1.5 text-sm font-bold text-neutral-900">{item.title[lang]}</h2>
          <p className="mt-1 text-[11px] leading-5 text-neutral-500">{item.description[lang]}</p>
        </div>
        <span className="w-fit shrink-0 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-[9px] font-semibold tracking-wide text-neutral-600 shadow-sm">
          {item.destination[lang]}
        </span>
      </div>
    </div>
  )
}

function DashboardNavIcon({ name }: { name: DashboardView }) {
  const common = "h-[18px] w-[18px] shrink-0"
  if (name === "home") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" /></svg>
  if (name === "create") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="9" /></svg>
  if (name === "library") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 4h12a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2zM7 4v16" /></svg>
  if (name === "analytics") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M5 19V9M12 19V5M19 19v-7M3 19h18" /></svg>
  if (name === "profiles") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" /></svg>
  if (name === "business") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 8h16v12H4zM8 8V5h8v3M4 13h16" /></svg>
  if (name === "notifications") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M6 17h12l-1.5-2.5V10a4.5 4.5 0 0 0-9 0v4.5zM10 20h4" /></svg>
  if (name === "settings") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="3" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></svg>
  if (name === "r2_viewer") return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="m5 17 5-4 3 2 2-2 4 4" /></svg>
  return <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M12 3 4 7v5c0 5 3.4 8 8 9 4.6-1 8-4 8-9V7zM9 12l2 2 4-5" /></svg>
}

/* --- 運営者へのリクエスト送信モーダルコンポーネント --- */
function AdminRequestModal({ userId, lang, isOpen, onClose }: { userId: string; lang: "ja" | "en"; isOpen: boolean; onClose: () => void }) {
  const { showPopup } = useAppPopup()
  const [requestType, setRequestType] = useState("feature_request")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  if (!isOpen) return null

  const isEn = lang === "en"
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setLoading(true)
    const { error } = await supabase.from("admin_notifications").insert({
      user_id: userId,
      type: requestType,
      admin_comment: message.trim(),
      status: "pending",
    })

    setLoading(false)
    if (!error) {
      setSent(true)
      setTimeout(() => {
        setSent(false)
        setMessage("")
        onClose()
      }, 1800)
    } else {
      showPopup(
        isEn ? "We couldn't send your request. Please wait a moment and try again." : "リクエストを送信できませんでした。時間をおいて、もう一度お試しください。",
        "error",
        isEn ? "Request not sent" : "送信に失敗しました"
      )
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/45 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-[0_24px_80px_-24px_rgba(0,0,0,0.35)] relative animate-fadeIn">
        <button type="button" onClick={onClose} aria-label={isEn ? "Close" : "閉じる"} className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors">✕</button>
        <div className="pr-10 mb-7">
          <p className="text-[10px] font-bold tracking-[0.16em] uppercase text-neutral-400 mb-2">Support Request</p>
          <h3 className="text-lg font-bold tracking-wide text-neutral-900">
            {isEn ? "Send a Request to the Team" : "運営者へのリクエスト送信"}
          </h3>
          <p className="text-[13px] leading-relaxed text-neutral-500 mt-2">
            {isEn ? "Send feature requests, questions, or correction requests directly to our team." : "機能の追加要望やご質問・修正依頼などを直接運営者にお送りいただけます。"}
          </p>
        </div>

        {sent ? (
          <div className="py-12 text-center text-xs font-bold text-emerald-600">
            {isEn ? "Request sent successfully!" : "リクエストを送信しました！"}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">{isEn ? "Request Type" : "リクエスト種別"}</label>
              <select
                value={requestType}
                onChange={(e) => setRequestType(e.target.value)}
                className="w-full text-[13px] px-4 py-3 border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-colors"
              >
                <option value="feature_request">{isEn ? "Feature Request" : "機能追加のリクエスト"}</option>
                <option value="data_correction">{isEn ? "Data Correction" : "データ修正依頼"}</option>
                <option value="other_inquiry">{isEn ? "Other Inquiry" : "その他のお問い合わせ"}</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-neutral-600 uppercase tracking-wider">{isEn ? "Message" : "内容"}</label>
              <textarea
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={isEn ? "Describe your request..." : "具体的な要望やご質問内容をご記入ください..."}
                className="w-full text-[13px] leading-relaxed p-4 border border-neutral-200 rounded-xl bg-neutral-50 focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 resize-y min-h-[128px] transition-colors"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 pt-2 border-t border-neutral-100">
              <button type="button" onClick={onClose} className="px-5 py-3 text-xs font-semibold text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 rounded-xl transition-colors">
                {isEn ? "Cancel" : "キャンセル"}
              </button>
              <button type="submit" disabled={loading || !message.trim()} className="px-6 py-3 text-xs font-bold bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl shadow-sm disabled:bg-neutral-200 disabled:text-neutral-400 transition-colors">
                {loading ? (isEn ? "Sending..." : "送信中...") : (isEn ? "Send Request" : "送信する")}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

function R2ImageViewer({ isEn }: { isEn: boolean }) {
  const { showPopup, confirmPopup } = useAppPopup()
  const [images, setImages] = useState<R2Image[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [warningKey, setWarningKey] = useState<string | null>(null)
  const [warningMessage, setWarningMessage] = useState("")
  const [actingKey, setActingKey] = useState<string | null>(null)
  
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>("all")

  const pageRef = useRef<number>(0)

  const availableMonths = useMemo(() => {
    const months: string[] = []
    const startYear = 2018
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year >= startYear; year--) {
      for (let month = 12; month >= 1; month--) {
        months.push(`${year}-${String(month).padStart(2, "0")}`)
      }
    }
    return months
  }, [])

  const fetchImages = async (isInitial = false) => {
    if (loading) return
    setLoading(true)
    setError(null)

    if (isInitial) {
      pageRef.current = 0 
    }

    try {
      const params = new URLSearchParams({
        page: String(pageRef.current),
        sortOrder: sortOrder,
        selectedYearMonth: selectedYearMonth
      })

      const res = await fetch(`/api/admin/r2-images?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      const newImages = data.images || []
      
      if (isInitial) {
        setImages(newImages)
      } else {
        setImages(prev => {
          const combined = [...prev, ...newImages]
          return combined.filter((img, idx, self) => self.findIndex(i => i.key === img.key) === idx)
        })
      }
      
      setTotalCount(data.totalCount || 0)
      setHasMore(data.hasMore ?? false)
      
      pageRef.current = pageRef.current + 1

    } catch (err: any) {
      console.error("R2 fetch error:", err)
      setError(err.message || "画像の取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setImages([])
    setHasMore(true)
    fetchImages(true)
  }, [sortOrder, selectedYearMonth])

  const copyToClipboard = (text: string) => {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const deleteImage = async (image: R2Image) => {
    const confirmed = await confirmPopup({
      title: isEn ? "Delete this R2 image?" : "このR2画像を削除しますか？",
      message: isEn
        ? "The image will also be removed from the linked post or profile. This cannot be undone."
        : "紐付いている投稿・プロフィールからも画像を外します。この操作は元に戻せません。",
      confirmLabel: isEn ? "Delete" : "削除する",
      cancelLabel: isEn ? "Cancel" : "キャンセル",
      danger: true,
    })
    if (!confirmed) return
    setActingKey(image.key)
    const response = await fetch("/api/admin/r2-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete", key: image.key }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      showPopup(result.error || (isEn ? "Failed to delete image." : "画像を削除できませんでした。"), "error")
    } else {
      setImages((current) => current.filter((item) => item.key !== image.key))
      setTotalCount((count) => Math.max(0, count - 1))
      showPopup(isEn ? "Image deleted." : "画像を削除しました。", "success")
    }
    setActingKey(null)
  }

  const sendWarning = async (image: R2Image) => {
    if (!warningMessage.trim()) return
    setActingKey(image.key)
    const response = await fetch("/api/admin/r2-images", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "warn", key: image.key, message: warningMessage.trim() }),
    })
    const result = await response.json().catch(() => ({}))
    if (!response.ok) {
      showPopup(result.error || (isEn ? "Failed to send warning." : "警告を送信できませんでした。"), "error")
    } else {
      setWarningKey(null)
      setWarningMessage("")
      showPopup(isEn ? "Warning sent to the user." : "ユーザーへ警告を送信しました。", "success")
    }
    setActingKey(null)
  }

  const selectBoxStyle = "text-[14px] font-normal border border-neutral-300 rounded-xl px-4 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 cursor-pointer transition-all duration-300 pr-9 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat shadow-sm"

  return (
    <div className="bg-white border border-neutral-200 pt-6 sm:pt-10 pb-10 sm:pb-16 px-6 sm:px-10 rounded-xl shadow-sm w-full max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-100 pb-5">
        <div>
          <h2 className="text-[15px] font-bold tracking-wider text-neutral-900 uppercase">R2 STORAGE IMAGES</h2>
          <p className="mt-0.5 text-[11px] font-mono tracking-wider text-neutral-400">TOTAL: {images.length} / {totalCount} IMAGES</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={selectedYearMonth} onChange={(e) => setSelectedYearMonth(e.target.value)} className={selectBoxStyle}>
            <option value="all">{isEn ? "All Months" : "すべての年月"}</option>
            {availableMonths.map((ym) => {
              const [year, month] = ym.split("-")
              return <option key={ym} value={ym}>{!isEn ? `${year}年${parseInt(month, 10)}月` : ym}</option>
            })}
          </select>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className={selectBoxStyle}>
            <option value="newest">{isEn ? "Newest first" : "新しい順"}</option>
            <option value="oldest">{isEn ? "Oldest first" : "古い順"}</option>
          </select>
        </div>
      </div>
      {error && <div className="max-w-md mx-auto p-4 border border-red-200 bg-red-50/50 rounded-xl text-center text-xs text-red-500">エラーが発生しました: {error}</div>}
      {images.length === 0 && !loading ? (
        <div className="text-center py-24 text-neutral-400 text-[14px] tracking-wide font-normal">該当する画像データがありません。</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img) => (
              <div key={img.key} className="group bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl overflow-hidden flex flex-col transition-all duration-300 shadow-sm hover:shadow-md">
                <div className="w-full aspect-square bg-neutral-50 border-b border-neutral-100 overflow-hidden relative">
                  <img src={img.url} alt={img.key} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                    <button type="button" onClick={() => copyToClipboard(img.url)} className="text-[11px] text-white tracking-wide font-medium bg-neutral-950/90 hover:bg-neutral-900 px-3 py-2 rounded-xl backdrop-blur-sm transition-all duration-200 w-full text-center truncate shadow-sm active:scale-[0.97]">{copiedKey === img.url ? "コピー完了!" : "URLをコピー"}</button>
                  </div>
                </div>
                <div className="p-3.5 space-y-1.5 bg-white flex-1 flex flex-col justify-between">
                  <p className="text-[12px] font-medium text-neutral-700 truncate cursor-pointer hover:text-neutral-900 transition-colors" title={img.key} onClick={() => copyToClipboard(img.key)}>{img.key}</p>
                  <div className="space-y-1">
                    {img.isTemporary && <span className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">TMP</span>}
                    {(img.references || []).map((reference) => reference.href && (
                      <a key={`${reference.type}-${reference.id}`} href={reference.href} target="_blank" rel="noreferrer" className="block truncate text-[10px] font-medium text-blue-600 underline underline-offset-2">
                        {isEn ? "Open related post" : "関連投稿を開く"}: {reference.label}
                      </a>
                    ))}
                    {!img.isTemporary && (img.references || []).length === 0 && (
                      <span className="text-[9px] text-amber-600">{isEn ? "No database reference" : "DB参照なし"}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button type="button" disabled={actingKey === img.key || !(img.references || []).length} onClick={() => { setWarningKey(img.key); setWarningMessage("") }} className="rounded-lg border border-neutral-200 px-2 py-1.5 text-[9px] font-semibold text-neutral-600 disabled:opacity-30">
                      {isEn ? "WARN" : "警告"}
                    </button>
                    <button type="button" disabled={actingKey === img.key} onClick={() => void deleteImage(img)} className="rounded-lg border border-red-200 px-2 py-1.5 text-[9px] font-semibold text-red-600 disabled:opacity-30">
                      {isEn ? "DELETE" : "削除"}
                    </button>
                  </div>
                  {warningKey === img.key && (
                    <div className="space-y-1.5 pt-1">
                      <textarea value={warningMessage} onChange={(event) => setWarningMessage(event.target.value)} rows={3} maxLength={1000} placeholder={isEn ? "Write a warning..." : "警告内容を入力..."} className="w-full resize-none rounded-lg border border-neutral-200 p-2 text-[10px] outline-none focus:border-neutral-400" />
                      <div className="flex gap-1">
                        <button type="button" onClick={() => void sendWarning(img)} disabled={!warningMessage.trim() || actingKey === img.key} className="flex-1 rounded-lg bg-neutral-900 px-2 py-1.5 text-[9px] font-semibold text-white disabled:opacity-40">{isEn ? "SEND" : "送信"}</button>
                        <button type="button" onClick={() => { setWarningKey(null); setWarningMessage("") }} className="rounded-lg border border-neutral-200 px-2 py-1.5 text-[9px]">{isEn ? "CANCEL" : "取消"}</button>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-50">
                    <span>{formatSize(img.size)}</span>
                    <span>{new Date(img.lastModified).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center pt-8">
              <button type="button" onClick={() => fetchImages(false)} disabled={loading} className="text-[14px] font-medium border border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:border-neutral-400 bg-white px-8 py-2.5 rounded-xl transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 select-none">{loading ? (isEn ? "Loading..." : "読み込み中...") : (isEn ? "Load More" : "もっと見る")}</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default function UnifiedDashboard({
  profile,
  userId,
  logs,
  enabledTools, 
  onToggleTool, 
  t,
  lang
}: Props) {
  const { showPopup, confirmPopup } = useAppPopup()
  const [activeView, setActiveView] = useState<DashboardView>("home")
  const [formLanguage, setFormLanguage] = useState<"ja" | "en">(lang)
  const [expertData, setExpertData] = useState<any>(null)
  const [ownerData, setOwnerData] = useState<any>(null)
  const [proPostingEnabled, setProPostingEnabled] = useState(false)
  const [ownerPostingEnabled, setOwnerPostingEnabled] = useState(false)
  const [userProfileComplete, setUserProfileComplete] = useState(Boolean(profile.username && profile.display_name))
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [proPostRefreshKey, setProPostRefreshKey] = useState(0)
  const [userPostRefreshKey, setUserPostRefreshKey] = useState(0)
  const [sharedAvatarUrl, setSharedAvatarUrl] = useState<string | null>(profile.avatar_url)
  const [sharedCoverUrl, setSharedCoverUrl] = useState<string | null>(profile.cover_url)
  const [liveUserProfile, setLiveUserProfile] = useState<UserProfile>(profile)
  const [roleChanging, setRoleChanging] = useState(false)

  const isAdmin = profile.role === "admin"
  const hasProAccess = profile.role === "pro" || isAdmin
  const hasBusinessAccess = profile.role === "owner" || isAdmin
  const professionalPostingEnabled = isAdmin || (profile.role === "pro" ? proPostingEnabled : ownerPostingEnabled)
  // Tasting records, event posts, and gear reviews belong to the shared user
  // workspace. Professional profile review must only guard expert/origin features.
  const userPostingEnabled = isAdmin || userProfileComplete
  const professionalAuthorType: "pro" | "owner" = profile.role === "owner" ? "owner" : "pro"
  const professionalPublishTarget: "experts" | "origins" | "both" = isAdmin
    ? "both"
    : profile.role === "owner" ? "origins" : "experts"

  const isEn = lang === "en"
  const showsContentLanguageSwitcher = ["create", "library", "analytics", "profiles"].includes(activeView)
    || (activeView === "notifications" && (hasProAccess || hasBusinessAccess))
    || (activeView === "admin" && isAdmin)

  useEffect(() => {
    const savedLanguage = window.localStorage.getItem(`coffee-journal:dashboard-content-language:${profile.id}`)
    if (savedLanguage === "ja" || savedLanguage === "en") setFormLanguage(savedLanguage)
  }, [profile.id])

  const changeContentLanguage = (nextLanguage: "ja" | "en") => {
    setFormLanguage(nextLanguage)
    window.localStorage.setItem(`coffee-journal:dashboard-content-language:${profile.id}`, nextLanguage)
  }
  const navItems = useMemo(() => {
    const items: Array<{ id: DashboardView; label: string; hint: string; group: "main" | "manage" }> = [
      { id: "home", label: isEn ? "Overview" : "ホーム", hint: isEn ? "Dashboard overview" : "機能と状態の一覧", group: "main" },
      { id: "create", label: isEn ? "Posts & Records" : "投稿・記録", hint: isEn ? "Create and publish" : "記録と記事を作成", group: "main" },
      { id: "library", label: isEn ? "Library" : "ライブラリ", hint: isEn ? "Posts and linked content" : "投稿と関連コンテンツ", group: "main" },
      { id: "analytics", label: isEn ? "Analytics" : "分析", hint: isEn ? "Review your coffee data" : "コーヒーデータを確認", group: "main" },
      { id: "profiles", label: isEn ? "Public Profile" : "公開プロフィール", hint: isEn ? "Manage your public page" : "公開ページを管理", group: "main" },
      { id: "notifications", label: isEn ? "Notifications" : "通知・配信", hint: isEn ? "Inbox and broadcasts" : "通知とお知らせ", group: "manage" },
      { id: "settings", label: isEn ? "Settings" : "設定", hint: isEn ? "Account settings" : "アカウント設定", group: "manage" },
    ]
    if (hasProAccess || hasBusinessAccess) items.splice(5, 0, { id: "business", label: isEn ? "Business" : "ビジネス", hint: isEn ? "Inquiries and commerce" : "問い合わせとEC連携", group: "main" })
    if (isAdmin) {
      items.push({ id: "admin", label: isEn ? "Administration" : "運営管理", hint: isEn ? "Requests and journal" : "申請とジャーナル", group: "manage" })
      items.push({ id: "r2_viewer", label: isEn ? "R2 Images" : "R2画像管理", hint: isEn ? "Storage inspection" : "画像ストレージを確認", group: "manage" })
    }
    return items
  }, [hasBusinessAccess, hasProAccess, isAdmin, isEn])

  useEffect(() => {
    async function refreshSharedUserProfile() {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, display_name, display_name_en, bio, bio_en, avatar_url, cover_url, role")
        .eq("id", profile.id)
        .maybeSingle()

      if (error) {
        console.error("Failed to refresh shared profile settings:", error)
        return
      }

      if (data) {
        setLiveUserProfile((current) => ({ ...current, ...data }))
        setSharedAvatarUrl(data.avatar_url ?? null)
        setSharedCoverUrl(data.cover_url ?? null)
        setUserProfileComplete(Boolean(data.username && data.display_name))
      }
    }

    void refreshSharedUserProfile()
  }, [profile.id, activeView])

  useEffect(() => {
    async function fetchLatestExpertProfile() {
      if (!hasProAccess) {
        setExpertData(null)
        setProPostingEnabled(false)
        return
      }
      try {
        const { data, error } = await supabase
          .from("experts")
          .select("*")
          .eq("user_id", profile.id)
          .maybeSingle()

        if (error) throw error
        setExpertData(data ?? null)
        setProPostingEnabled(Boolean(data?.is_profile_completed && data?.is_approved && data?.is_public))
      } catch (err) {
        console.error("Failed to fetch latest expert data in dashboard:", err)
        setProPostingEnabled(false)
      }
    }

    fetchLatestExpertProfile()
  }, [profile.id, hasProAccess, activeView])

  useEffect(() => {
    async function fetchLatestOwnerProfile() {
      if (!hasBusinessAccess) return
      try {
        const loadOwnerProfile = () => supabase
          .from("origins")
          .select("*")
          .eq("user_id", profile.id)
          .order("is_public", { ascending: false })
          .order("is_approved", { ascending: false })
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle()

        let { data, error } = await loadOwnerProfile()
        if (error) throw error

        if (!data) {
          const { data: latestApplication, error: applicationError } = await supabase
            .from("admin_notifications")
            .select("status, request_payload")
            .eq("user_id", profile.id)
            .in("type", ["claim_origin", "new_owner_profile_activation"])
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle()
          if (applicationError) throw applicationError

          const applicationPayload = latestApplication?.request_payload && typeof latestApplication.request_payload === "object"
            ? latestApplication.request_payload as Record<string, unknown>
            : null
          const applicationOriginId = Number(applicationPayload?.origin_id)
          if (
            (latestApplication?.status === "pending" || latestApplication?.status === "rejected") &&
            Number.isInteger(applicationOriginId) &&
            applicationOriginId > 0
          ) {
            const applicationOriginResult = await supabase
              .from("origins")
              .select("*")
              .eq("id", applicationOriginId)
              .maybeSingle()
            error = applicationOriginResult.error
            if (error) throw error

            const applicationLang = applicationPayload?.lang === "en" ? "en" : "ja"
            const restoredProfile: Record<string, unknown> = {
              // 見送り後は入力値だけを復元する。以前選択したorigin IDを次の新規申請へ
              // 引き継ぐと、既存店舗を新規申請の対象として誤更新してしまう。
              ...(latestApplication.status === "pending" ? (applicationOriginResult.data || {}) : {}),
              user_id: null,
              is_profile_completed: latestApplication.status === "pending",
              is_approved: false,
              is_public: false,
              links: Array.isArray(applicationPayload?.links) ? applicationPayload.links : [],
              _application_gear_ids: Array.isArray(applicationPayload?.gear_ids) ? applicationPayload.gear_ids : [],
            }
            if (applicationLang === "en") {
              restoredProfile.display_name_en = applicationPayload?.display_name ?? null
              restoredProfile.bio_en = applicationPayload?.bio ?? null
              restoredProfile.headquarters_en = applicationPayload?.headquarters ?? null
              restoredProfile.branches_en = Array.isArray(applicationPayload?.branches) ? applicationPayload.branches : []
            } else {
              restoredProfile.display_name = applicationPayload?.display_name ?? null
              restoredProfile.bio = applicationPayload?.bio ?? null
              restoredProfile.headquarters = applicationPayload?.headquarters ?? null
              restoredProfile.branches = Array.isArray(applicationPayload?.branches) ? applicationPayload.branches : []
            }
            data = restoredProfile
          }
        }

        setOwnerData(data ?? null)
        setOwnerPostingEnabled(Boolean(data?.is_profile_completed && data?.is_approved && data?.is_public))
      } catch (err) {
        console.error("Failed to fetch latest owner data in dashboard:", err)
        setOwnerPostingEnabled(false)
      }
    }

    void fetchLatestOwnerProfile()
    if (activeView !== "profiles" && activeView !== "business") return

    const handleFocus = () => { void fetchLatestOwnerProfile() }
    const handleVisibility = () => {
      if (document.visibilityState === "visible") void fetchLatestOwnerProfile()
    }
    const intervalId = window.setInterval(() => { void fetchLatestOwnerProfile() }, 15000)
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener("focus", handleFocus)
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [profile.id, hasBusinessAccess, activeView])

  // アカウント削除の問い合わせ処理
  const handleAccountDeletionRequest = async () => {
    const accountIsEn = lang === "en"
    const confirmed = await confirmPopup({
      title: accountIsEn ? "Request account deletion" : "アカウント削除の確認",
      message: accountIsEn
        ? "Are you sure you want to request permanent account deletion? Your account, posts, and stored images will be removed after approval."
        : "アカウントの完全削除を申請しますか？承認後、アカウント・投稿・保存画像が削除されます。",
      confirmLabel: accountIsEn ? "Send request" : "リクエストを送信",
      cancelLabel: accountIsEn ? "Cancel" : "キャンセル",
      danger: true,
    })
    if (!confirmed) return

    const { error } = await supabase.from("admin_notifications").insert({
      user_id: profile.id,
      type: "account_delete_request",
      admin_comment: "ユーザーよりアカウント削除要求あり",
      status: "pending"
    })

    if (!error) {
      showPopup(
        accountIsEn ? "Your request has been sent to the team." : "運営者へリクエストを送信しました。",
        "success",
        accountIsEn ? "Request sent" : "送信しました"
      )
    } else {
      console.error("Account request failed:", error)
      showPopup(
        accountIsEn ? "We couldn't send your request. Please wait a moment and try again." : "リクエストを送信できませんでした。時間をおいて、もう一度お試しください。",
        "error",
        accountIsEn ? "Request not sent" : "送信に失敗しました"
      )
    }
  }

  const handleRoleChange = async (nextRole: "user" | "pro" | "owner") => {
    if (nextRole === profile.role || roleChanging) return
    const roleLabel = nextRole === "pro" ? "PRO" : nextRole === "owner" ? "OWNER" : "USER"
    const confirmed = await confirmPopup({
      title: isEn ? `Switch to ${roleLabel}` : `${roleLabel}へ変更`,
      message: isEn
        ? "Dashboard tools will change immediately. Professional and owner publishing features remain locked until the corresponding public profile is reviewed and approved."
        : "ダッシュボードで利用できる機能が切り替わります。プロ・オーナー向けの投稿機能は、対応する公開プロフィールの審査と承認が完了するまでロックされます。",
      confirmLabel: isEn ? "Change account type" : "アカウント種別を変更",
      cancelLabel: isEn ? "Cancel" : "キャンセル",
    })
    if (!confirmed) return

    setRoleChanging(true)
    const { error } = await supabase.from("users").update({ role: nextRole }).eq("id", profile.id)
    if (error) {
      console.error("Account role change failed:", error)
      showPopup(
        isEn ? "We couldn't change the account type." : "アカウント種別を変更できませんでした。",
        "error",
        isEn ? "Change failed" : "変更に失敗しました"
      )
      setRoleChanging(false)
      return
    }
    showPopup(
      isEn ? `Your account is now ${roleLabel}.` : `アカウント種別を${roleLabel}へ変更しました。`,
      "success",
      isEn ? "Account type changed" : "変更しました"
    )
    window.setTimeout(() => window.location.reload(), 700)
  }

  const accountSettings = (
    <section className="w-full space-y-7 rounded-3xl border border-neutral-200 bg-neutral-50/60 p-5 shadow-sm sm:p-7">
      {!isAdmin && <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">{isEn ? "ACCOUNT TYPE" : "アカウント種別"}</p>
        <p className="mt-2 text-xs leading-6 text-neutral-500">{isEn ? "Choose the workspace that fits your purpose." : "利用方法に合う種別を選択してください。"}</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(["user", "pro", "owner"] as const).map((role) => {
            const selected = profile.role === role
            const title = role === "pro" ? "PRO" : role === "owner" ? "OWNER" : "USER"
            const description = isEn
              ? role === "pro" ? "Expert profile and professional publishing" : role === "owner" ? "One Origin profile and shop tools" : "Coffee records and community tools"
              : role === "pro" ? "EXPERTプロフィールと専門投稿" : role === "owner" ? "1つのORIGINプロフィールと店舗機能" : "コーヒー記録とコミュニティ機能"
            return <button key={role} type="button" disabled={roleChanging} onClick={() => void handleRoleChange(role)} className={`rounded-2xl border p-4 text-left transition disabled:opacity-50 ${selected ? "border-neutral-950 bg-neutral-950 text-white shadow-md" : "border-neutral-200 bg-white hover:border-neutral-400"}`}><span className="block text-sm font-bold">{title}</span><span className={`mt-2 block text-[10px] leading-5 ${selected ? "text-neutral-300" : "text-neutral-500"}`}>{description}</span></button>
          })}
        </div>
      </div>}
      <div className="flex flex-col justify-between gap-5 border-t border-neutral-200 pt-6 sm:flex-row sm:items-center">
        <div className="max-w-2xl space-y-2">
          <h3 className="text-sm font-bold text-neutral-900">{isEn ? "Account settings" : "アカウント設定"}</h3>
          <p className="text-xs leading-6 text-neutral-500">
            {isEn ? "Signing out keeps your profile and posts. Delete the account only when you want to permanently remove all data." : "ログアウトしてもプロフィールや投稿は保持されます。すべてのデータを完全に削除する場合のみ、アカウント削除を申請してください。"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5 sm:justify-end">
          <button type="button" onClick={handleAccountDeletionRequest} className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-700 shadow-sm transition hover:bg-rose-100">{isEn ? "Delete account" : "アカウント削除（退会）"}</button>
        </div>
      </div>
    </section>
  )

  return (
    <main className="min-h-screen bg-white pb-20 text-neutral-900">
      <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-8 sm:py-10 lg:px-12">
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{t.title}</h1>
            <p className="mt-2 text-xs text-neutral-400">{isEn ? "Manage each function from one workspace." : "利用できる機能をひとつの画面から管理できます。"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setIsRequestModalOpen(true)} className="min-h-11 rounded-xl bg-neutral-950 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-800">{isEn ? "Request to the Team" : "運営者へのリクエスト"}</button>
            <span className="flex min-h-11 items-center rounded-xl border border-neutral-200 bg-neutral-50 px-4 text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-600">{profile.role === "pro" ? "PRO" : profile.role === "owner" ? "OWNER" : profile.role === "admin" ? "ADMIN" : "USER"}</span>
          </div>
        </header>

        <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7 xl:grid-cols-[228px_minmax(0,1fr)] xl:gap-8">
          <aside className="lg:sticky lg:top-24">
            <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 lg:mx-0 lg:block lg:overflow-visible lg:rounded-3xl lg:border lg:border-neutral-200 lg:bg-neutral-50/70 lg:p-3 lg:shadow-sm">
              {(["main", "manage"] as const).map((group) => (
                <div key={group} className="contents lg:block lg:space-y-1">
                  <p className="hidden px-3 pb-2 pt-3 text-[9px] font-bold uppercase tracking-[0.22em] text-neutral-400 lg:block">{group === "main" ? (isEn ? "WORKSPACE" : "ワークスペース") : (isEn ? "MANAGEMENT" : "管理")}</p>
                  {navItems.filter((item) => item.group === group).map((item) => (
                    <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className={`group flex min-h-12 shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition lg:w-full ${activeView === item.id ? "border-neutral-950 bg-neutral-950 text-white shadow-md" : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:text-neutral-950 lg:border-transparent lg:bg-transparent lg:hover:bg-white lg:hover:shadow-sm"}`}>
                      <DashboardNavIcon name={item.id} />
                      <span className="min-w-0"><span className="block whitespace-nowrap text-[13px] font-semibold">{item.label}</span><span className={`mt-0.5 hidden truncate text-[9px] lg:block ${activeView === item.id ? "text-neutral-400" : "text-neutral-400"}`}>{item.hint}</span></span>
                    </button>
                  ))}
                </div>
              ))}
            </nav>
          </aside>

          <div className="mx-auto w-full min-w-0 max-w-5xl space-y-8">
            {showsContentLanguageSwitcher && <LanguageSwitcherTabs value={formLanguage} onChange={changeContentLanguage} currentUiLang={lang} />}

            {activeView === "home" && (
              <div className="animate-fadeIn space-y-8">
                <section className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm">
                  <div className="border-b border-neutral-200 bg-neutral-50/60 p-6 sm:p-8"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400">WORKSPACE</p><h2 className="mt-3 text-2xl font-bold">{isEn ? `Welcome, ${liveUserProfile.display_name || liveUserProfile.username}` : `${liveUserProfile.display_name || liveUserProfile.username}さん`}</h2><p className="mt-2 text-sm text-neutral-500">{isEn ? "Choose what you want to manage today." : "今日管理する機能を選択してください。"}</p></div>
                  <div className="grid gap-px bg-neutral-200 sm:grid-cols-2 xl:grid-cols-3">
                    {navItems.filter((item) => item.id !== "home" && item.id !== "r2_viewer" && item.id !== "admin").map((item) => <button key={item.id} type="button" onClick={() => setActiveView(item.id)} className="group flex min-h-32 items-start justify-between bg-white p-6 text-left transition hover:bg-neutral-50"><span><span className="flex items-center gap-3 text-sm font-bold"><DashboardNavIcon name={item.id} />{item.label}</span><span className="mt-3 block text-xs leading-5 text-neutral-400">{item.hint}</span></span><span className="text-neutral-300 transition group-hover:translate-x-1 group-hover:text-neutral-900">→</span></button>)}
                  </div>
                </section>
                <NotificationCenter lang={lang} />
              </div>
            )}

            {activeView === "create" && (
              <div className="animate-fadeIn space-y-8">
                {userPostingEnabled ? <>
                  <DashboardScopeDivider scope="user" lang={lang} />
                  <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8"><DashboardSectionHeading eyebrow="TASTING & EVENT" title={isEn ? "Create a coffee record" : "コーヒーの記録を作成"} /><CreateLogForm onLogCreated={() => setUserPostRefreshKey((key) => key + 1)} lang={lang} formLanguage={formLanguage} /></section>
                  <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8"><DashboardSectionHeading eyebrow="GEAR REVIEW" description={isEn ? "Record your experience with coffee equipment." : "コーヒー器具の使用体験を記録します。"} /><GearReviewForm lang={formLanguage} /></section>
                </> : <UserProfileGuard lang={formLanguage} />}

                {(hasProAccess || hasBusinessAccess) && (professionalPostingEnabled ? <>
                    <DashboardScopeDivider scope={isAdmin ? "expert-origin" : hasBusinessAccess ? "origin" : "expert"} lang={lang} />
                    <CreateBlogForm onBlogCreated={() => setProPostRefreshKey((key) => key + 1)} lang={formLanguage} authorType={professionalAuthorType} publishTarget={professionalPublishTarget} />
                    <PublishProRecipeForm userId={profile.id} lang={formLanguage} authorType={professionalAuthorType} publishTarget={professionalPublishTarget} onRecipeCreated={() => setProPostRefreshKey((key) => key + 1)} />
                  </> : <>
                    <DashboardScopeDivider scope={hasBusinessAccess ? "origin" : "expert"} lang={lang} />
                    <ProfileReviewGuard lang={formLanguage} accountType={profile.role === "owner" ? "owner" : "pro"} />
                  </>)}
              </div>
            )}

            {activeView === "library" && (
              <div className="animate-fadeIn space-y-8">
                <DashboardScopeDivider scope="user" lang={lang} />
                {userProfileComplete ? <section className="space-y-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8"><DashboardSectionHeading eyebrow="MY ARTICLES" title={t.articlesTitle} /><PostList key={`${formLanguage}-${userPostRefreshKey}`} userId={profile.id} lang={formLanguage} /></section> : <UserProfileGuard lang={formLanguage} />}
                {isAdmin ? <>
                  <DashboardScopeDivider scope="expert-origin" lang={lang} />
                  <ProPostList userId={profile.id} lang={formLanguage} refreshKey={proPostRefreshKey} destination="all" />
                  <div className="border-t border-neutral-200 pt-8"><PeoplePostList userId={profile.id} lang={formLanguage} editable /></div>
                  {ownerData?.id && <PeoplePostList userId={profile.id} originId={ownerData.id} targetType="origin" lang={formLanguage} editable />}
                </> : <>
                  {hasProAccess && proPostingEnabled && <><DashboardScopeDivider scope="expert" lang={lang} /><ProPostList userId={profile.id} lang={formLanguage} refreshKey={proPostRefreshKey} destination="experts" /><div className="border-t border-neutral-200 pt-8"><PeoplePostList userId={profile.id} lang={formLanguage} editable /></div></>}
                  {hasBusinessAccess && ownerPostingEnabled && <><DashboardScopeDivider scope="origin" lang={lang} /><ProPostList userId={profile.id} lang={formLanguage} refreshKey={proPostRefreshKey} destination="origins" />{ownerData?.id && <PeoplePostList userId={profile.id} originId={ownerData.id} targetType="origin" lang={formLanguage} editable />}</>}
                </>}
              </div>
            )}

            {activeView === "analytics" && (userProfileComplete ? <section className="animate-fadeIn space-y-6 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8"><DashboardSectionHeading eyebrow="ANALYTICS" title={t.analyticsTitle} /><div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-6"><CoffeeAnalyticsCharts userId={profile.id} lang={formLanguage} /></div></section> : <UserProfileGuard lang={formLanguage} />)}

            {activeView === "profiles" && (
              <div className="animate-fadeIn space-y-10">
                <DashboardScopeDivider scope="user" lang={lang} />
                <section className="flex flex-col items-center gap-8 rounded-3xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8"><AvatarUpload userId={profile.id} initialAvatarUrl={sharedAvatarUrl} username={liveUserProfile.username} displayName={formLanguage === "en" ? (liveUserProfile.display_name_en || liveUserProfile.display_name) : liveUserProfile.display_name} label={t.uploadLabel} lang={formLanguage} onAvatarChanged={setSharedAvatarUrl} /><ProfileForm userId={profile.id} initialUsername={liveUserProfile.username} initialDisplayName={liveUserProfile.display_name} initialDisplayNameEn={liveUserProfile.display_name_en} initialBio={liveUserProfile.bio} initialBioEn={liveUserProfile.bio_en} lang={formLanguage} onProfileCompleteChange={setUserProfileComplete} /></section>
                {hasProAccess && <div className="space-y-5"><DashboardScopeDivider scope="expert" lang={formLanguage} /><ProProfileForm userId={profile.id} initialUsername={liveUserProfile.username} initialDisplayName={expertData ? (expertData.pending_display_name ?? expertData.display_name ?? null) : null} initialDisplayNameEn={expertData ? (expertData.pending_display_name_en ?? expertData.display_name_en ?? null) : null} initialBio={expertData ? expertData.bio_expert : liveUserProfile.bio} initialBioEn={expertData?.bio_expert_en ?? null} initialAvatarUrl={sharedAvatarUrl} initialCoverUrl={sharedCoverUrl} initialCurrentStore={expertData?.current_store ?? null} initialCurrentStoreEn={expertData?.current_store_en ?? null} initialPastStores={expertData?.past_stores ?? null} initialPastStoresEn={expertData?.past_stores_en ?? null} initialAwards={expertData?.awards ?? null} initialAwardsEn={expertData?.awards_en ?? null} initialPrimarySpecialty={expertData?.primary_specialty ?? null} initialPrimarySpecialtyEn={expertData?.primary_specialty_en ?? null} initialSubSpecialties={expertData?.sub_specialties ?? null} initialSubSpecialtiesEn={expertData?.sub_specialties_en ?? null} initialIsApproved={expertData?.is_approved ?? false} initialIsProfileCompleted={expertData?.is_profile_completed ?? false} initialIsPublic={expertData?.is_public ?? false} onAccessStatusChange={setProPostingEnabled} lang={formLanguage} /></div>}
                {hasBusinessAccess && <div className="space-y-5"><DashboardScopeDivider scope="origin" lang={formLanguage} /><OwnerProfileForm userId={profile.id} initialOriginId={ownerData?.id ?? null} initialSlug={ownerData?.slug ?? null} initialUsername={liveUserProfile.username} initialDisplayName={ownerData?.pending_display_name ?? ownerData?.display_name ?? null} initialDisplayNameEn={ownerData?.pending_display_name_en ?? ownerData?.display_name_en ?? null} initialBio={ownerData?.bio ?? null} initialBioEn={ownerData?.bio_en ?? null} initialAvatarUrl={sharedAvatarUrl} initialCoverUrl={sharedCoverUrl} initialHeadquarters={ownerData?.headquarters ?? null} initialHeadquartersEn={ownerData?.headquarters_en ?? null} initialBranches={ownerData?.branches ?? []} initialBranchesEn={ownerData?.branches_en ?? []} initialLinks={ownerData?.links ?? []} initialGearIds={ownerData?._application_gear_ids ?? []} initialIsApproved={ownerData?.is_approved ?? false} initialIsProfileCompleted={ownerData?.is_profile_completed ?? false} initialIsPublic={ownerData?.is_public ?? false} onAccessStatusChange={setOwnerPostingEnabled} lang={formLanguage} /></div>}
              </div>
            )}

            {activeView === "business" && (hasProAccess || hasBusinessAccess) && (
              <div className="animate-fadeIn space-y-8">
                {proPostingEnabled && <ServiceMarketplacePanel providerUserId={profile.id} providerType="expert" lang={lang} mode="manager" />}
                {ownerPostingEnabled && ownerData?.id && <ServiceMarketplacePanel providerUserId={profile.id} providerType="origin" originId={ownerData.id} lang={lang} mode="manager" />}
                {hasProAccess && (proPostingEnabled ? <B2BInquiryPanel currentUserId={profile.id} lang={lang} mode="sent" /> : <ProfileReviewGuard lang={lang} accountType="pro" />)}
                {hasBusinessAccess && (ownerPostingEnabled ? <>{ownerData?.id && <B2BInquiryPanel originId={ownerData.id} ownerId={profile.id} currentUserId={profile.id} lang={lang} mode="inbox" />}<ShopProductsSection userId={userId} lang={lang} /></> : <ProfileReviewGuard lang={lang} accountType="owner" />)}
              </div>
            )}

            {activeView === "notifications" && <div className="animate-fadeIn space-y-8"><NotificationCenter lang={lang} />{hasProAccess && proPostingEnabled && <BroadcastNotificationForm userId={profile.id} authorType="pro" lang={formLanguage} onNotificationCreated={() => setProPostRefreshKey((key) => key + 1)} />}{hasBusinessAccess && ownerPostingEnabled && <BroadcastNotificationForm userId={profile.id} authorType="owner" lang={formLanguage} originSlug={ownerData?.slug ?? null} />}</div>}
            {activeView === "settings" && <div className="animate-fadeIn">{accountSettings}</div>}
            {activeView === "admin" && isAdmin && <div className="animate-fadeIn space-y-8"><AdminNotificationManager lang={lang} /><AdminJournalManager authorId={profile.id} lang={formLanguage} /><AdminTranslationManager lang={lang} /></div>}
            {activeView === "r2_viewer" && isAdmin && <div className="animate-fadeIn"><R2ImageViewer isEn={isEn} /></div>}
          </div>
        </div>
      </div>
      <AdminRequestModal userId={profile.id} lang={lang} isOpen={isRequestModalOpen} onClose={() => setIsRequestModalOpen(false)} />
    </main>
  )
}
