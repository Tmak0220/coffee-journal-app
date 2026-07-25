"use client"

import React, { useState, useEffect, useRef } from "react"
import Link from "next/link" 
import { supabase } from "@/lib/supabase"
import MediaUpload from "./MediaUpload"
import MinimalCalendar from "./MinimalCalendar"
import CategorySelector, { CategorySelection } from "./CategorySelector"
import PastStoresInput from "./PastStoresInput"
import ProfileGearSelector from "./ProfileGearSelector"

type Props = {
  userId: string
  initialUsername: string | null
  initialDisplayName: string | null
  initialDisplayNameEn?: string | null
  initialBio: string | null
  initialBioEn?: string | null
  initialAvatarUrl: string | null
  initialCoverUrl: string | null
  initialPastStores?: string[] | null
  initialPastStoresEn?: string[] | null
  initialCurrentStore?: string | null
  initialCurrentStoreEn?: string | null
  initialAwards?: string | null
  initialAwardsEn?: string | null
  initialPrimarySpecialty?: string | null
  initialPrimarySpecialtyEn?: string | null
  initialSubSpecialties?: string[] | null
  initialSubSpecialtiesEn?: string[] | null
  lang?: string
  initialIsApproved?: boolean
  initialIsProfileCompleted?: boolean
  initialIsPublic?: boolean
  onAccessStatusChange?: (canUsePostingFeatures: boolean) => void
}

type StatusMessage = {
  text: string
  type: "success" | "error"
}

const normalizeExpertCategory = (category: string | null) =>
  category === "ギーグ" ? "ギーク" : category

const normalizeExpertCategories = (categories: string[] | null | undefined) =>
  (categories || []).map((category) => normalizeExpertCategory(category) || category)

type CalendarEventItem = {
  id: string
  title: string
  event_date: string
  start_date: string
  end_date: string
  type: "report" | "memo"
  memo?: string | null
}

const profileDict = {
  ja: {
    tabProfile: "プロフィール設定",
    tabCalendar: "スケジュールカレンダー",
    labelUsername: "EXPERT URL / USERNAME",
    descUsername: "ユーザーネーム（変更はアカウント設定から行えます）",
    noteUsername: "※ユーザーネームはこのページからは登録ができません。",
    viewPublicPage: "公開ページを確認する ↗", 
    labelDisplayName: "DISPLAY NAME",
    descDisplayName: "公開表示名（変更は運営の承認後に反映されます）",
    labelBio: "EXPERT BIO",
    descBio: "プロフィール・自己紹介",
    placeholderBio: "活動実績などをご記入ください",
    labelCategories: "EXPERT CATEGORIES",
    descCategories: "あなたに最もふさわしい専門カテゴリーを1つ以上選択してください（複数選択可能）",
    labelCurrentStore: "CURRENT STORE",
    descCurrentStore: "現在メインで活動・所属している店舗名を入力してください",
    placeholderCurrentStore: "COFFEE ROASTERS",
    labelPastStores: "PAST EXPERIENCE STORES",
    descPastStores: "これまでに所属した店舗を入力してください（複数追加できます）",
    placeholderPastStores: "例: CAFE",
    addStoreBtn: "+ 所属店舗を追加", 
    labelAwards: "AWARDS & ACHIECHEMENTS",
    descAwards: "これまでの受賞歴や資格、実績などを入力してください",
    placeholderAwards: "Japan Barista Championship 優勝",
    loading: "処理中...",
    submitButton: "変更を申請",
    submitRequestButton: "プロフィールを確定して運営に利用申請を送る",
    successMessage: "プロフィールの変更申請を送信しました。運営の承認をお待ちください。",
    successRequestMessage: "プロフィールの登録と利用申請が完了しました。運営の承認をお待ちください。",
    errorMessage: (msg: string) => `保存に失敗しました: ${msg}`,
    validationError: "申請には、アバター画像、カバー画像、公開表示名、専門カテゴリー、プロフィールの入力が必須です。",
    labelScheduleTitle: "スケジュール名 / メモ",
    placeholderScheduleTitle: "例: 出張イベント対応、定休日など",
    labelStartDate: "開始日",
    placeholderStartDate: "年/月/日",
    labelEndDate: "終了日",
    placeholderEndDate: "年/月/日",
    labelVisibility: "公開設定",
    visDraft: "下書き",
    visPrivate: "非公開 (自分のみ)",
    visMembers: "限定公開 (会員のみ)",
    visPublic: "公開 (全員に公開)",
    submitCalendarForm: "スケジュールを登録する",
    clearForm: "入力内容をクリア",
    requiredBadge: "（必須）",
    nameChangeWarning: "表示名を変更すると、反映には運営の再承認が必要になります。変更しますか？"
  },
  en: {
    tabProfile: "Profile Settings",
    tabCalendar: "Schedule Calendar",
    labelUsername: "EXPERT URL / USERNAME",
    descUsername: "Username (Can be managed in Account Settings)",
    noteUsername: "* Username cannot be registered from this page.",
    viewPublicPage: "View Public Page ↗", 
    labelDisplayName: "DISPLAY NAME",
    descDisplayName: "Display Name (Changes will be applied after admin approval)",
    labelBio: "EXPERT BIO",
    descBio: "Biography & Self-Introduction",
    placeholderBio: "Please describe your achievements and activities",
    labelCategories: "EXPERT CATEGORIES",
    descCategories: "Select one or more categories that best describe you (Multiple select)",
    labelCurrentStore: "CURRENT STORE",
    descCurrentStore: "Enter the name of the store you are currently primarily working at or affiliated with",
    placeholderCurrentStore: "COFFEE ROASTERS",
    labelPastStores: "PAST EXPERIENCE STORES",
    descPastStores: "Add stores you have worked at in the past (multiple entries allowed)",
    placeholderPastStores: "e.g., CAFE",
    addStoreBtn: "+ Add Past Store", 
    labelAwards: "AWARDS & ACHIEVEMENTS",
    descAwards: "Enter your past awards, certifications, or notable achievements",
    placeholderAwards: "Japan Barista Championship Winner",
    loading: "Processing...",
    submitButton: "Submit Changes for Review",
    submitRequestButton: "Confirm Profile & Submit Application to Admin",
    successMessage: "Your profile change request has been submitted for administrator review.",
    successRequestMessage: "Profile registered and application submitted successfully. Please wait for admin approval.",
    errorMessage: (msg: string) => `Failed to save: ${msg}`,
    validationError: "Avatar, Cover Image, DISPLAY NAME, EXPERT CATEGORIES, and EXPERT BIO are required to submit application.",
    labelScheduleTitle: "Schedule / Memo",
    placeholderScheduleTitle: "e.g. Workshop Event, Day Off",
    labelStartDate: "Start Date",
    placeholderStartDate: "yyyy-mm-dd",
    labelEndDate: "End Date (Optional)",
    placeholderEndDate: "yyyy-mm-dd",
    labelVisibility: "Visibility",
    visDraft: "Draft",
    visPrivate: "Private (Just me)",
    visMembers: "Members Only",
    visPublic: "Public (Everyone)",
    submitCalendarForm: "Save Schedule",
    clearForm: "Clear Form",
    requiredBadge: "(Required)",
    nameChangeWarning: "Changing your Display Name requires re-approval from administrators. Are you sure you want to change it?"
  }
}

export default function ProProfileForm({ 
  userId, 
  initialUsername, 
  initialDisplayName, 
  initialDisplayNameEn = "",
  initialBio,
  initialBioEn = "",
  initialAvatarUrl,
  initialCoverUrl,
  initialPastStores = [],
  initialPastStoresEn = [],
  initialCurrentStore = "",
  initialCurrentStoreEn = "",
  initialAwards = "",
  initialAwardsEn = "",
  initialPrimarySpecialty = null,
  initialPrimarySpecialtyEn = null,
  initialSubSpecialties = [],
  initialSubSpecialtiesEn = [],
  lang = "ja",
  initialIsApproved = false,
  initialIsProfileCompleted = false,
  initialIsPublic = false,
  onAccessStatusChange
}: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = profileDict[currentLang]

  const [activeTab, setActiveTab] = useState<"profile" | "calendar">("profile")

  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl)
  const [coverUrl, setCoverUrl] = useState<string | null>(initialCoverUrl)
  const committedAvatarUrlRef = useRef<string | null>(initialAvatarUrl)
  const committedCoverUrlRef = useRef<string | null>(initialCoverUrl)

  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  const username = initialUsername?.toLowerCase() || ""

  // 日本語用・英語用のそれぞれのステートを独立して管理
  const [displayName, setDisplayName] = useState(initialDisplayName || "")
  const [displayNameEn, setDisplayNameEn] = useState(initialDisplayNameEn || "")

  const [bio, setBio] = useState(currentLang === "en" ? (initialBioEn || "") : (initialBio || ""))
  const [currentStore, setCurrentStore] = useState(currentLang === "en" ? (initialCurrentStoreEn || "") : (initialCurrentStore || ""))
  const [pastStores, setPastStores] = useState<string[]>(currentLang === "en" ? (initialPastStoresEn || []) : (initialPastStores || []))
  const [awards, setAwards] = useState(currentLang === "en" ? (initialAwardsEn || "") : (initialAwards || ""))

  const [isApproved, setIsApproved] = useState(initialIsApproved)
  const [isProfileCompleted, setIsProfileCompleted] = useState(initialIsProfileCompleted)

  const getInitialCategorySelection = (): CategorySelection => {
    return {
      main: normalizeExpertCategory(currentLang === "en" ? initialPrimarySpecialtyEn : initialPrimarySpecialty),
      subs: normalizeExpertCategories(currentLang === "en" ? initialSubSpecialtiesEn : initialSubSpecialties)
    }
  }
  const [selectedCategories, setSelectedCategories] = useState<CategorySelection>(getInitialCategorySelection())
  const [selectedGearIds, setSelectedGearIds] = useState<number[]>([])

  const [calendarItems, setCalendarItems] = useState<CalendarEventItem[]>([])

  const pastStoresKey = JSON.stringify(currentLang === "en" ? initialPastStoresEn : initialPastStores)
  const subSpecialtiesKey = JSON.stringify(currentLang === "en" ? initialSubSpecialtiesEn : initialSubSpecialties)
  const primarySpecialtyKey = currentLang === "en" ? initialPrimarySpecialtyEn : initialPrimarySpecialty

  useEffect(() => {
    supabase.from("profile_gears").select("gear_id").eq("user_id", userId).eq("profile_type", "expert").then(({ data, error }) => {
      if (error) console.error("Failed to load expert profile gears:", error)
      else setSelectedGearIds((data || []).map((item) => item.gear_id))
    })
  }, [userId])

  useEffect(() => {
    setDisplayName(initialDisplayName || "")
    setDisplayNameEn(initialDisplayNameEn || "")
    setBio(currentLang === "en" ? (initialBioEn || "") : (initialBio || ""))
    setCurrentStore(currentLang === "en" ? (initialCurrentStoreEn || "") : (initialCurrentStore || ""))
    setPastStores(currentLang === "en" ? (initialPastStoresEn || []) : (initialPastStores || []))
    setAwards(currentLang === "en" ? (initialAwardsEn || "") : (initialAwards || ""))
    
    setSelectedCategories({
      main: normalizeExpertCategory(currentLang === "en" ? initialPrimarySpecialtyEn : initialPrimarySpecialty),
      subs: normalizeExpertCategories(currentLang === "en" ? initialSubSpecialtiesEn : initialSubSpecialties)
    })

    setAvatarUrl(initialAvatarUrl)
    setCoverUrl(initialCoverUrl)
    setIsApproved(initialIsApproved)
    setIsProfileCompleted(initialIsProfileCompleted)

  }, [
    currentLang, 
    initialDisplayName, 
    initialDisplayNameEn, 
    initialBio, 
    initialBioEn, 
    initialCurrentStore, 
    initialCurrentStoreEn, 
    initialAwards, 
    initialAwardsEn, 
    initialAvatarUrl,
    initialCoverUrl,
    initialIsApproved,
    initialIsProfileCompleted,
    pastStoresKey,   
    primarySpecialtyKey,
    subSpecialtiesKey    
  ])

  useEffect(() => {
    async function initCalendarData() {
      const { data: memos } = await supabase
        .from("calendar_memos")
        .select("id, title, start_date, end_date, memo")
        .eq("user_id", userId)
        .eq("lang", currentLang)

      const items: CalendarEventItem[] = []
      if (memos) {
        memos.forEach(m => {
          items.push({ 
            id: m.id, 
            title: m.title, 
            event_date: m.start_date,
            start_date: m.start_date, 
            end_date: m.end_date || m.start_date,
            memo: m.memo || null,
            type: "memo" 
          })
        })
      }
      setCalendarItems(items)
    }

    if (activeTab === "calendar") {
      initCalendarData()
    }
    return () => setStatusMessage(null)
  }, [userId, activeTab, currentLang])

  const handleEventUpdate = (
    id: string, 
    type: "report" | "memo", 
    newMemo: string, 
    newTitle: string, 
    newStartDate: string, 
    newEndDate: string
  ) => {
    setCalendarItems(prev =>
      prev.map(item => (
        item.id === id 
          ? { 
              ...item, 
              memo: newMemo, 
              title: newTitle, 
              event_date: newStartDate, 
              start_date: newStartDate,
              end_date: newEndDate || newStartDate
            } 
          : item
      ))
    )
  }

  const isNameChanged = (displayName !== (initialDisplayName || "")) || (displayNameEn !== (initialDisplayNameEn || ""))

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage(null)

    const nextDisplayName = displayName.trim() || null
    const nextDisplayNameEn = displayNameEn.trim() || null
    const activeDisplayName = currentLang === "en" ? nextDisplayNameEn : nextDisplayName

    if (!avatarUrl || !coverUrl || !activeDisplayName || !selectedCategories.main || !bio.trim()) {
      setStatusMessage({ text: t.validationError, type: "error" })
      setLoading(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    try {
      const usersPayload: Record<string, any> = {
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      }

      const expertsPayload: Record<string, any> = {
        id: userId,
        user_id: userId
      }

      if (isNameChanged || !isProfileCompleted) {
        expertsPayload.pending_display_name = nextDisplayName
        expertsPayload.pending_display_name_en = nextDisplayNameEn
      }

      if (!isProfileCompleted) {
        expertsPayload.is_approved = false
        expertsPayload.is_public = false
        expertsPayload.is_profile_completed = true
      }

      if (!isProfileCompleted && lang === "en") {
        expertsPayload.bio_expert_en = bio.trim() || null
        expertsPayload.current_store_en = currentStore.trim() || null
        expertsPayload.past_stores_en = pastStores
        expertsPayload.awards_en = awards.trim() || null
        expertsPayload.primary_specialty_en = selectedCategories.main || null
        expertsPayload.sub_specialties_en = selectedCategories.subs
      } else if (!isProfileCompleted) {
        expertsPayload.bio_expert = bio.trim() || null
        expertsPayload.current_store = currentStore.trim() || null
        expertsPayload.past_stores = pastStores
        expertsPayload.awards = awards.trim() || null
        expertsPayload.primary_specialty = selectedCategories.main || null
        expertsPayload.sub_specialties = selectedCategories.subs
      }

      if (!isProfileCompleted) {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update(usersPayload)
          .eq("id", userId)
        if (userUpdateError) throw userUpdateError
      }

      const { error: expertUpdateError } = await supabase
        .from("experts")
        .upsert(expertsPayload, { onConflict: "id" })
        
      if (expertUpdateError) throw expertUpdateError

      if (!isProfileCompleted) {
        const { error: deleteGearError } = await supabase.from("profile_gears").delete().eq("user_id", userId).eq("profile_type", "expert")
        if (deleteGearError) throw deleteGearError
        if (selectedGearIds.length > 0) {
          const { error: insertGearError } = await supabase.from("profile_gears").insert(selectedGearIds.map((gearId) => ({ user_id: userId, profile_type: "expert", gear_id: gearId })))
          if (insertGearError) throw insertGearError
        }
      }

      // 初回申請後は、表示名以外を含むプロフィール変更も毎回運営へ申請する。
      {
        const { error: notifyError } = await supabase
          .from("admin_notifications")
          .insert({
            user_id: userId,
            type: !isProfileCompleted ? "new_profile_activation" : "expert_display_name_change",
            requested_display_name: nextDisplayName,
            requested_display_name_en: nextDisplayNameEn,
            request_payload: {
              profile_type: "expert",
              lang: currentLang,
              username: initialUsername,
              display_name: nextDisplayName,
              display_name_en: nextDisplayNameEn,
              bio: bio.trim() || null,
              current_store: currentStore.trim() || null,
              past_stores: pastStores,
              awards: awards.trim() || null,
              primary_specialty: selectedCategories.main || null,
              sub_specialties: selectedCategories.subs,
              gear_ids: selectedGearIds,
              avatar_url: avatarUrl,
              cover_url: coverUrl,
            },
            status: "pending"
          })

        if (notifyError) throw notifyError
      }

      const replacedMediaUrls = !isProfileCompleted ? [
        committedAvatarUrlRef.current && committedAvatarUrlRef.current !== avatarUrl ? committedAvatarUrlRef.current : null,
        committedCoverUrlRef.current && committedCoverUrlRef.current !== coverUrl ? committedCoverUrlRef.current : null,
      ].filter((url): url is string => Boolean(url)) : []
      await Promise.all(replacedMediaUrls.map(async (url) => {
        const response = await fetch("/api/delete-object", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
        if (!response.ok) console.error("Failed to delete replaced profile image from R2:", url)
      }))
      committedAvatarUrlRef.current = avatarUrl
      committedCoverUrlRef.current = coverUrl

      if (!isProfileCompleted) {
        setIsApproved(false)
        onAccessStatusChange?.(false)
      }

      if (!isProfileCompleted) {
        setIsProfileCompleted(true)
        setStatusMessage({ text: t.successRequestMessage, type: "success" })
      } else {
        setStatusMessage({ text: t.successMessage, type: "success" })
      }

      window.scrollTo({ top: 0, behavior: "smooth" })

    } catch (error: any) {
      setStatusMessage({ text: t.errorMessage(error.message || "Unknown error occurred"), type: "error" })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = "w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 text-neutral-900 focus:outline-none focus:border-neutral-400 focus:bg-white placeholder:text-neutral-400 transition-all duration-200"
  
  const requiredBadgeStyle = "text-neutral-500 text-[11px] font-sans font-medium ml-1" 

  return (
    <div key={currentLang} className="w-full" lang={currentLang}>
      
      <div className="w-full max-w-4xl mx-auto mb-6">
        {!isProfileCompleted ? (
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-600 text-[13px] leading-relaxed">
            {currentLang === "ja" 
              ? "プロ会員プロフィールは未申請です。必須項目（アバター・カバー・表示名・カテゴリー・自己紹介）を入力し、最下部のボタンから運営へ利用申請を送信してください。"
              : "Your professional profile has not been submitted. Please fill out the required fields (Avatar, Cover, Display Name, Categories, Bio) and submit your application."}
          </div>
        ) : !isApproved || !initialIsPublic ? (
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-600 text-[13px] leading-relaxed">
            {currentLang === "ja" 
              ? "現在、運営にてプロフィールの確認および登録審査を行っております。承認が完了するまでしばらくお待ちください。"
              : "Your profile and access request are currently under review by the administrator. Thank you for your patience."}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-600 text-[13px] leading-relaxed">
            {currentLang === "ja" 
              ? "プロ会員アカウントが承認されています。すべての投稿フォームと機能をご利用いただけます。※プロフィールを今後変更する際は、都度運営への再申請と承認が必要になります。"
              : "Your professional account has been approved. All post forms and features are fully accessible. *Any future profile changes will require administrator re-approval."}
          </div>
        )}
      </div>

      <div className="bg-white border border-neutral-200/60 pt-6 sm:pt-12 pb-10 sm:pb-16 px-6 sm:px-12 rounded-xl shadow-sm w-full space-y-12 animate-fade-in">
        
        <div className="space-y-10">
          <div className="w-full">
            <MediaUpload
              userId={userId}
              type="cover"
              initialUrl={initialCoverUrl}
              onUploaded={(url) => setCoverUrl(url)}
              label={`${currentLang === "en" ? "Upload Cover Image" : "カバー画像をアップロード"} ${t.requiredBadge}`}
              lang={currentLang}
            />
          </div>

          <div className="w-full">
            <MediaUpload
              userId={userId}
              type="avatar"
              initialUrl={initialAvatarUrl}
              onUploaded={(url) => setAvatarUrl(url)}
              label={`${currentLang === "en" ? "Set Avatar Image" : "アバター画像を設定"} ${t.requiredBadge}`}
              lang={currentLang}
            />
          </div>
        </div>

        <div className="flex border-b border-neutral-200/60 gap-8 select-none justify-center pt-2">
          <button
            type="button"
            onClick={() => { setActiveTab("profile"); setStatusMessage(null); }}
            className={`pb-4 text-[14px] font-medium tracking-wide transition-all border-b-2 relative top-[1px] ${
              activeTab === "profile" ? "border-neutral-900 text-neutral-900 font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {t.tabProfile}
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab("calendar"); setStatusMessage(null); }}
            className={`pb-4 text-[14px] font-medium tracking-wide transition-all border-b-2 relative top-[1px] ${
              activeTab === "calendar" ? "border-neutral-900 text-neutral-900 font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
          >
            {t.tabCalendar}
          </button>
        </div>

        {statusMessage && (
          <div className={`text-[13px] tracking-wide p-4 rounded-[24px] border w-full max-w-xl mx-auto text-center transition-all duration-300 ${
            statusMessage.type === "error" 
              ? "text-red-600 bg-red-50/40 border-red-200" 
              : "text-neutral-700 bg-neutral-50/60 border-neutral-200"
          }`}>
            {statusMessage.text}
          </div>
        )}

        {activeTab === "profile" && (
          <form onSubmit={handleUpdate} className="space-y-10 animate-fade-in pt-2">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 sm:gap-x-8 gap-y-3 items-start">
              <div>
                <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">{t.labelUsername}</label>
                <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5 whitespace-pre-line leading-relaxed min-h-[36px]">
                  {t.descUsername}
                </p>
              </div>
              <div>
                <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">
                  {t.labelDisplayName}<span className={requiredBadgeStyle}>{t.requiredBadge}</span>
                </label>
                <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5 whitespace-pre-line leading-relaxed min-h-[36px]">
                  {t.descDisplayName}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <div className="relative flex items-center w-full">
                  <span className="absolute left-4 text-[14px] font-mono font-medium text-neutral-400 select-none">
                    {currentLang}/experts/
                  </span>
                  <input 
                    type="text" 
                    value={username} 
                    readOnly
                    className={`${inputStyle} pl-[114px] font-mono text-neutral-400 bg-neutral-100/70 cursor-not-allowed select-none`}
                  />
                </div>
                
                <div className="flex flex-wrap items-center justify-between text-[12px] px-1 gap-2">
                  <p className="font-medium tracking-wide text-neutral-400 leading-relaxed">
                    {t.noteUsername}
                  </p>
                  {isProfileCompleted && isApproved ? (
                    <Link 
                      href={`/${currentLang}/experts/${username}`}
                      target="_blank"
                      className="text-neutral-600 font-semibold hover:text-neutral-900 transition-colors underline underline-offset-2"
                    >
                      {t.viewPublicPage}
                    </Link>
                  ) : (
                    <span className="text-neutral-300 font-normal cursor-not-allowed select-none">
                      {t.viewPublicPage} ({currentLang === "ja" ? "未承認" : "Pending"})
                    </span>
                  )}
                </div>
              </div>

              <div className="relative w-full space-y-2">
                <input 
                  type="text" 
                  value={currentLang === "en" ? displayNameEn : displayName} 
                  onChange={(e) => {
                    if (currentLang === "en") {
                      setDisplayNameEn(e.target.value)
                    } else {
                      setDisplayName(e.target.value)
                    }
                  }} 
                  placeholder="COFFEE JOURNAL"
                  className={inputStyle} 
                />
                {isProfileCompleted && isApproved && isNameChanged && (
                  <p className="text-[12px] font-medium text-amber-700 bg-amber-50/80 border border-amber-200 p-2.5 rounded-xl leading-relaxed animate-fade-in">
                    {t.nameChangeWarning}
                  </p>
                )}
              </div>
            </div>

            <div>
              <div className="mb-2">
                <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">
                  {t.labelCategories}<span className={requiredBadgeStyle}>{t.requiredBadge}</span>
                </label>
                <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{t.descCategories}</p>
              </div>
              <CategorySelector
                value={selectedCategories}
                onChange={setSelectedCategories}
                label=""
                description=""
                lang={currentLang}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-2.5">
                <div>
                  <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">{t.labelCurrentStore}</label>
                  <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{t.descCurrentStore}</p>
                </div>
                <input 
                  type="text" 
                  value={currentStore} 
                  onChange={(e) => setCurrentStore(e.target.value)} 
                  placeholder={t.placeholderCurrentStore}
                  className={inputStyle} 
                />
              </div>

              <div className="space-y-2.5">
                <PastStoresInput
                  stores={pastStores}
                  onChange={setPastStores}
                  label={t.labelPastStores}
                  description={t.descPastStores}
                  placeholder={t.placeholderPastStores}
                  addLabel={t.addStoreBtn}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <ProfileGearSelector value={selectedGearIds} onChange={setSelectedGearIds} lang={currentLang} />
            </div>

            <div className="space-y-2.5">
              <div>
                <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">{t.labelAwards}</label>
                <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{t.descAwards}</p>
              </div>
              <textarea 
                value={awards} 
                onChange={(e) => setAwards(e.target.value)} 
                rows={4} 
                placeholder={t.placeholderAwards} 
                className={`${inputStyle} leading-relaxed resize-y min-h-[100px]`} 
              />
            </div>
            
            <div className="space-y-2.5">
              <div>
                <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">
                  {t.labelBio}<span className={requiredBadgeStyle}>{t.requiredBadge}</span>
                </label>
                <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{t.descBio}</p>
              </div>
              <textarea 
                value={bio} 
                onChange={(e) => setBio(e.target.value)} 
                rows={5} 
                placeholder={t.placeholderBio} 
                className={`${inputStyle} leading-relaxed resize-y min-h-[120px]`} 
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-7 py-3.5 rounded-full text-[15px] tracking-wide transition-all duration-200 active:scale-[0.97] disabled:opacity-50"
              >
                {loading 
                  ? t.loading 
                  : !isProfileCompleted 
                    ? t.submitRequestButton 
                    : t.submitButton
                }
              </button>
            </div>
          </form>
        )}

        {activeTab === "calendar" && (
          <div className="space-y-10 w-full animate-fade-in pt-2">
            <div className="bg-neutral-50/40 border border-neutral-200/50 p-6 sm:p-10 rounded-xl">
              <MinimalCalendar 
                events={calendarItems} 
                isOwnProfile={true}
                editable={true}
                onDateClick={() => {}} 
                onEventDelete={() => {}}
                onEventUpdate={handleEventUpdate}
                lang={currentLang}
              />
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
