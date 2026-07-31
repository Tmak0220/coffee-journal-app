"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAppPopup } from "@/context/AppPopupContext"

type AdminIncomingRequest = {
  id: string
  user_id: string
  type: string
  target_origin_id: number | string | null
  requested_display_name: string | null
  requested_display_name_en: string | null
  request_payload: Record<string, unknown> | null
  status: "pending" | "approved" | "rejected"
  admin_comment: string | null
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

const ADMIN_DICT = {
  ja: {
    loading: "リクエストを読み込み中...",
    description: "プロ会員申請・登録リクエスト一覧（完了した申請は1週間後に自動で整理されます）",
    pendingCount: "未処理",
    empty: "届いているリクエストはありません。",
    senderId: "送信者ID",
    username: "ユーザーネーム",
    originId: "対象店舗ID",
    requestedContent: "申請内容",
    requestedNameEn: "希望名（英）",
    profileDetails: "申請時のプロフィール情報",
    noContent: "（内容なし）",
    approve: "承認",
    reject: "見送り",
    commentLabel: "ユーザーへのメッセージ・理由（任意）",
    commentPlaceholder: "例：リクエストありがとうございます。マスターデータを追加しました。",
    errorMessage: "処理を完了できませんでした。内容を確認して、もう一度お試しください。",
    errorTitle: "更新に失敗しました",
    categories: { all: "すべて", operator: "運営者へのリクエスト", registration: "登録リクエスト", profile: "プロフィール申請" },
    status: { pending: "確認中", approved: "承認済み", rejected: "見送り" },
    types: {
      master_request: "データ追加申請",
      new_profile_activation: "プロ会員初回利用申請",
      new_owner_profile_activation: "オーナープロフィール利用申請",
      expert_display_name_change: "プロプロフィール変更申請",
      owner_display_name_change: "オーナープロフィール変更申請",
      display_name_change: "オーナープロフィール審査申請",
      claim_origin: "店舗・ブランド紐付け申請",
      feature_request: "機能追加のリクエスト",
      data_correction: "データ修正依頼",
      other_inquiry: "その他のお問い合わせ",
      account_delete_request: "アカウント削除リクエスト",
      account_suspend_request: "アカウント一時停止リクエスト",
      content_warning: "投稿に関する運営からの警告",
    },
  },
  en: {
    loading: "Loading requests...",
    description: "Professional profile applications and registration requests. Completed requests are archived after one week.",
    pendingCount: "Pending",
    empty: "No incoming requests.",
    senderId: "Sender ID",
    username: "Username",
    originId: "Origin ID",
    requestedContent: "Request details",
    requestedNameEn: "Requested name (EN)",
    profileDetails: "Profile details at submission",
    noContent: "(No content)",
    approve: "Approve",
    reject: "Decline",
    commentLabel: "Message or reason for the user (optional)",
    commentPlaceholder: "Example: Thank you for your request. The master data has been added.",
    errorMessage: "We couldn't complete this action. Review the request and try again.",
    errorTitle: "Update failed",
    categories: { all: "All", operator: "Requests to the team", registration: "Registration requests", profile: "Profile applications" },
    status: { pending: "Pending", approved: "Approved", rejected: "Declined" },
    types: {
      master_request: "Data Addition Request",
      new_profile_activation: "Professional Profile Application",
      new_owner_profile_activation: "Owner Profile Application",
      expert_display_name_change: "Professional Profile Change",
      owner_display_name_change: "Owner Profile Change",
      display_name_change: "Owner Profile Review",
      claim_origin: "Store or Brand Claim",
      feature_request: "Feature Request",
      data_correction: "Data Correction",
      other_inquiry: "Other Inquiry",
      account_delete_request: "Account Deletion Request",
      account_suspend_request: "Account Suspension Request",
      content_warning: "Post Warning from the Team",
    },
  },
} as const

function generateSlug(str: string): string {
  const sanitized = str.trim().toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "")
  return sanitized || `item-${Date.now()}`
}

export default function AdminNotificationManager({ lang = "ja" }: { lang?: "ja" | "en" }) {
  const { showPopup } = useAppPopup()
  const isEn = lang === "en"
  const t = ADMIN_DICT[isEn ? "en" : "ja"]
  const [requests, setRequests] = useState<AdminIncomingRequest[]>([])
  const [pendingCount, setPendingCount] = useState(0)
  const [usernames, setUsernames] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [inputComments, setInputComments] = useState<{ [key: string]: string }>({})
  const [activeCategory, setActiveCategory] = useState<RequestCategory>("all")

  const fetchRequests = async () => {
    setLoading(true)
    const requestResult = await supabase
      .from("admin_notifications")
      .select("id, user_id, type, target_origin_id, requested_display_name, requested_display_name_en, request_payload, status, admin_comment, created_at")
      .order("created_at", { ascending: false })

    let data = requestResult.data as AdminIncomingRequest[] | null
    let error = requestResult.error

    if (
      error &&
      (
        error.code === "42703" ||
        error.code === "PGRST204" ||
        error.message?.includes("request_payload")
      )
    ) {
      const legacyResult = await supabase
        .from("admin_notifications")
        .select("id, user_id, type, target_origin_id, requested_display_name, requested_display_name_en, status, admin_comment, created_at")
        .order("created_at", { ascending: false })

      data = legacyResult.data
        ? legacyResult.data.map((request) => ({ ...request, request_payload: null })) as AdminIncomingRequest[]
        : null
      error = legacyResult.error
    }

    if (!error && data) {
      const now = new Date()
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const visibleRequests = data.filter((req) => {
        if (req.status === "pending") return true
        const createdAt = new Date(req.created_at)
        return createdAt > oneWeekAgo
      })

      setRequests(visibleRequests)
      setPendingCount(data.filter(r => r.status === "pending").length)

      const userIds = Array.from(new Set(data.map((request) => request.user_id).filter(Boolean)))
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from("users")
          .select("id, username")
          .in("id", userIds)

        if (usersError) {
          console.error("【User Fetch Error】:", usersError)
        } else {
          setUsernames(Object.fromEntries((users || []).map((user) => [
            user.id,
            user.username || (isEn ? "(Not set)" : "（未設定）"),
          ])))
        }
      } else {
        setUsernames({})
      }
    } else if (error) {
      console.error("【Fetch Error】:", error)
    }
    setLoading(false)
  }

  const handleMasterRequestApproval = async (req: AdminIncomingRequest) => {
    const rawName = req.requested_display_name?.trim() || ""
    if (!rawName) return

    const match = rawName.match(/^\[(SOURCE|MARKET|VARIETY|PROCESS|GEAR|DRIPPER|GRINDER|FILTER|KETTLE|SCALE|TASTE_FLAVOR|TASTE_MOUTHFEEL|TASTE_AFTERTASTE)\]\s*(.*)$/i)
    if (!match) return

    const category = match[1].toUpperCase()
    const nameVal = match[2].trim()

    if (!nameVal) return

    if (category === "SOURCE" || category === "MARKET") {
      const type = category.toLowerCase()
      const slug = generateSlug(nameVal)
      await supabase.from("origins").insert({
        slug,
        name: nameVal,
        name_ja: nameVal,
        type,
        search_keywords: nameVal
      })
    } else if (category === "VARIETY") {
      const slug = generateSlug(nameVal)
      await supabase.from("varieties").insert({
        slug,
        name: nameVal,
        name_ja: nameVal,
        search_keywords: nameVal
      })
    } else if (category === "PROCESS") {
      const slug = generateSlug(nameVal)
      await supabase.from("processes").insert({
        slug,
        name: nameVal,
        name_ja: nameVal,
        search_keywords: nameVal
      })
    } else if (["GEAR", "DRIPPER", "GRINDER", "FILTER", "KETTLE", "SCALE"].includes(category)) {
      let brand = "Other"
      let gearName = nameVal

      if (nameVal.includes("/")) {
        const parts = nameVal.split("/")
        brand = parts[0].trim()
        gearName = parts[1].trim()
      }

      await supabase.from("gears").insert({
        brand,
        brand_ja: brand,
        name: gearName,
        name_ja: gearName,
        type: category === "GEAR" ? "other" : category.toLowerCase()
      })
    } else if (category.startsWith("TASTE_")) {
      const attributeType = category === "TASTE_MOUTHFEEL"
        ? "mouthfeel"
        : category === "TASTE_AFTERTASTE"
          ? "aftertaste"
          : "flavor"

      await supabase.from("tastes").insert({
        slug: generateSlug(nameVal),
        name: nameVal,
        name_ja: nameVal,
        attribute_type: attributeType,
        parent_id: null,
        sort_order: 999
      })
    }
  }

  const updateRequestStatus = async (req: AdminIncomingRequest, newStatus: "approved" | "rejected") => {
    const commentToSend = inputComments[req.id]?.trim() || null
    const requestPayload = req.request_payload || {}
    const requestOriginId = (() => {
      const parsed = Number(requestPayload.origin_id)
      return Number.isInteger(parsed) && parsed > 0 ? parsed : null
    })()

    const applyRequestedProfile = async (profileType: "expert" | "owner") => {
      if (Object.keys(requestPayload).length === 0) return
      const lang = requestPayload.lang === "en" ? "en" : "ja"
      const userPayload: Record<string, unknown> = {}
      if (typeof requestPayload.avatar_url === "string") userPayload.avatar_url = requestPayload.avatar_url
      if (typeof requestPayload.cover_url === "string") userPayload.cover_url = requestPayload.cover_url
      if (Object.keys(userPayload).length > 0) {
        const { error } = await supabase.from("users").update(userPayload).eq("id", req.user_id)
        if (error) throw error
      }

      const profilePayload: Record<string, unknown> = {}
      if (profileType === "expert") {
        if (lang === "en") {
          profilePayload.bio_expert_en = requestPayload.bio ?? null
          profilePayload.current_store_en = requestPayload.current_store ?? null
          profilePayload.past_stores_en = requestPayload.past_stores ?? []
          profilePayload.awards_en = requestPayload.awards ?? null
          profilePayload.primary_specialty_en = requestPayload.primary_specialty ?? null
          profilePayload.sub_specialties_en = requestPayload.sub_specialties ?? []
        } else {
          profilePayload.bio_expert = requestPayload.bio ?? null
          profilePayload.current_store = requestPayload.current_store ?? null
          profilePayload.past_stores = requestPayload.past_stores ?? []
          profilePayload.awards = requestPayload.awards ?? null
          profilePayload.primary_specialty = requestPayload.primary_specialty ?? null
          profilePayload.sub_specialties = requestPayload.sub_specialties ?? []
        }
        const { error } = await supabase.from("experts").update(profilePayload).eq("user_id", req.user_id)
        if (error) throw error
      } else {
        profilePayload.links = requestPayload.links ?? []
        if (lang === "en") {
          profilePayload.bio_en = requestPayload.bio ?? null
          profilePayload.headquarters_en = requestPayload.headquarters ?? null
          profilePayload.branches_en = requestPayload.branches ?? []
        } else {
          profilePayload.bio = requestPayload.bio ?? null
          profilePayload.headquarters = requestPayload.headquarters ?? null
          profilePayload.branches = requestPayload.branches ?? []
        }
        const originQuery = supabase.from("origins").update(profilePayload)
        const { error } = requestPayload.origin_id
          ? await originQuery.eq("id", requestPayload.origin_id)
          : await originQuery.eq("user_id", req.user_id)
        if (error) throw error
      }

      if (Array.isArray(requestPayload.gear_ids)) {
        const { error: deleteError } = await supabase.from("profile_gears").delete().eq("user_id", req.user_id).eq("profile_type", profileType)
        if (deleteError) throw deleteError
        const gearIds = requestPayload.gear_ids.filter((id): id is number => typeof id === "number")
        if (gearIds.length > 0) {
          const { error: insertError } = await supabase.from("profile_gears").insert(
            gearIds.map(gear_id => ({ user_id: req.user_id, profile_type: profileType, gear_id }))
          )
          if (insertError) throw insertError
        }
      }
    }

    try {
      if (
        req.type === "claim_origin" ||
        req.type === "display_name_change" ||
        req.type === "owner_display_name_change" ||
        req.type === "new_owner_profile_activation"
      ) {
        const response = await fetch("/api/admin/owner-profile-request", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            requestId: req.id,
            status: newStatus,
            adminComment: commentToSend,
          }),
        })
        if (!response.ok) {
          const responseText = await response.text()
          let responseError = ""
          try {
            const result = JSON.parse(responseText) as { error?: string }
            responseError = typeof result.error === "string" ? result.error : ""
          } catch {
            responseError = responseText.trim()
          }
          throw new Error(
            responseError ||
            `Owner profile request could not be processed (HTTP ${response.status})`
          )
        }
        setRequests((previous) => previous.map((item) => (
          item.id === req.id
            ? { ...item, status: newStatus, admin_comment: commentToSend }
            : item
        )))
        setPendingCount((previous) => Math.max(0, previous - 1))
        return
      }

      if (newStatus === "approved") {
        if (req.type === "account_suspend_request" || req.type === "account_delete_request") {
          const endpoint = req.type === "account_delete_request"
            ? "/api/delete-account"
            : "/api/suspend-account"
          const response = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: req.user_id }),
          })
          if (!response.ok) {
            const result = await response.json().catch(() => null)
            throw new Error(result?.error || "Account action failed")
          }

          if (req.type === "account_delete_request") {
            setRequests((previous) => previous.filter((item) => item.id !== req.id))
            setPendingCount((previous) => Math.max(0, previous - 1))
            return
          }
        }
        else if (req.type === "master_request") {
          await handleMasterRequestApproval(req)
        }
        else if (req.type === "claim_origin") {
          const requestedOriginId = requestPayload.origin_id || null
          if (!requestedOriginId) throw new Error("対象店舗IDが申請データにありません。")
          const originUpdatePayload: Record<string, any> = {
            user_id: req.user_id,
            is_profile_completed: true,
            is_approved: true,
            is_public: true
          }
          if (req.requested_display_name) {
            originUpdatePayload.display_name = req.requested_display_name
            originUpdatePayload.pending_display_name = null
          }
          if (req.requested_display_name_en) {
            originUpdatePayload.display_name_en = req.requested_display_name_en
            originUpdatePayload.pending_display_name_en = null
          }

          const { error: originErr } = await supabase
            .from("origins")
            .update(originUpdatePayload)
            .eq("id", requestedOriginId)

          if (originErr) throw originErr
          await applyRequestedProfile("owner")
        } 
        else if (req.type === "owner_display_name_change" || req.type === "display_name_change") {
          const requestedOriginId = req.target_origin_id || requestPayload.origin_id || null
          const originUpdatePayload: Record<string, any> = {
            user_id: req.user_id,
            is_profile_completed: true,
            is_approved: true,
            is_public: true
          }

          if (req.requested_display_name) {
            originUpdatePayload.display_name = req.requested_display_name
            originUpdatePayload.pending_display_name = null
          }
          if (req.requested_display_name_en) {
            originUpdatePayload.display_name_en = req.requested_display_name_en
            originUpdatePayload.pending_display_name_en = null
          }

          if (Object.keys(originUpdatePayload).length > 0) {
            let approvalQuery = supabase
              .from("origins")
              .update(originUpdatePayload)
            approvalQuery = requestedOriginId
              ? approvalQuery.eq("id", requestedOriginId)
              : approvalQuery.eq("user_id", req.user_id)
            const { error: originErr } = await approvalQuery

            if (originErr) throw originErr
          }
          await applyRequestedProfile("owner")
        }
        else if (req.type === "new_profile_activation") {
          const expertPayload: Record<string, any> = { is_approved: true, is_public: true }
          if (req.requested_display_name) {
            expertPayload.display_name = req.requested_display_name
            expertPayload.pending_display_name = null
          }
          if (req.requested_display_name_en) {
            expertPayload.display_name_en = req.requested_display_name_en
            expertPayload.pending_display_name_en = null
          }

          const { error: expertErr } = await supabase
            .from("experts")
            .update(expertPayload)
            .eq("user_id", req.user_id)

          if (expertErr) throw expertErr
          await applyRequestedProfile("expert")
        }
        else if (req.type === "expert_display_name_change") {
          const expertPayload: Record<string, any> = {
            is_approved: true,
            is_public: true
          }
          if (req.requested_display_name) {
            expertPayload.display_name = req.requested_display_name
            expertPayload.pending_display_name = null
          }
          if (req.requested_display_name_en) {
            expertPayload.display_name_en = req.requested_display_name_en
            expertPayload.pending_display_name_en = null
          }

          const { error: expertErr } = await supabase
            .from("experts")
            .update(expertPayload)
            .eq("user_id", req.user_id)

          if (expertErr) throw expertErr
          await applyRequestedProfile("expert")
        }
        else if (req.type === "new_owner_profile_activation") {
          if (!requestOriginId) {
            throw new Error("申請データに対象店舗IDがありません。申請を開き直して、もう一度お試しください。")
          }
          const { data: originToApprove, error: originCheckError } = await supabase
            .from("origins")
            .select("id, slug, name")
            .eq("id", requestOriginId)
            .maybeSingle()

          if (originCheckError) throw originCheckError
          if (!originToApprove) {
            throw new Error(`承認対象の店舗レコード（ID: ${requestOriginId}）が見つかりません。`)
          }
          if (!originToApprove.slug?.trim() || !originToApprove.name?.trim()) {
            throw new Error("承認前にoriginsのslugとnameを入力してください。")
          }

          const originPayload: Record<string, any> = {
            user_id: req.user_id,
            is_profile_completed: true,
            is_approved: true,
            is_public: true
          }
          if (req.requested_display_name) {
            originPayload.display_name = req.requested_display_name
            originPayload.pending_display_name = null
          }
          if (req.requested_display_name_en) {
            originPayload.display_name_en = req.requested_display_name_en
            originPayload.pending_display_name_en = null
          }

          const { error: originErr } = await supabase
            .from("origins")
            .update(originPayload)
            .eq("id", requestOriginId)

          if (originErr) throw originErr
          await applyRequestedProfile("owner")
        }
      } 
      else if (newStatus === "rejected") {
        if (req.type === "claim_origin" || req.type === "owner_display_name_change" || req.type === "display_name_change") {
          const rejectedOriginId = req.target_origin_id || requestPayload.origin_id || null
          let rejectionQuery = supabase
            .from("origins")
            .update({
              pending_display_name: null,
              pending_display_name_en: null
            })
          rejectionQuery = rejectedOriginId
            ? rejectionQuery.eq("id", rejectedOriginId)
            : rejectionQuery.eq("user_id", req.user_id)
          const { error: originErr } = await rejectionQuery

          if (originErr) throw originErr
        } else if (req.type === "new_profile_activation" || req.type === "expert_display_name_change") {
          const { error: expertErr } = await supabase
            .from("experts")
            .update({
              pending_display_name: null,
              pending_display_name_en: null
            })
            .eq("user_id", req.user_id)

          if (expertErr) throw expertErr
        } else if (req.type === "new_owner_profile_activation") {
          if (!requestOriginId) {
            throw new Error("申請データに対象店舗IDがありません。申請を開き直して、もう一度お試しください。")
          }
          let rejectionQuery = supabase
            .from("origins")
            .update({
              is_approved: false,
              is_public: false,
              pending_display_name: null,
              pending_display_name_en: null
            })
          rejectionQuery = rejectionQuery.eq("id", requestOriginId)
          const { error: originErr } = await rejectionQuery

          if (originErr) throw originErr
        }
      }

      const { error: notifyError } = await supabase
        .from("admin_notifications")
        .update({ 
          status: newStatus,
          admin_comment: commentToSend
        })
        .eq("id", req.id)

      if (notifyError) throw notifyError

      setRequests(prev =>
        prev.map(r => r.id === req.id ? { ...r, status: newStatus, admin_comment: commentToSend } : r)
      )
      setPendingCount(prev => Math.max(0, prev - 1))

    } catch (error: any) {
      console.error(error)
      console.error("Admin request processing failed:", error)
      const detail = error instanceof Error && error.message ? error.message : t.errorMessage
      showPopup(detail, "error", t.errorTitle)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  if (loading) {
    return (
      <div aria-busy="true" className="mx-auto w-full max-w-5xl animate-pulse rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="h-6 w-48 rounded bg-neutral-100" />
        <div className="mt-8 space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-neutral-100 p-5">
              <div className="flex justify-between gap-4">
                <div className="h-4 w-2/5 rounded bg-neutral-100" />
                <div className="h-7 w-20 rounded-full bg-neutral-100" />
              </div>
              <div className="mt-4 h-3 w-full rounded bg-neutral-100" />
              <div className="mt-2 h-3 w-3/4 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "pending": return "bg-amber-50/70 text-amber-800 border-amber-200/60"
      case "approved": return "bg-emerald-50/70 text-emerald-800 border-emerald-200/60"
      case "rejected": return "bg-rose-50/70 text-rose-800 border-rose-200/60"
      default: return "bg-neutral-50 text-neutral-600 border-neutral-200/60"
    }
  }
  const filteredRequests = activeCategory === "all"
    ? requests
    : requests.filter((request) => getRequestCategory(request.type) === activeCategory)
  const categories: Array<{ key: RequestCategory; label: string }> = [
    { key: "all", label: t.categories.all },
    { key: "operator", label: t.categories.operator },
    { key: "registration", label: t.categories.registration },
    { key: "profile", label: t.categories.profile },
  ]

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm animate-fadeIn sm:p-8">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 border-b border-neutral-100 pb-6">
        <div className="text-left">
          <h2 className="text-[15px] font-bold tracking-wider text-neutral-900 uppercase flex items-center gap-2 select-none">
            <span className={`w-2 h-2 rounded-full ${pendingCount > 0 ? "bg-amber-500 animate-pulse" : "bg-neutral-300"}`} />
            INCOMING REQUESTS
            {pendingCount > 0 && (
              <span className="bg-amber-600 text-white font-mono text-[10px] font-bold px-2.5 py-0.5 rounded-full shrink-0">
                {t.pendingCount}: {pendingCount}
              </span>
            )}
          </h2>
          <p className="text-[11px] font-normal tracking-wide text-neutral-400 mt-1.5 leading-relaxed">
            {t.description}
          </p>
        </div>
      </div>

      <div className="flex w-full gap-2 overflow-x-auto pb-1">
        {categories.map(({ key, label }) => {
          const items = key === "all" ? requests : requests.filter((request) => getRequestCategory(request.type) === key)
          const pending = items.filter((request) => request.status === "pending").length
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`shrink-0 rounded-xl border px-3.5 py-2 text-[11px] font-semibold tracking-wide transition ${
                activeCategory === key
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
              }`}
            >
              {label} <span className="ml-1 opacity-60">{items.length}</span>
              {pending > 0 && <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] text-white">{pending}</span>}
            </button>
          )
        })}
      </div>

      <div className="w-full">
        {filteredRequests.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-neutral-200 rounded-[24px] bg-neutral-50/30">
            <p className="text-[14px] font-medium text-neutral-400/80">{t.empty}</p>
          </div>
        ) : (
          <div className="space-y-5 max-h-[660px] overflow-y-auto pr-1 custom-scrollbar">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className={`p-6 rounded-[24px] border transition-all duration-300 ${
                  req.status !== "pending"
                    ? "bg-neutral-50/40 border-neutral-200/60"
                    : "bg-white border-neutral-200/80 shadow-sm"
                }`}
              >
                <div className="flex flex-col gap-4.5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="space-y-3 text-left">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold tracking-wider border ${getStatusBadgeStyle(req.status)}`}>
                          {t.status[req.status]}
                        </span>
                        <span className="text-[10px] bg-neutral-100/80 text-neutral-500 px-2 py-0.5 rounded-lg border border-neutral-200/40 font-medium tracking-wide">
                          {t.types[req.type as keyof typeof t.types] || req.type}
                        </span>
                        <span className="text-[11px] text-neutral-400 font-medium tracking-wide">
                          {new Date(req.created_at).toLocaleString(isEn ? "en-US" : "ja-JP", {
                            year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-[11px] text-neutral-400 font-medium tracking-wide flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span>{t.senderId}:</span>
                          <span className="font-mono text-neutral-600 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200/30">{req.user_id}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>{t.username}:</span>
                          <span className="font-mono text-neutral-700 bg-neutral-50 px-1.5 py-0.5 rounded border border-neutral-200/30">
                            {usernames[req.user_id] || (isEn ? "(Not set)" : "（未設定）")}
                          </span>
                        </div>
                        {req.target_origin_id && (
                          <div className="flex items-center gap-1.5">
                            <span>{t.originId}:</span>
                            <span className="font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/40">{req.target_origin_id}</span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1 pt-1">
                        <h4 className="text-[14px] font-bold tracking-wide text-neutral-800 flex items-baseline gap-1.5">
                          <span className="text-xs text-neutral-400 font-medium">{t.requestedContent}:</span> 
                          <span className="text-neutral-900 font-bold">{req.requested_display_name || t.noContent}</span>
                        </h4>
                        {req.requested_display_name_en && (
                          <h4 className="text-[14px] font-bold tracking-wide text-neutral-800 flex items-baseline gap-1.5">
                            <span className="text-xs text-neutral-400 font-medium">{t.requestedNameEn}:</span> 
                            <span className="text-neutral-900 font-bold">{req.requested_display_name_en}</span>
                          </h4>
                        )}
                      </div>

                      {PROFILE_REQUEST_TYPES.has(req.type) && req.request_payload && (
                        <div className="mt-3 rounded-2xl border border-neutral-200/80 bg-neutral-50/70 p-4">
                          <p className="mb-3 text-[11px] font-bold tracking-wide text-neutral-500 uppercase">
                            {t.profileDetails}
                          </p>
                          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
                            {Object.entries(req.request_payload).map(([key, value]) => (
                              <div key={key} className="min-w-0 border-b border-neutral-200/60 pb-2">
                                <dt className="text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                                  {key.replaceAll("_", " ")}
                                </dt>
                                <dd className="mt-1 break-words whitespace-pre-wrap text-[12px] leading-relaxed text-neutral-800">
                                  {value === null || value === "" || (Array.isArray(value) && value.length === 0)
                                    ? "—"
                                    : typeof value === "object"
                                      ? JSON.stringify(value, null, 2)
                                      : String(value)}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                      )}
                    </div>

                    {req.status === "pending" && (
                      <div className="flex items-center gap-2 self-end sm:self-start shrink-0 pt-1">
                        <button
                          type="button"
                          onClick={() => updateRequestStatus(req, "approved")}
                          className="bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition duration-200 active:scale-95"
                        >
                          {t.approve}
                        </button>
                        <button
                          type="button"
                          onClick={() => updateRequestStatus(req, "rejected")}
                          className="border border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600 hover:text-neutral-900 text-xs font-semibold px-4 py-2.5 rounded-xl shadow-sm transition duration-200 active:scale-95"
                        >
                          {t.reject}
                        </button>
                      </div>
                    )}
                  </div>

                  {req.status === "pending" ? (
                    <div className="w-full text-left pt-4 border-t border-neutral-100">
                      <label className="block text-[11px] font-bold tracking-wide text-neutral-400/90 uppercase mb-2">
                        {t.commentLabel}
                      </label>
                      <input
                        type="text"
                        placeholder={t.commentPlaceholder}
                        value={inputComments[req.id] || ""}
                        onChange={(e) => setInputComments(prev => ({ ...prev, [req.id]: e.target.value }))}
                        className="w-full text-xs px-3.5 py-2.5 border border-neutral-200/80 rounded-xl focus:outline-none focus:border-neutral-400 placeholder-neutral-300 text-neutral-800 font-normal transition duration-200"
                      />
                    </div>
                  ) : (
                    req.admin_comment && (
                      <div className="w-full text-left pt-4 border-t border-neutral-100 text-[13px] bg-neutral-50/60 p-4 rounded-2xl border border-neutral-200/40">
                        <span className="font-bold text-[10px] text-neutral-400/90 uppercase tracking-widest block mb-1.5 select-none">
                          ADMIN COMMENT
                        </span>
                        <p className="text-neutral-600 font-normal leading-relaxed whitespace-pre-wrap">
                          {req.admin_comment}
                        </p>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
