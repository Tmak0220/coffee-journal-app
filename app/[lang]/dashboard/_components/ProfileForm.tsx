"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import MinimalCalendar from "./MinimalCalendar"
import EventPostForm from "./EventPostForm"
import { useAppPopup } from "@/context/AppPopupContext"

type Props = {
  userId: string
  initialUsername: string | null
  initialDisplayName: string | null
  initialDisplayNameEn?: string | null 
  initialBio: string | null
  initialBioEn?: string | null         
  initialAvatarUrl?: string | null
  lang?: string
  onProfileCompleteChange?: (complete: boolean) => void
}

type StatusMessage = {
  text: string
  type: "success" | "error"
}

type CalendarEventItem = {
  id: string
  title: string
  event_date: string
  end_date?: string | null
  type: "report" | "memo"
  memo?: string | null
  visibility?: VisibilityType
}

type OriginEventOption = {
  id: string
  name?: string | null
  name_ja?: string | null
}

type VisibilityType = "draft" | "private" | "members" | "public"

const profileDict = {
  ja: {
    tabProfile: "プロフィール設定",
    tabCalendar: "カレンダー",
    tabEvent: "イベント投稿",
    title: "PROFILE INFO",
    descTitle: "アカウントの基本設定",
    labelUsername: "USERNAME",
    descUsername: "ユーザーネーム (半角英数字・ハイフン)",
    noticeUsername: "※ユーザーネームはあなたのプロフィールURLや識別子として使用されます。一度設定すると後から変更することはできません。",
    confirmUsernameChange: "ユーザーネームは一度確定すると変更できません。この内容で保存してもよろしいですか？",
    labelDisplayName: "DISPLAY NAME",
    descDisplayName: "表示名 (ニックネーム)",
    labelBio: "PROFILE",
    descBio: "プロフィール",
    placeholderBio: "自己紹介",
    loading: "処理中...",
    submitButton: "変更を保存する",
    successMessage: "プロフィールを更新しました。",
    errorMessage: (msg: string) => `保存に失敗しました: ${msg}`,
    formTypeMemo: "簡易メモを追加",
    formTypeReport: "イベントレポを投稿",
    labelGeneralTitle: "タイトル",
    placeholderMemoTitle: "コーヒー店に行く",
    placeholderReportTitle: "1日目レポート",
    labelReportSelect: "関連するイベント・個別ページ",
    placeholderReportSelect: "-- イベントページを選択してください --",
    labelStartDate: "開始日",
    labelEndDate: "終了日",
    placeholderDate: "年/月/日",
    labelGeneralBody: "メモ内容",
    placeholderMemoBody: "メモの詳細（任意）",
    placeholderReportBody: "メモを入力",
    labelImage: "カバー画像",
    labelVisibility: "公開設定",
    clearForm: "クリア",
    visDraft: "下書き",
    visPrivate: "非公開 (自分のみ)",
    visMembers: "限定公開 (会員のみ)",
    visPublic: "公開 (全員に公開)",
    submitCalendarForm: "投稿する"
  },
  en: {
    tabProfile: "Profile Settings",
    tabCalendar: "Calendar",
    tabEvent: "Event Post",
    title: "PROFILE INFO",
    descTitle: "Account Settings",
    labelUsername: "USERNAME",
    descUsername: "Username (Alphanumeric and hyphens)",
    noticeUsername: "* The username is used for your profile URL and identifier. Once set, it cannot be changed.",
    confirmUsernameChange: "The username cannot be changed once determined. Are you sure you want to save this?",
    labelDisplayName: "DISPLAY NAME",
    descDisplayName: "Display Name (Nickname)",
    labelBio: "PROFILE",
    descBio: "PROFILE",
    placeholderBio: "Self‐introduction",
    loading: "Processing...",
    submitButton: "Save Changes",
    successMessage: "Profile updated successfully.",
    errorMessage: (msg: string) => `Failed to save changes: ${msg}`,
    formTypeMemo: "Add Memo",
    formTypeReport: "Post Event Report",
    labelGeneralTitle: "Title",
    placeholderMemoTitle: "Go to a coffee shop",
    placeholderReportTitle: "Day 1 Report",
    labelReportSelect: "Related Event Page",
    placeholderReportSelect: "-- Please select an event page --",
    labelStartDate: "Start Date",
    labelEndDate: "End Date",
    placeholderDate: "yyyy-mm-dd",
    labelGeneralBody: "Memo",
    placeholderMemoBody: "Memo details (Optional)",
    placeholderReportBody: "Enter memo...",
    labelImage: "Cover Image",
    labelVisibility: "Visibility",
    clearForm: "Clear",
    visDraft: "Draft",
    visPrivate: "Private (Just me)",
    visMembers: "Members Only",
    visPublic: "Public (Everyone)",
    submitCalendarForm: "Submit"
  }
}

export default function ProfileForm({ 
  userId, 
  initialUsername, 
  initialDisplayName, 
  initialDisplayNameEn = "", 
  initialBio, 
  initialBioEn = "",         
  initialAvatarUrl = null,
  lang = "ja",
  onProfileCompleteChange,
}: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = profileDict[currentLang]
  const { confirmPopup } = useAppPopup()

  const [activeTab, setActiveTab] = useState<"profile" | "calendar" | "event">("profile")

  const [username, setUsername] = useState(initialUsername?.toLowerCase() || "")
  const [displayName, setDisplayName] = useState(currentLang === "en" ? (initialDisplayNameEn || "") : (initialDisplayName || ""))
  const [bio, setBio] = useState(currentLang === "en" ? (initialBioEn || "") : (initialBio || ""))
  
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  const [formType, setFormType] = useState<"memo" | "report">("memo")
  
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const [inputTitle, setInputTitle] = useState("")
  const [inputMemo, setInputMemo] = useState("")
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  
  const [eventOrigins, setEventOrigins] = useState<OriginEventOption[]>([])
  const [selectedEventOriginId, setSelectedEventOriginId] = useState("")
  const [visibility, setVisibility] = useState<VisibilityType>("draft")

  const [calendarItems, setCalendarItems] = useState<CalendarEventItem[]>([])
  const [formLoading, setFormLoading] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  const isUsernameDisabled = !!initialUsername

  useEffect(() => {
    setDisplayName(currentLang === "en" ? (initialDisplayNameEn || "") : (initialDisplayName || ""))
    setBio(currentLang === "en" ? (initialBioEn || "") : (initialBio || ""))
  }, [currentLang, initialDisplayName, initialDisplayNameEn, initialBio, initialBioEn])

  useEffect(() => {
    let isMounted = true

    async function initCalendarData() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && isMounted) {
        setIsAdmin(user.email === "rivu65622252@gmail.com")
      }
      
      const [{ data: memos }, { data: eventPosts }] = await Promise.all([
        supabase
          .from("calendar_memos")
          .select("id, title, start_date, end_date, memo, visibility")
          .eq("user_id", userId)
          .eq("lang", currentLang),
        supabase
          .from("posts")
          .select("id, title, event_date, end_date, description, visibility")
          .eq("user_id", userId)
          .eq("type", "event")
          .eq("lang", currentLang)
      ])

      const { data: originsData } = await supabase
        .from("origins")
        .select("id, name, name_ja")
        .eq("type", "event")
        .order("name", { ascending: true })

      if (isMounted) {
        if (originsData) setEventOrigins(originsData)
        const memoItems: CalendarEventItem[] = (memos || []).map(m => ({
            id: m.id, 
            title: m.title, 
            event_date: m.start_date, 
            end_date: m.end_date || null,
            memo: m.memo || null,
            visibility: m.visibility as VisibilityType,
            type: "memo"
          }))
        const reportItems: CalendarEventItem[] = (eventPosts || []).map(post => ({
          id: post.id,
          title: post.title || "Untitled",
          event_date: post.event_date,
          end_date: post.end_date || null,
          memo: post.description || null,
          visibility: post.visibility as VisibilityType,
          type: "report"
        }))
        setCalendarItems([...memoItems, ...reportItems])
      }
    }

    initCalendarData()
    return () => { isMounted = false }
  }, [userId, activeTab, currentLang])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isUsernameDisabled && username.trim()) {
      const confirmed = await confirmPopup({
        title: currentLang === "en" ? "Confirm your username" : "ユーザーネームの確認",
        message: currentLang === "en"
          ? `Your username will be used in your profile URL and cannot be changed after saving. Continue with “${username.trim()}”?`
          : `ユーザーネームはプロフィールURLに使用され、保存後は変更できません。「${username.trim()}」で確定しますか？`,
        confirmLabel: currentLang === "en" ? "Confirm" : "この名前で確定",
        cancelLabel: currentLang === "en" ? "戻る" : "戻る",
      })
      if (!confirmed) return
    }

    setLoading(true)
    setStatusMessage(null)

    const updatePayload: Record<string, any> = {
      username: username.trim().toLowerCase() || null,
    }

    if (currentLang === "en") {
      updatePayload.display_name_en = displayName.trim() || null
      updatePayload.bio_en = bio.trim() || null
    } else {
      updatePayload.display_name = displayName.trim() || null
      updatePayload.bio = bio.trim() || null
    }

    try {
      const { error } = await supabase
        .from("users")
        .update(updatePayload)
        .eq("id", userId)

      if (error) throw error
      onProfileCompleteChange?.(Boolean(username.trim() && (displayName.trim() || initialDisplayName?.trim())))
      setStatusMessage({ text: t.successMessage, type: "success" })
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (error: any) {
      setStatusMessage({ text: t.errorMessage(error.message), type: "error" })
    } finally {
      setLoading(false)
    }
  }

  const handleCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)
    
    if (!startDate) {
      setStatusMessage({ text: currentLang === "ja" ? "開始日を選択してください。" : "Please select a start date.", type: "error" })
      return
    }
    if (formType === "memo" && !inputTitle.trim()) {
      setStatusMessage({ text: currentLang === "ja" ? "タイトルを入力してください。" : "Please enter a title.", type: "error" })
      return
    }
    if (inputTitle.length > 40) {
      setStatusMessage({ text: currentLang === "ja" ? "タイトルは40文字以内で入力してください。" : "Title must be 40 characters or fewer.", type: "error" })
      return
    }
    if (inputMemo.length > 400) {
      setStatusMessage({ text: currentLang === "ja" ? "メモ内容は400文字以内で入力してください。" : "Memo must be 400 characters or fewer.", type: "error" })
      return
    }

    setFormLoading(true)

    try {
      if (formType === "memo") {
        const { data, error } = await supabase
          .from("calendar_memos")
          .insert({
            user_id: userId,
            title: inputTitle.trim(),
            start_date: startDate,
            end_date: endDate || null,
            memo: inputMemo.trim() || null,
            visibility: visibility,
            lang: currentLang 
          })
          .select()

        if (error) throw error
        if (data) {
          setCalendarItems(prev => [...prev, { 
            id: data[0].id, 
            title: data[0].title, 
            event_date: data[0].start_date, 
            end_date: data[0].end_date, 
            memo: data[0].memo || null,
            visibility: data[0].visibility as VisibilityType,
            type: "memo" 
          }])
        }
        setStatusMessage({ text: currentLang === "ja" ? "メモを登録しました。" : "Memo added.", type: "success" })
      }

      setInputTitle("")
      setInputMemo("")
      setStartDate("")
      setEndDate("")
      setSelectedEventOriginId("")
      setUploadedImages([])
      setVisibility("draft")
      setTimeout(() => setStatusMessage(null), 4000)
    } catch (error: any) {
      setStatusMessage({ text: `保存に失敗しました: ${error.message}`, type: "error" })
    } finally {
      setFormLoading(false)
    }
  }

  const inputStyle = "w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 text-neutral-900 focus:outline-none focus:border-neutral-400 focus:bg-white placeholder:text-neutral-400 transition-all duration-200 disabled:opacity-60 disabled:bg-neutral-100 disabled:cursor-not-allowed"

  return (
    <div key={currentLang} className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10" lang={currentLang}>
      
      <div className="flex border-b border-neutral-200/60 gap-7 sm:gap-8 select-none justify-start overflow-x-auto no-scrollbar">
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
        <button
          type="button"
          onClick={() => { setActiveTab("event"); setStatusMessage(null); }}
          className={`pb-4 text-[14px] font-medium tracking-wide whitespace-nowrap transition-all border-b-2 relative top-[1px] ${
            activeTab === "event" ? "border-neutral-900 text-neutral-900 font-semibold" : "border-transparent text-neutral-400 hover:text-neutral-600"
          }`}
        >
          {t.tabEvent}
        </button>
      </div>

      {activeTab === "profile" && (
        <div className="bg-white border border-neutral-200/60 pt-6 sm:pt-12 pb-10 sm:pb-16 px-6 sm:px-12 rounded-xl shadow-sm w-full space-y-12">
          <div>
            <h2 className="text-[18px] font-bold tracking-[0.05em] text-neutral-900 uppercase">{t.title}</h2>
            <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-400">{t.descTitle}</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-2.5">
                <div>
                  <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900">{t.labelUsername}</label>
                  <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{t.descUsername}</p>
                </div>
                <input 
                  type="text" 
                  value={username} 
                  onChange={(e) => setUsername(e.target.value.toLowerCase())} 
                  pattern="^[a-zA-Z0-9_\-]+$"
                  className={inputStyle} 
                  required 
                  disabled={isUsernameDisabled} 
                />
                <p className="text-[11px] leading-relaxed text-neutral-400 font-normal pt-1">
                  {t.noticeUsername}
                </p>
              </div>
              
              <div className="space-y-2.5">
                <div>
                  <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900">{t.labelDisplayName}</label>
                  <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{t.descDisplayName}</p>
                </div>
                <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputStyle} required />
              </div>
            </div>
            
            <div className="space-y-2.5">
              <div>
                <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900">{t.labelBio}</label>
                <p className="text-[12px] font-normal tracking-wide text-neutral-400 mt-0.5">{t.descBio}</p>
              </div>
              <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={5} placeholder={t.placeholderBio} className={`${inputStyle} leading-relaxed resize-y min-h-[120px]`} />
            </div>
            
            <div className="pt-2 space-y-4">
              {statusMessage && activeTab === "profile" && (
                <div className={`text-[13px] tracking-wide p-3.5 rounded-xl border w-full max-w-md ${
                  statusMessage.type === "error" 
                    ? "text-red-600 bg-red-50/40 border-red-200" 
                    : "text-neutral-700 bg-neutral-50/60 border-neutral-200"
                }`}>
                  {statusMessage.text}
                </div>
              )}

              <button type="submit" disabled={loading} className="bg-neutral-900 hover:bg-neutral-800 text-white font-medium px-7 py-3.5 rounded-full text-[15px] tracking-wide transition-all duration-200 active:scale-[0.97] disabled:opacity-50">
                {loading ? t.loading : t.submitButton}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "calendar" && (
        <div className="space-y-10 w-full">
          
          <div className="bg-white border border-neutral-200/60 p-6 sm:p-10 rounded-xl shadow-sm">
            <MinimalCalendar 
              events={calendarItems} 
              isOwnProfile={true}
              editable={true}
              onDateClick={(date) => setStartDate(date)}
              onEventDelete={(deletedId) => setCalendarItems(prev => prev.filter(item => item.id !== deletedId))}
              lang={currentLang}
            />
          </div>

          <form onSubmit={handleCalendarSubmit} className="bg-white border border-neutral-200/60 pt-10 pb-12 px-6 sm:px-12 rounded-xl shadow-sm space-y-9">
            <div className="space-y-9">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="space-y-2.5 md:col-span-6">
                  <label className="text-[13px] font-bold text-neutral-900 tracking-wide">
                    {t.labelGeneralTitle}
                  </label>
                  <input 
                    type="text" 
                    maxLength={40}
                    value={inputTitle} 
                    onChange={(e) => setInputTitle(e.target.value)} 
                    placeholder={t.placeholderMemoTitle} 
                    className={inputStyle} 
                  />
                </div>
                
                <div className="space-y-2.5 md:col-span-3 min-w-[150px]">
                  <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.labelStartDate}</label>
                  <input 
                    type={startDate ? "date" : "text"}
                    value={startDate} 
                    onChange={(e) => setStartDate(e.target.value)} 
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text" }}
                    placeholder={t.placeholderDate} 
                    className={inputStyle} 
                  />
                </div>

                <div className="space-y-2.5 md:col-span-3 min-w-[150px]">
                  <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.labelEndDate}</label>
                  <input 
                    type={endDate ? "date" : "text"}
                    value={endDate} 
                    onChange={(e) => setEndDate(e.target.value)} 
                    onFocus={(e) => (e.target.type = "date")}
                    onBlur={(e) => { if (!e.target.value) e.target.type = "text" }}
                    placeholder={t.placeholderDate} 
                    className={inputStyle} 
                  />
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[13px] font-bold text-neutral-900 tracking-wide">
                  {t.labelGeneralBody}
                </label>
                <textarea 
                  maxLength={400}
                  value={inputMemo} 
                  onChange={(e) => setInputMemo(e.target.value)} 
                  rows={5} 
                  placeholder={t.placeholderMemoBody} 
                  className={`${inputStyle} leading-relaxed resize-y`} 
                />
              </div>

              <div className="pt-2 space-y-3">
                <label className="text-[13px] font-bold text-neutral-900 tracking-wide block">{t.labelVisibility}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
                  {(["draft", "private", "members", "public"] as VisibilityType[]).map((type) => {
                    const labelMap = {
                      draft: t.visDraft,
                      private: t.visPrivate,
                      members: t.visMembers,
                      public: t.visPublic,
                    }
                    const isSelected = visibility === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setVisibility(type)}
                        className={`w-full px-3 py-3 text-[12px] sm:text-[13px] font-semibold rounded-xl border text-center transition-all duration-200 select-none flex items-center justify-center min-h-[46px] ${
                          isSelected
                            ? "bg-white border-neutral-900 text-neutral-900 shadow-sm ring-1 ring-neutral-900"
                            : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/50"
                        }`}
                      >
                        <span className="truncate">{labelMap[type]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {statusMessage && (
                <div
                  role="status"
                  aria-live="polite"
                  className={`text-[13px] tracking-wide p-4 rounded-xl border w-full text-center ${
                    statusMessage.type === "error"
                      ? "text-red-700 bg-red-50 border-red-200"
                      : "text-emerald-700 bg-emerald-50 border-emerald-200"
                  }`}
                >
                  {statusMessage.text}
                </div>
              )}

              <div className="pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-t border-neutral-100">
                <div>
                  {(inputTitle || startDate || endDate || inputMemo) ? (
                    <button 
                      type="button" 
                      onClick={() => { setInputTitle(""); setInputMemo(""); setStartDate(""); setEndDate(""); setVisibility("draft"); }} 
                      className="text-neutral-400 hover:text-neutral-600 text-[14px] font-medium tracking-wide transition-colors duration-200"
                    >
                      {t.clearForm}
                    </button>
                  ) : <div />}
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white font-semibold px-8 py-3.5 rounded-full text-[15px] tracking-wide transition-all duration-200 shadow-sm hover:shadow active:scale-[0.97] disabled:opacity-50 text-center"
                >
                  {formLoading ? t.loading : t.submitCalendarForm}
                </button>
              </div>

            </div>
          </form>

        </div>
      )}

      {activeTab === "event" && (
        <div className="w-full">
          <EventPostForm
            userId={userId}
            lang={currentLang}
            isAdmin={isAdmin}
            onSuccess={() => setActiveTab("calendar")}
          />
        </div>
      )}
    </div>
  )
}