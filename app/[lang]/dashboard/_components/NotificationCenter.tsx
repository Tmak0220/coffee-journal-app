"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type MyRequest = {
  id: string
  user_id: string
  type: string
  requested_display_name: string | null
  requested_display_name_en: string | null
  status: "pending" | "approved" | "rejected"
  admin_comment: string | null
  created_at: string
}

type Props = {
  lang?: "ja" | "en"
}

type SiteNotice = {
  id: string
  title: string
  content: string
  category: string
  created_at: string
}

type RequestCategory = "all" | "operator" | "registration" | "profile"

const PROFILE_REQUEST_TYPES = new Set([
  "claim_origin",
  "display_name_change",
  "owner_display_name_change",
  "expert_display_name_change",
  "new_profile_activation",
  "new_owner_profile_activation",
])

const getRequestCategory = (type: string): Exclude<RequestCategory, "all"> => {
  if (type === "master_request") return "registration"
  if (PROFILE_REQUEST_TYPES.has(type)) return "profile"
  return "operator"
}

// 💡 各システム用語・申請タイプをユーザー向けに分かりやすく翻訳する辞書
const dict = {
  ja: {
    loading: "申請履歴を読み込み中...",
    title: "MY REQUESTS",
    descTitle: "送信した各種リクエストの進捗状況（完了した申請は1週間後に自動で整理されます）",
    emptyMessage: "送信済みのリクエストはありません",
    siteNotices: "運営からのお知らせ",
    siteNoticesDescription: "最新のお知らせ",
    noSiteNotices: "現在お知らせはありません",
    openJournal: "JOURNALを開く",
    adminComment: "管理者からのメッセージ",
    labelRequestedName: "申請名(日)",
    labelRequestedNameEn: "申請名(英)",
    labelRequestedContent: "リクエスト内容",
    locale: "ja-JP",
    categories: { all: "すべて", operator: "運営者へのリクエスト", registration: "登録リクエスト", profile: "プロフィール申請" },
    status: {
      pending: "確認中",
      approved: "承認済み",
      rejected: "見送り"
    },
    types: {
      master_request: "データ追加申請",
      claim_origin: "店舗・ブランド紐付け申請",
      display_name_change: "オーナープロフィール審査申請",
      owner_display_name_change: "オーナープロフィール表示名変更申請",
      expert_display_name_change: "プロプロフィール表示名変更申請",
      new_profile_activation: "プロプロフィール初回利用申請",
      new_owner_profile_activation: "オーナープロフィール利用申請",
      feature_request: "機能追加のリクエスト",
      data_correction: "データ修正依頼",
      other_inquiry: "その他のお問い合わせ",
      account_delete_request: "アカウント削除リクエスト",
      content_warning: "投稿に関する運営からの警告"
    }
  },
  en: {
    loading: "Loading requests...",
    title: "MY REQUESTS",
    descTitle: "Status of requests (Completed items will be archived after 1 week)",
    emptyMessage: "No requests submitted.",
    siteNotices: "Updates from the Team",
    siteNoticesDescription: "Latest announcements",
    noSiteNotices: "No announcements at this time.",
    openJournal: "Open JOURNAL",
    adminComment: "Message from Admin",
    labelRequestedName: "Requested Name (JA)",
    labelRequestedNameEn: "Requested Name (EN)",
    labelRequestedContent: "Request Content",
    locale: "en-US",
    categories: { all: "All", operator: "Requests to the team", registration: "Registration requests", profile: "Profile applications" },
    status: {
      pending: "Pending",
      approved: "Approved",
      rejected: "Declined"
    },
    types: {
      master_request: "Data Addition Request",
      claim_origin: "Claim Store & Brand Request",
      display_name_change: "Owner Profile Review Request",
      owner_display_name_change: "Owner Display Name Change Request",
      expert_display_name_change: "Professional Display Name Change Request",
      new_profile_activation: "Professional Profile Application",
      new_owner_profile_activation: "Owner Profile Application",
      feature_request: "Feature Request",
      data_correction: "Data Correction",
      other_inquiry: "Other Inquiry",
      account_delete_request: "Account Deletion Request",
      content_warning: "Post Warning from the Team"
    }
  }
}

export default function NotificationCenter({ lang = "ja" }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = dict[currentLang]

  const [requests, setRequests] = useState<MyRequest[]>([])
  const [siteNotices, setSiteNotices] = useState<SiteNotice[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<RequestCategory>("all")

  const fetchMyRequests = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setLoading(false)
      return
    }

    const [{ data, error }, { data: journalData, error: journalError }] = await Promise.all([
      supabase
        .from("admin_notifications")
        .select("id, user_id, type, requested_display_name, requested_display_name_en, status, admin_comment, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("admin_journals")
        .select("id, title, content, category, created_at")
        .eq("is_published", true)
        .eq("lang", currentLang)
        .order("created_at", { ascending: false }),
    ])

    if (!error && data) {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const visibleRequests = data.filter((req) => {
        if (req.status === "pending") return true
        const createdAt = new Date(req.created_at)
        return createdAt > oneWeekAgo
      })

      setRequests(visibleRequests)
    } else if (error) {
      console.error("【Fetch Error】:", error)
    }
    if (!journalError) {
      setSiteNotices((journalData as SiteNotice[]) || [])
    } else {
      console.error("【Journal Notification Fetch Error】:", journalError)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchMyRequests()
  }, [currentLang])

  if (loading) {
    return (
      <div aria-busy="true" className="mx-auto w-full max-w-5xl animate-pulse rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="h-6 w-40 rounded bg-neutral-100" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-neutral-100 p-5">
              <div className="h-4 w-1/2 rounded bg-neutral-100" />
              <div className="mt-4 h-3 w-full rounded bg-neutral-100" />
              <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  // バッジスタイル
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50/70 text-amber-800 border-amber-200/60"
      case "approved": return "bg-emerald-50/70 text-emerald-800 border-emerald-200/60"
      case "rejected": return "bg-rose-50/70 text-rose-800 border-rose-200/60"
      default: return "bg-neutral-50 text-neutral-600 border-neutral-200/60"
    }
  }

  // 翻訳ヘルパー
  const translateType = (type: string) => t.types[type as keyof typeof t.types] || type
  const translateStatus = (status: string) => t.status[status as keyof typeof t.status] || status
  const filteredRequests = activeCategory === "all"
    ? requests
    : requests.filter((request) => getRequestCategory(request.type) === activeCategory)
  const categories: RequestCategory[] = ["all", "operator", "registration", "profile"]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm animate-fadeIn sm:p-8">
      <section className="rounded-[24px] border border-sky-100 bg-gradient-to-br from-sky-50/65 via-white to-amber-50/30 p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b border-neutral-200/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-[14px] font-bold tracking-wider text-neutral-900">{t.siteNotices}</h2>
            <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">{t.siteNoticesDescription}</p>
          </div>
          <a href={`/${currentLang}/journal`} className="text-[10px] font-semibold tracking-wider text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-900">
            {t.openJournal}
          </a>
        </div>
        {siteNotices.length === 0 ? (
          <p className="py-8 text-center text-xs text-neutral-400">{t.noSiteNotices}</p>
        ) : (
          <div className="mt-4 max-h-[420px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {siteNotices.map((notice) => (
              <article key={notice.id} className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-neutral-900 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">{notice.category}</span>
                  <time className="font-mono text-[10px] text-neutral-400">
                    {new Date(notice.created_at).toLocaleString(currentLang === "en" ? "en-US" : "ja-JP")}
                  </time>
                </div>
                <h3 className="mt-3 text-sm font-bold leading-6 text-neutral-900">{notice.title}</h3>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-neutral-600">{notice.content}</p>
              </article>
            ))}
          </div>
        )}
      </section>
      
      {/* ヘッダーエリア */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 border-b border-neutral-100 pb-6">
        <div className="text-left">
          <h2 className="text-[15px] font-bold tracking-wider text-neutral-900 uppercase select-none">
            {t.title}
          </h2>
          <p className="text-[11px] font-normal tracking-wide text-neutral-400 mt-1.5 leading-relaxed">
            {t.descTitle}
          </p>
        </div>
      </div>

      <div className="flex w-full gap-2 overflow-x-auto pb-1">
        {categories.map((category) => {
          const count = category === "all"
            ? requests.length
            : requests.filter((request) => getRequestCategory(request.type) === category).length
          return (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-[11px] font-semibold tracking-wide transition ${
                activeCategory === category
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
              }`}
            >
              {t.categories[category]} <span className="ml-1 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* 申請履歴リスト */}
      <div className="w-full">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-[14px] font-medium text-neutral-400/80">{t.emptyMessage}</p>
          </div>
        ) : (
          <div className="space-y-5 max-h-[660px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredRequests.map((req) => {
              const isMasterReq = req.type === "master_request"

              return (
                <div
                  key={req.id}
                  className={`p-6 rounded-[24px] border transition-all duration-300 ${
                    req.status !== "pending"
                      ? "bg-neutral-50/40 border-neutral-200/60"
                      : "bg-white border-neutral-200/80 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col gap-4.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-3 text-left">
                        {/* メタ情報タグ */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold tracking-wider border ${getStatusBadgeStyle(req.status)}`}>
                            {translateStatus(req.status)}
                          </span>
                          <span className="text-[10px] bg-neutral-100/80 text-neutral-500 px-2 py-0.5 rounded-lg border border-neutral-200/40 font-medium tracking-wide">
                            {translateType(req.type)}
                          </span>
                          <span className="text-[11px] text-neutral-400 font-medium tracking-wide">
                            {new Date(req.created_at).toLocaleString(currentLang === "en" ? "en-US" : "ja-JP", {
                              year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* 申請表示エリア */}
                        <div className="space-y-1">
                          <h4 className="text-[15px] font-bold tracking-wide text-neutral-800 flex items-baseline gap-1.5 flex-wrap">
                            <span className="text-xs text-neutral-400 font-medium">
                              {isMasterReq ? t.labelRequestedContent : t.labelRequestedName}:
                            </span> 
                            <span className="text-neutral-900 font-bold">
                              {req.requested_display_name || "（内容なし / None）"}
                            </span>
                          </h4>
                          
                          {!isMasterReq && req.requested_display_name_en && (
                            <h4 className="text-[14px] font-bold tracking-wide text-neutral-800 flex items-baseline gap-1.5 flex-wrap">
                              <span className="text-xs text-neutral-400 font-medium">
                                {t.labelRequestedNameEn}:
                              </span> 
                              <span className="text-neutral-900 font-bold">{req.requested_display_name_en}</span>
                            </h4>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 管理者メッセージ */}
                    {req.admin_comment && (
                      <div className="w-full text-left pt-4 border-t border-neutral-100 text-[13px] bg-neutral-50/60 p-4 rounded-2xl border border-neutral-200/40">
                        <span className="font-bold text-[10px] text-neutral-400/90 uppercase tracking-widest block mb-1.5 select-none">
                          {t.adminComment}
                        </span>
                        <p className="text-neutral-600 font-normal leading-relaxed whitespace-pre-wrap">
                          {req.admin_comment}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
