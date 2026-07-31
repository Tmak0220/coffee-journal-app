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
import AdminNotificationManager from "./AdminNotificationManager" 
import LanguageSwitcherTabs from "./LanguageSwitcherTabs" 
import PublishProRecipeForm from "./PublishProRecipeForm"
import ShopProductsSection from "./ShopProductsSection"
import BroadcastNotificationForm from "./BroadcastNotificationForm"
import PeoplePostList from "components/PeoplePostList"
import B2BInquiryPanel from "@/components/B2BInquiryPanel"
import ProPostList from "./ProPostList"
import { useAppPopup } from "@/context/AppPopupContext"

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
  role: "user" | "barista" | "owner" | "admin"
  membership_tier: "free" | "standard" | "pro" | "business"
  current_store?: string | null
  past_stores?: string[] | null
  awards?: string | null
  categories?: string[] | null
}

type DashboardTab = "personal" | "pro_profile" | "shop_manage" | "curator" | "r2_viewer"

type Props = {
  profile: UserProfile
  userId: string
  logs: any[]
  enabledTools: ToolType[]                
  onToggleTool: (tool: ToolType) => void 
  initialTab: DashboardTab
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
    ? (lang === "en" ? "professional" : "プロ会員")
    : (lang === "en" ? "owner" : "オーナー会員")

  return (
    <div className="rounded-3xl border border-neutral-200 bg-neutral-50/70 px-6 py-10 text-center shadow-sm">
      <p className="text-[11px] font-semibold tracking-[0.16em] text-neutral-400 uppercase mb-3">
        {lang === "en" ? "PROFILE REVIEW REQUIRED" : "プロフィール審査が必要です"}
      </p>
      <p className="text-sm leading-relaxed text-neutral-600">
        {lang === "en"
          ? `Posting features will become available after your ${label} profile is approved and published.`
          : `${label}プロフィールの審査が完了し、公開された後に投稿フォームと各機能をご利用いただけます。`}
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
  initialTab,
  t,
  lang
}: Props) {
  const { showPopup, confirmPopup } = useAppPopup()
  const [activeTab, setActiveTab] = useState<DashboardTab>(initialTab)
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

  const isAdmin = profile.role === "admin"
  const isPremium = profile.membership_tier !== "free" || isAdmin
  const hasProAccess = profile.membership_tier === "pro" || profile.membership_tier === "business" || isAdmin
  const hasBusinessAccess = (profile.role === "owner" || isAdmin) && profile.membership_tier === "business"

  const isEn = lang === "en"

  useEffect(() => {
    async function refreshSharedUserProfile() {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, display_name, display_name_en, bio, bio_en, avatar_url, cover_url, role, membership_tier")
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
      }
    }

    void refreshSharedUserProfile()
  }, [profile.id, activeTab, formLanguage])

  useEffect(() => {
    async function fetchLatestExpertProfile() {
      if (!hasProAccess) return
      try {
        const { data, error } = await supabase
          .from("experts")
          .select("*")
          .eq("user_id", profile.id)
          .maybeSingle()

        if (error) throw error
        if (data) {
          setExpertData(data)
          setProPostingEnabled(Boolean(data.is_profile_completed && data.is_approved && data.is_public))
        }
      } catch (err) {
        console.error("Failed to fetch latest expert data in dashboard:", err)
      }
    }

    fetchLatestExpertProfile()
  }, [profile.id, hasProAccess, activeTab])

  useEffect(() => {
    async function fetchLatestOwnerProfile() {
      if (!hasBusinessAccess) return
      try {
        // 過去バージョンで残った却下済み申請の仮紐付けを先に整理し、
        // 承認済みなのに紐付けが欠けた場合も同じAPIで修復する。
        await fetch("/api/repair-owner-profile-link", { method: "POST" })

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
    if (activeTab !== "shop_manage") return

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
  }, [profile.id, hasBusinessAccess, activeTab])

  // アカウント停止・削除の問い合わせ処理
  const handleAccountAction = async (actionType: "suspend" | "delete") => {
    const accountIsEn = formLanguage === "en"
    const isDelete = actionType === "delete"
    const confirmMsg = isDelete
      ? (accountIsEn ? "Are you sure you want to request account deletion?" : "アカウントの削除（退会）リクエストを送信しますか？")
      : (accountIsEn ? "Are you sure you want to request account suspension?" : "アカウントの一時停止リクエストを送信しますか？")

    const confirmed = await confirmPopup({
      title: isDelete
        ? (accountIsEn ? "Request account deletion" : "アカウント削除の確認")
        : (accountIsEn ? "Request account suspension" : "アカウント一時停止の確認"),
      message: confirmMsg,
      confirmLabel: accountIsEn ? "Send request" : "リクエストを送信",
      cancelLabel: accountIsEn ? "Cancel" : "キャンセル",
      danger: isDelete,
    })
    if (!confirmed) return

    const { error } = await supabase.from("admin_notifications").insert({
      user_id: profile.id,
      type: isDelete ? "account_delete_request" : "account_suspend_request",
      admin_comment: isDelete ? "ユーザーよりアカウント削除要求あり" : "ユーザーよりアカウント一時停止要求あり",
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

  return (
    <main className="min-h-screen bg-white pb-16 text-neutral-900 sm:pb-24">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
        
        <header className="mb-7 flex flex-col justify-between gap-5 border-b border-neutral-200 pb-6 sm:mb-10 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">{t.title}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setIsRequestModalOpen(true)}
              className="min-h-11 rounded-xl border border-neutral-900 bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md focus-visible:ring-4 focus-visible:ring-neutral-200 select-none"
            >
              <span>{isEn ? "Request to the Team" : "運営者へのリクエスト"}</span>
            </button>
            <span className="flex min-h-11 w-fit items-center rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-700 shadow-sm select-none">
              Plan: {profile.membership_tier}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-8">
          
          <nav className="flex w-full gap-2 overflow-x-auto rounded-2xl border border-neutral-200 bg-neutral-50/70 p-2 shadow-sm lg:sticky lg:top-28 lg:flex-col lg:gap-1 lg:overflow-visible lg:p-3">
            <p className="hidden px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 select-none lg:block">{t.menu}</p>
            
            <button
              type="button"
              onClick={() => setActiveTab("personal")}
              className={`flex min-h-12 shrink-0 items-center rounded-xl px-4 py-3 text-left text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] lg:w-full ${
                activeTab === "personal" ? "bg-neutral-950 text-white shadow-md" : "border border-transparent bg-white/60 text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
              }`}
            >
              <span>{isEn ? "USER" : "ユーザー"}</span>
            </button>

            {hasProAccess && (
              <button
                type="button"
                onClick={() => setActiveTab("pro_profile")}
                className={`flex min-h-12 shrink-0 items-center rounded-xl px-4 py-3 text-left text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] lg:w-full ${
                  activeTab === "pro_profile" ? "bg-neutral-950 text-white shadow-md" : "border border-transparent bg-white/60 text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
                }`}
              >
                <span>{isEn ? "PRO" : "プロ"}</span>
              </button>
            )}

            {hasBusinessAccess && (
              <button
                type="button"
                onClick={() => setActiveTab("shop_manage")}
                className={`flex min-h-12 shrink-0 items-center rounded-xl px-4 py-3 text-left text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] lg:w-full ${
                  activeTab === "shop_manage" ? "bg-neutral-950 text-white shadow-md" : "border border-transparent bg-white/60 text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
                }`}
              >
                <span>{isEn ? "OWNER" : "オーナー"}</span>
              </button>
            )}

            {isAdmin && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveTab("curator")}
                  className={`flex min-h-12 shrink-0 items-center rounded-xl px-4 py-3 text-left text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] lg:w-full ${
                    activeTab === "curator" ? "bg-neutral-950 text-white shadow-md" : "border border-transparent bg-white/60 text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
                  }`}
                >
                  <span>{isEn ? "ADMINISTRATOR" : "アドミニストレーター"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("r2_viewer")}
                  className={`flex min-h-12 shrink-0 items-center rounded-xl px-4 py-3 text-left text-sm font-semibold tracking-wide transition-all duration-200 active:scale-[0.98] lg:w-full ${
                    activeTab === "r2_viewer" ? "bg-neutral-950 text-white shadow-md" : "border border-transparent bg-white/60 text-neutral-600 hover:border-neutral-200 hover:bg-white hover:text-neutral-950 hover:shadow-sm"
                  }`}
                >
                  <span>{isEn ? "R2 IMAGE VIEWER" : "R2画像チェッカー"}</span>
                </button>
              </>
            )}
          </nav>

          <div className="w-full min-w-0 max-w-5xl space-y-8">
            
            <div className="w-full">
              <LanguageSwitcherTabs value={formLanguage} onChange={setFormLanguage} currentUiLang={lang} />
            </div>

            {activeTab === "r2_viewer" && isAdmin && (
              <div className="animate-fadeIn w-full"><R2ImageViewer isEn={isEn} /></div>
            )}

            {activeTab === "curator" && isAdmin && (
              <div className="space-y-8 animate-fadeIn w-full">
                <AdminNotificationManager lang={formLanguage} />
                <AdminJournalManager authorId={profile.id} lang={formLanguage} />
              </div>
            )}

            {activeTab === "personal" && (
              <div className="w-full space-y-10 animate-fadeIn">
                <div className="flex w-full flex-col items-center gap-8 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:gap-10 sm:p-8">
                  <div className="w-full flex flex-col items-center">
                    <AvatarUpload
                      userId={profile.id}
                      initialAvatarUrl={sharedAvatarUrl}
                      username={liveUserProfile.username}
                      displayName={formLanguage === "en"
                        ? (liveUserProfile.display_name_en || liveUserProfile.display_name)
                        : liveUserProfile.display_name}
                      label={t.uploadLabel}
                      lang={formLanguage}
                      onAvatarChanged={setSharedAvatarUrl}
                    />
                  </div>
                  <div className="w-full">
                    <ProfileForm
                      userId={profile.id}
                      initialUsername={liveUserProfile.username}
                      initialDisplayName={liveUserProfile.display_name}
                      initialDisplayNameEn={liveUserProfile.display_name_en}
                      initialBio={liveUserProfile.bio}
                      initialBioEn={liveUserProfile.bio_en}
                      lang={formLanguage}
                      onProfileCompleteChange={setUserProfileComplete}
                    />
                  </div>
                </div>

                <NotificationCenter lang={formLanguage} />

                {userProfileComplete ? (
                  <>
                {/* ☕️ コーヒーレシピ・ドリップログ作成 */}
                <section className="w-full space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8">
                  <DashboardSectionHeading eyebrow="ANALYTICS & RECIPE" title={t.analyticsTitle} />
                  {isPremium && (
                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-6">
                      <CoffeeAnalyticsCharts userId={profile.id} lang={formLanguage} />
                    </div>
                  )}
                  <div className="w-full">
                    <CreateLogForm
                      onLogCreated={() => setUserPostRefreshKey((key) => key + 1)}
                      lang={formLanguage}
                    />
                  </div>
                </section>

                {/* ⚙️ 器具レビュー投稿フォーム */}
                <section className="w-full space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8">
                  <DashboardSectionHeading
                    eyebrow="GEAR REVIEW"
                    description={formLanguage === "en" ? "Record your experience with coffee equipment." : "コーヒー器具の使用体験を記録します。"}
                  />
                  <div className="w-full">
                    <GearReviewForm lang={formLanguage} />
                  </div>
                </section>

                {/* 📄 記事・投稿一覧 */}
                <section className="w-full space-y-6 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-8">
                  <DashboardSectionHeading eyebrow="MY ARTICLES" title={t.articlesTitle} />
                  <PostList
                    key={`${formLanguage}-${userPostRefreshKey}`}
                    userId={profile.id}
                    lang={formLanguage}
                  />
                </section>
                  </>
                ) : (
                  <UserProfileGuard lang={formLanguage} />
                )}

                {/* ⚠️ アカウント設定・サポート（デザイン刷新版） */}
                <section className="w-full rounded-2xl border border-neutral-200 bg-neutral-50/60 p-5 shadow-sm sm:p-7">
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <h4 className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase select-none">
                          {formLanguage === "en" ? "ACCOUNT SETTINGS & SUPPORT" : "アカウント設定・サポート"}
                        </h4>
                        <p className="text-xs text-neutral-500 leading-relaxed">
                          {formLanguage === "en"
                            ? "Manage your account status or send requests for data deletion." 
                            : "アカウントの利用休止や、データの完全削除（退会）のリクエストをお送りいただけます。"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0 pt-1 sm:pt-0">
                        <button
                          type="button"
                          onClick={() => handleAccountAction("suspend")}
                          className="text-xs font-semibold px-4 py-2 rounded-xl bg-white border border-neutral-200 hover:border-neutral-300 text-neutral-700 hover:text-neutral-900 transition-all shadow-sm active:scale-95 select-none"
                        >
                          {formLanguage === "en" ? "Suspend Account" : "アカウント一時停止"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAccountAction("delete")}
                          className="text-xs font-semibold px-4 py-2 rounded-xl bg-rose-50/80 border border-rose-200/60 hover:bg-rose-100/80 text-rose-700 transition-all shadow-sm active:scale-95 select-none"
                        >
                          {formLanguage === "en" ? "Delete Account" : "アカウント削除 (退会)"}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

              </div>
            )}

            {activeTab === "pro_profile" && hasProAccess && (
              <div className="space-y-10 animate-fadeIn w-full">
                <div className="w-full">
                  <ProProfileForm 
                    userId={profile.id} 
                    initialUsername={liveUserProfile.username}
                    initialDisplayName={expertData ? (expertData.pending_display_name ?? expertData.display_name ?? null) : null}
                    initialDisplayNameEn={expertData ? (expertData.pending_display_name_en ?? expertData.display_name_en ?? null) : null}
                    initialBio={expertData ? expertData.bio_expert : liveUserProfile.bio}
                    initialBioEn={expertData ? expertData.bio_expert_en : null}
                    initialAvatarUrl={sharedAvatarUrl}
                    initialCoverUrl={sharedCoverUrl}
                    initialCurrentStore={expertData ? expertData.current_store : null}
                    initialCurrentStoreEn={expertData ? expertData.current_store_en : null}
                    initialPastStores={expertData ? expertData.past_stores : null}
                    initialPastStoresEn={expertData ? expertData.past_stores_en : null}
                    initialAwards={expertData ? expertData.awards : null}
                    initialAwardsEn={expertData ? expertData.awards_en : null}
                    initialPrimarySpecialty={expertData ? expertData.primary_specialty : null}
                    initialPrimarySpecialtyEn={expertData ? expertData.primary_specialty_en : null}
                    initialSubSpecialties={expertData ? expertData.sub_specialties : null}
                    initialSubSpecialtiesEn={expertData ? expertData.sub_specialties_en : null}
                    initialIsApproved={expertData ? expertData.is_approved : false}
                    initialIsProfileCompleted={expertData ? expertData.is_profile_completed : false}
                    initialIsPublic={expertData ? expertData.is_public : false}
                    onAccessStatusChange={setProPostingEnabled}
                    lang={formLanguage} 
                  />
                </div>

                {proPostingEnabled ? (
                  <>
                <B2BInquiryPanel
                  currentUserId={profile.id}
                  currentUserTier={profile.membership_tier}
                  lang={formLanguage}
                  mode="sent"
                />

                <BroadcastNotificationForm 
                  userId={profile.id} 
                  authorType="pro" 
                  membership_tier={profile.membership_tier}
                  lang={formLanguage} 
                  onNotificationCreated={() => setProPostRefreshKey((key) => key + 1)}
                />

                <CreateBlogForm 
                  onBlogCreated={() => setProPostRefreshKey((key) => key + 1)}
                  lang={formLanguage} 
                  authorType="pro" 
                  membership_tier={profile.membership_tier} 
                />

                <div className="w-full">
                  <PublishProRecipeForm 
                    userId={profile.id} 
                    membership_tier={profile.membership_tier}
                    lang={formLanguage} 
                    onRecipeCreated={() => setProPostRefreshKey((key) => key + 1)}
                  />
                </div>

                <ProPostList userId={profile.id} lang={formLanguage} refreshKey={proPostRefreshKey} destination="experts" />

                <div className="border-t border-neutral-200 pt-10 w-full">
                  <PeoplePostList userId={profile.id} lang={formLanguage} editable={true} />
                </div>
                  </>
                ) : (
                  <ProfileReviewGuard lang={formLanguage} accountType="pro" />
                )}
              </div>
            )}

            {activeTab === "shop_manage" && hasBusinessAccess && (
              <div className="space-y-8 animate-fadeIn w-full">
                <div className="w-full">
                  <OwnerProfileForm
                    userId={profile.id}
                    initialOriginId={ownerData?.id ?? null}
                    initialSlug={ownerData?.slug ?? null}
                    initialUsername={liveUserProfile.username}
                    initialDisplayName={ownerData?.pending_display_name ?? ownerData?.display_name ?? null}
                    initialDisplayNameEn={ownerData?.pending_display_name_en ?? ownerData?.display_name_en ?? null}
                    initialBio={ownerData?.bio ?? null}
                    initialBioEn={ownerData?.bio_en ?? null}
                    initialAvatarUrl={sharedAvatarUrl}
                    initialCoverUrl={sharedCoverUrl}
                    initialHeadquarters={ownerData?.headquarters ?? null}
                    initialHeadquartersEn={ownerData?.headquarters_en ?? null}
                    initialBranches={ownerData?.branches ?? []}
                    initialBranchesEn={ownerData?.branches_en ?? []}
                    initialLinks={ownerData?.links ?? []}
                    initialGearIds={ownerData?._application_gear_ids ?? []}
                    initialIsApproved={ownerData?.is_approved ?? false}
                    initialIsProfileCompleted={ownerData?.is_profile_completed ?? false}
                    initialIsPublic={ownerData?.is_public ?? false}
                    onAccessStatusChange={setOwnerPostingEnabled}
                    lang={formLanguage}
                  />
                </div>

                {ownerPostingEnabled ? (
                  <>
                {ownerData?.id && (
                  <B2BInquiryPanel
                    originId={ownerData.id}
                    ownerId={profile.id}
                    currentUserId={profile.id}
                    currentUserTier={profile.membership_tier}
                    lang={formLanguage}
                    mode="inbox"
                  />
                )}

                <BroadcastNotificationForm 
                  userId={profile.id} 
                  authorType="owner" 
                  membership_tier={profile.membership_tier}
                  lang={formLanguage} 
                  originSlug={ownerData?.slug ?? null}
                />

                <ShopProductsSection userId={userId} lang={formLanguage} />

                <ProPostList
                  userId={profile.id}
                  lang={formLanguage}
                  refreshKey={proPostRefreshKey}
                  destination="origins"
                />

                {ownerData?.id && (
                  <PeoplePostList
                    userId={profile.id}
                    originId={ownerData.id}
                    targetType="origin"
                    lang={formLanguage}
                    editable
                  />
                )}
                  </>
                ) : (
                  <ProfileReviewGuard lang={formLanguage} accountType="owner" />
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      <AdminRequestModal
        userId={profile.id}
        lang={formLanguage}
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
      />
    </main>
  )
}
