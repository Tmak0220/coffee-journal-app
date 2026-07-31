"use client"

import React, { useState, useEffect, useCallback, useRef, useMemo } from "react"
import { supabase } from "@/lib/supabase"
import MediaUpload from "./MediaUpload"
import MinimalCalendar from "./MinimalCalendar"
import SocialLinksInput from "./SocialLinksInput"
import BranchLocationsInput, { BranchLocation } from "./BranchLocationsInput"
import ProfileGearSelector from "./ProfileGearSelector"

type LinkItem = {
  label: string
  url: string
}

type Props = {
  userId: string // users.id（UUID）
  initialOriginId?: number | null
  initialSlug?: string | null
  initialUsername: string | null
  initialDisplayName: string | null
  initialDisplayNameEn?: string | null
  initialBio: string | null
  initialBioEn?: string | null
  initialAvatarUrl: string | null
  initialCoverUrl: string | null
  initialHeadquarters?: BranchLocation | null
  initialHeadquartersEn?: BranchLocation | null
  initialBranches?: BranchLocation[] | null
  initialBranchesEn?: BranchLocation[] | null
  initialLinks?: LinkItem[] | null
  initialGearIds?: number[]
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

type CalendarEventItem = {
  id: string
  title: string
  event_date: string
  start_date: string
  end_date: string
  type: "report" | "memo"
  memo?: string | null
}

type VisibilityType = "draft" | "private" | "members" | "public"
type OwnerOriginType = "market" | "source" | "event"

type OriginSuggestion = {
  id: string
  slug: string
  name: string
  name_ja?: string | null
  display_name?: string | null
  display_name_en?: string | null
  type?: string | null
  search_keywords?: string[] | string | null
}

const profileDict = {
  ja: {
    tabProfile: "プロフィール設定",
    tabCalendar: "スケジュールカレンダー",
    labelUsername: "BRAND URL / USERNAME",
    descUsername: "ユーザーネーム（origins/以降のURLになります。半角英数字・ハイフン・アンダースコアのみ）",
    noteUsername: "※ブランドURL・ユーザーネームはこのページからは変更できません。変更をご希望の場合は運営サポートまでお問い合わせください。",
    labelDisplayName: "BRAND NAME",
    descDisplayName: "公開表示名 (入力すると登録済みの店舗・ブランドがサジェストされます)",
    labelBio: "BRAND BIO",
    descBio: "ストーリー",
    placeholderBio: "ブランドのコンセプト、店舗の歴史などをご記入ください",
    labelHeadquarters: "ヘッドクオーター",
    descHeadquarters: "本拠地・本店（現在お店を持っている方はすべての項目を入力してください。お店を持っていない方は、これまで関わった、または今後予定している店舗名のみ入力してください）",
    placeholderHeadquarters: "COFFEE ROASTERY",
    labelBranches: "ブランチ",
    descBranches: "支店・支部（複数追加できます）",
    placeholderBranchName: "店舗名",
    placeholderBranchAddress: "住所",
    placeholderBranchHours: "営業時間",
    placeholderBranchPhone: "電話番号",
    placeholderBranchEmail: "メールアドレス",
    addBranchBtn: "+ ブランチを追加", 
    labelLinks: "公式リンク・SNS",
    descLinks: "ウェブサイト、オンラインショップ、SNSのアカウントURLを追加してください（複数追加できます）",
    placeholderLinkLabel: "ラベル (例: 公式HP, オンラインショップ, X)",
    placeholderLinkUrl: "URL",
    addLinkBtn: "+ リンクを追加",
    loading: "処理中...",
    submitButton: "変更を申請",
    submitRequestButton: "プロフィールを確定して運営に利用申請を送る",
    successMessage: "プロフィールの変更申請を送信しました。運営の承認をお待ちください。",
    successRequestMessage: "プロフィールの登録と利用申請が完了しました。運営の承認をお待ちください。",
    errorMessage: (msg: string) => `保存に失敗しました: ${msg}`,
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
    clearForm: "クリア",
    selectedExistingStore: "選択中: 登録済みの既存店舗に紐付けリクエストします",
    createNewStore: "※ 新規店舗として申請します（既存店舗がある場合は候補から選択してください）",
    exactMatchWarning: "⚠️ まったく同じ名前の店舗・ブランドがすでに登録されています。既存店舗への紐付けでないかご確認ください。",
    prefixMatchWarning: "⚠️ 類似する名前の店舗・ブランドが登録されています。重複登録にご注意ください。",
    deselectStore: "選択を解除",
    requiredBadge: "（必須）",
    validationError: "申請には、BRAND NAME、ヘッドクオーター（本拠地・本店）の店舗名、BRAND BIOの入力が必須です。",
    viewPublicPage: "公開ページを確認する ↗",
    nameChangeWarning: "表示名を変更すると、反映には運営の再承認が必要になります。変更しますか？",
    labelOriginType: "カテゴリー",
    originTypeMarket: "店舗・ブランド",
    originTypeSource: "産地・生産者",
    originTypeEvent: "イベント"
  },
  en: {
    tabProfile: "Profile Settings",
    tabCalendar: "Schedule Calendar",
    labelUsername: "BRAND URL / USERNAME",
    descUsername: "Username (This will be the URL after origins/. Alphanumeric, hyphens, and underscores only)",
    noteUsername: "* Brand URL and username cannot be changed from this page. Please contact support to request a change.",
    labelDisplayName: "BRAND NAME",
    descDisplayName: "Display Name (Search and select existing brand/shop or type a new one)",
    labelBio: "BRAND BIO",
    descBio: "Our Story",
    placeholderBio: "Write about your brand concept, shop history, etc.",
    labelHeadquarters: "HEADQUARTERS",
    descHeadquarters: "Head Office / Main Store (If you currently operate a shop, please complete every field. If you do not have a shop, enter only the name of a shop you have previously been involved with or plan to open in the future.)",
    placeholderHeadquarters: "COFFEE ROASTERY",
    labelBranches: "BRANCHES",
    descBranches: "Branches / Offices (Multiple entries allowed)",
    placeholderBranchName: "Branch Name",
    placeholderBranchAddress: "Address",
    placeholderBranchHours: "Opening Hours",
    placeholderBranchPhone: "Phone",
    placeholderBranchEmail: "Email",
    addBranchBtn: "+ Add Branch", 
    labelLinks: "Official Links & SNS",
    descLinks: "Add URLs for your website, online shop, or social media accounts (multiple entries allowed)",
    placeholderLinkLabel: "Label (e.g., Website, Online Store, X)",
    placeholderLinkUrl: "URL",
    addLinkBtn: "+ Add Link",
    loading: "Processing...",
    submitButton: "Submit Changes for Review",
    submitRequestButton: "Confirm Profile & Submit Application to the Team",
    successMessage: "Your profile change request has been submitted. Please wait for approval from the team.",
    successRequestMessage: "Your profile and application have been submitted. Please wait for approval from the team.",
    errorMessage: (msg: string) => `Failed to save: ${msg}`,
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
    clearForm: "Clear",
    selectedExistingStore: "Selected: Will request to claim this existing store",
    createNewStore: "* Will be requested as a new store (Please check if your store is listed above)",
    exactMatchWarning: "⚠️ An exact matching brand already exists. Please verify if you meant to claim it.",
    prefixMatchWarning: "⚠️ Similar brands exist. Please avoid creating duplicate listings.",
    deselectStore: "Deselect",
    requiredBadge: "(Required)",
    validationError: "BRAND NAME, the headquarters store name, and BRAND BIO are required to submit your application.",
    viewPublicPage: "View Public Page ↗",
    nameChangeWarning: "Changing your Display Name requires re-approval from administrators. Are you sure you want to change it?",
    labelOriginType: "CATEGORY",
    originTypeMarket: "Shop / Brand",
    originTypeSource: "Source / Producer",
    originTypeEvent: "Event"
  }
}

const emptyLocation: BranchLocation = { name: "", address: "", hours: "", phone: "", email: "" }

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "object" && error !== null && "message" in error) {
    const supabaseError = error as {
      message: unknown
      code?: unknown
      details?: unknown
      hint?: unknown
    }
    return [
      supabaseError.message,
      supabaseError.code ? `code: ${supabaseError.code}` : null,
      supabaseError.details ? `details: ${supabaseError.details}` : null,
      supabaseError.hint ? `hint: ${supabaseError.hint}` : null
    ].filter(Boolean).join(" / ")
  }
  return String(error)
}

// 💡 店舗名（表示用）の決定ロジック：name / name_ja を最優先
function getStoreDisplayName(item: OriginSuggestion, lang: string): string {
  if (lang === "en") {
    return item.name || item.display_name_en || item.display_name || item.slug
  }
  return item.name_ja || item.name || item.display_name || item.slug
}

export default function OwnerProfileForm({ 
  userId, 
  initialOriginId = null,
  initialSlug = null,
  initialUsername, 
  initialDisplayName, 
  initialDisplayNameEn = "", 
  initialBio,
  initialBioEn = "", 
  initialAvatarUrl,
  initialCoverUrl,
  initialHeadquarters = null,
  initialHeadquartersEn = null, 
  initialBranches = [],
  initialBranchesEn = [], 
  initialLinks = [],
  initialGearIds = [],
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
  const [isApproved, setIsApproved] = useState(initialIsApproved)
  const [isProfileCompleted, setIsProfileCompleted] = useState(initialIsProfileCompleted)
  const [isPublic, setIsPublic] = useState(initialIsPublic)

  const username = initialUsername?.toLowerCase() || ""

  const [displayName, setDisplayName] = useState(currentLang === "en" ? (initialDisplayNameEn || "") : (initialDisplayName || ""))
  const isNameChanged = displayName !== (currentLang === "en" ? (initialDisplayNameEn || "") : (initialDisplayName || ""))
  const [bio, setBio] = useState(currentLang === "en" ? (initialBioEn || "") : (initialBio || ""))
  const [headquarters, setHeadquarters] = useState<BranchLocation>(currentLang === "en" ? (initialHeadquartersEn || emptyLocation) : (initialHeadquarters || emptyLocation))
  const [branches, setBranches] = useState<BranchLocation[]>(currentLang === "en" ? (initialBranchesEn || []) : (initialBranches || []))
  
  const [links, setLinks] = useState<LinkItem[]>(initialLinks || [])
  const [selectedGearIds, setSelectedGearIds] = useState<number[]>(initialGearIds)
  const initialGearIdsKey = initialGearIds.join(",")

  // サジェスト＆選択関連ステート
  const [suggestions, setSuggestions] = useState<OriginSuggestion[]>([])
  const [selectedOrigin, setSelectedOrigin] = useState<OriginSuggestion | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const statusTimerRef = useRef<NodeJS.Timeout | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [scheduleTitle, setScheduleTitle] = useState("")
  const [visibility, setVisibility] = useState<VisibilityType>("draft")
  const [originType, setOriginType] = useState<OwnerOriginType>("market")

  const [calendarItems, setCalendarItems] = useState<CalendarEventItem[]>([])
  const [formLoading, setFormLoading] = useState(false)

  const branchesKey = JSON.stringify(currentLang === "en" ? initialBranchesEn : initialBranches)
  const hqKey = JSON.stringify(currentLang === "en" ? initialHeadquartersEn : initialHeadquarters)

  const setTemporaryStatusMessage = useCallback((msg: StatusMessage, durationMs = 4000) => {
    if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    setStatusMessage(msg)
    if (msg.type === "error") return
    statusTimerRef.current = setTimeout(() => {
      setStatusMessage(null)
    }, durationMs)
  }, [])

  useEffect(() => {
    if (initialGearIds.length > 0) {
      setSelectedGearIds(initialGearIds)
      return
    }
    supabase.from("profile_gears").select("gear_id").eq("user_id", userId).eq("profile_type", "owner").then(({ data, error }) => {
      if (error) console.error("Failed to load owner profile gears:", error)
      else setSelectedGearIds((data || []).map((item) => item.gear_id))
    })
  }, [userId, initialGearIdsKey])

  useEffect(() => {
    const query = displayName.trim()
    if (isProfileCompleted || !query || query.length < 1) {
      setSuggestions([])
      setIsSearching(false)
      setHighlightedIndex(-1)
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      try {
        const sanitizedQuery = query.replace(/[%_]/g, "\\$&")
        // name_ja は search_keywords の型に影響されないよう独立して検索する
        const { data: textData, error: textError } = await supabase
          .from("origins")
          .select("id, slug, name, name_ja, display_name, type, search_keywords")
          .in("type", ["market", "source", "event"])
          .or(`user_id.is.null,user_id.eq.${userId}`)
          .ilike("name_ja", `%${sanitizedQuery}%`)
          .limit(8)

        if (textError) {
          console.error("Supabase text search error details:", JSON.stringify(textError, null, 2))
        }

        // 2. search_keywords カラムでの検索
        const { data: kwData, error: kwError } = await supabase
          .from("origins")
          .select("id, slug, name, name_ja, display_name, type, search_keywords")
          .in("type", ["market", "source", "event"])
          .or(`user_id.is.null,user_id.eq.${userId}`)
          .ilike("search_keywords", `%${sanitizedQuery}%`)
          .limit(8)

        if (kwError) {
          // search_keywords が text[] (配列型) の場合のフォールバック検索
          const { data: kwArrayData } = await supabase
            .from("origins")
            .select("id, slug, name, name_ja, display_name, type, search_keywords")
            .in("type", ["market", "source", "event"])
            .or(`user_id.is.null,user_id.eq.${userId}`)
            .filter("search_keywords", "cs", `{${query}}`)
            .limit(8)

          if (kwArrayData) {
            const combined = [...(textData || []), ...kwArrayData]
            const uniqueMap = new Map<string, OriginSuggestion>()
            combined.forEach(item => uniqueMap.set(item.id, item as OriginSuggestion))
            setSuggestions(Array.from(uniqueMap.values()).slice(0, 8))
            return
          }
        }

        // 3. 検索結果の結合と重複排除
        const combined = [...(textData || []), ...(kwData || [])]
        const uniqueMap = new Map<string, OriginSuggestion>()
        combined.forEach(item => uniqueMap.set(item.id, item as OriginSuggestion))
        
        setSuggestions(Array.from(uniqueMap.values()).slice(0, 8))
        setHighlightedIndex(-1)

      } catch (e) {
        console.error("Error searching origins:", e)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [displayName, userId])

  // ⚠️ 完全一致・前方一致の判定ロジック
  const matchStatus = useMemo(() => {
    if (selectedOrigin || !displayName.trim() || suggestions.length === 0) {
      return null
    }

    const target = displayName.trim().toLowerCase()

    let hasExact = false
    let hasPrefix = false

    for (const s of suggestions) {
      const names = [s.name_ja, s.name, s.display_name, s.display_name_en]
        .filter((n): n is string => Boolean(n))
        .map(n => n.toLowerCase())

      if (names.some(n => n === target)) {
        hasExact = true
        break
      }
      if (names.some(n => n.startsWith(target))) {
        hasPrefix = true
      }
    }

    if (hasExact) return "exact"
    if (hasPrefix) return "prefix"
    return null
  }, [displayName, suggestions, selectedOrigin])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleKeyDownDisplayName = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1))
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault()
      const selected = suggestions[highlightedIndex]
      if (selected) {
        const displayTitle = getStoreDisplayName(selected, currentLang)
        setDisplayName(displayTitle)
        setSelectedOrigin(selected)
        if (selected.type === "market" || selected.type === "source" || selected.type === "event") {
          setOriginType(selected.type)
        }
        setShowSuggestions(false)
      }
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
    }
  }

  useEffect(() => {
    setAvatarUrl(initialAvatarUrl)
    setCoverUrl(initialCoverUrl)
    committedAvatarUrlRef.current = initialAvatarUrl
    committedCoverUrlRef.current = initialCoverUrl
    setDisplayName(currentLang === "en" ? (initialDisplayNameEn || "") : (initialDisplayName || ""))
    setBio(currentLang === "en" ? (initialBioEn || "") : (initialBio || ""))
    setHeadquarters(currentLang === "en" ? (initialHeadquartersEn || emptyLocation) : (initialHeadquarters || emptyLocation))
    setBranches(currentLang === "en" ? (initialBranchesEn || []) : (initialBranches || []))
    setLinks(initialLinks || [])
    setIsApproved(initialIsApproved)
    setIsProfileCompleted(initialIsProfileCompleted)
    setIsPublic(initialIsPublic)
  }, [
    currentLang,
    initialDisplayName,
    initialDisplayNameEn,
    initialBio,
    initialBioEn,
    initialAvatarUrl,
    initialCoverUrl,
    initialLinks,
    branchesKey,
    hqKey,
    initialIsApproved,
    initialIsProfileCompleted,
    initialIsPublic
  ])

  const handleHqChange = (field: keyof BranchLocation, value: string) => {
    setHeadquarters(prev => ({ ...prev, [field]: value }))
  }

  const refreshCalendarData = useCallback(async () => {
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
  }, [userId, currentLang])

  useEffect(() => {
    if (activeTab === "calendar") {
      refreshCalendarData()
    }
    return () => setStatusMessage(null)
  }, [activeTab, refreshCalendarData])

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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage(null)

    if (!displayName.trim() || !headquarters.name.trim() || !bio.trim()) {
      setStatusMessage({ text: t.validationError, type: "error" })
      setLoading(false)
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    try {
      const filteredLinks = links.filter(l => l.url.trim() !== "")
      const filteredBranches = branches.filter(b => b.name.trim() !== "")

      if (!isProfileCompleted) {
        const { error: userUpdateError } = await supabase
          .from("users")
          .update({ avatar_url: avatarUrl, cover_url: coverUrl })
          .eq("id", userId)
        if (userUpdateError) throw userUpdateError
      }

      const existingOriginId = initialOriginId
      let resolvedOriginId: number | null = existingOriginId

      const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() }
      if (!isProfileCompleted) updatePayload.links = filteredLinks

      if (!isProfileCompleted) {
        updatePayload.is_profile_completed = true
        updatePayload.is_approved = false
        updatePayload.is_public = false
      }

      let hasNameChanged = false
      let requestedJa: string | null = null
      let requestedEn: string | null = null

      if (currentLang === "en") {
        const nextDisplayNameEn = displayName.trim() || null
        if (nextDisplayNameEn !== (initialDisplayNameEn || null)) {
          hasNameChanged = true
          requestedEn = nextDisplayNameEn
          updatePayload.pending_display_name_en = nextDisplayNameEn
        }
        if (!isProfileCompleted) {
          updatePayload.bio_en = bio.trim() || null
          updatePayload.headquarters_en = headquarters
          updatePayload.branches_en = filteredBranches
        }
      } else {
        const nextDisplayNameJa = displayName.trim() || null
        if (nextDisplayNameJa !== (initialDisplayName || null)) {
          hasNameChanged = true
          requestedJa = nextDisplayNameJa
          updatePayload.pending_display_name = nextDisplayNameJa
        }
        if (!isProfileCompleted) {
          updatePayload.bio = bio.trim() || null
          updatePayload.headquarters = headquarters
          updatePayload.branches = filteredBranches
        }
      }

      // 初回申請では既存値との比較にかかわらず、承認前の名称を必ず pending へ保存する。
      if (!isProfileCompleted) {
        if (currentLang === "en") {
          requestedEn = displayName.trim()
          updatePayload.pending_display_name_en = requestedEn
        } else {
          requestedJa = displayName.trim()
          updatePayload.pending_display_name = requestedJa
        }
      }

      if (!isProfileCompleted && (hasNameChanged || selectedOrigin)) {
        updatePayload.is_approved = false
        updatePayload.is_public = false
      }

      if (!isProfileCompleted) {
        const applicationStatePayload = {
          updated_at: new Date().toISOString(),
          is_profile_completed: true,
          is_approved: false,
          is_public: false
        }

        if (selectedOrigin) {
          resolvedOriginId = Number(selectedOrigin.id)
          const { error: originError } = await supabase
            .from("origins")
            .update(applicationStatePayload)
            .eq("id", selectedOrigin.id)

          if (originError) throw originError
        } else {
          // 見送り済み申請のフォーム復元時には、以前選択した既存店舗のIDが
          // initialOriginId に残る場合がある。入力名と一致する審査用レコードだけ再利用する。
          let reusableOriginId: number | null = null
          if (existingOriginId !== null) {
            const { data: existingOrigin, error: existingOriginError } = await supabase
              .from("origins")
              .select("id, name, name_ja, display_name, display_name_en, user_id, is_approved, is_public")
              .eq("id", existingOriginId)
              .maybeSingle()
            if (existingOriginError) throw existingOriginError

            const requestedName = displayName.trim().toLocaleLowerCase()
            const existingNames = [
              existingOrigin?.name,
              existingOrigin?.name_ja,
              existingOrigin?.display_name,
              existingOrigin?.display_name_en,
            ]
              .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
              .map((value) => value.trim().toLocaleLowerCase())

            if (
              existingOrigin &&
              existingNames.includes(requestedName) &&
              !existingOrigin.user_id &&
              !existingOrigin.is_approved &&
              !existingOrigin.is_public
            ) {
              reusableOriginId = existingOrigin.id
            }
          }

          if (reusableOriginId !== null) {
            const { data: updatedOrigin, error: originError } = await supabase
              .from("origins")
              .update(applicationStatePayload)
              .eq("id", reusableOriginId)
              .select("id")
              .single()
            if (originError) throw originError
            resolvedOriginId = updatedOrigin.id
          } else {
          const normalizedSlug = displayName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
          const { data: insertedOrigin, error: originError } = await supabase
            .from("origins")
            .insert({
              ...applicationStatePayload,
              user_id: userId,
              slug: normalizedSlug || displayName.trim(),
              name: displayName.trim(),
              name_ja: currentLang === "ja" ? displayName.trim() : null,
              search_keywords: displayName.trim(),
              type: originType
            })
            .select("id")
            .single()

          if (originError) throw originError
          resolvedOriginId = insertedOrigin.id
          }
        }
      } else {
        const { error } = await supabase
          .from("origins")
          .update(updatePayload)
          .eq("user_id", userId)

        if (error) throw error
      }

      if (!isProfileCompleted) {
        const isNewOriginApplication = !selectedOrigin
        const { data: createdApplication, error: notifyError } = await supabase
          .from("admin_notifications")
          .insert({
            user_id: userId,
            type: isNewOriginApplication ? "new_owner_profile_activation" : "claim_origin",
            requested_display_name: requestedJa || displayName.trim(),
            requested_display_name_en: requestedEn,
            request_payload: {
              profile_type: "owner",
              application_kind: isNewOriginApplication ? "new_origin" : "claim_origin",
              is_new_origin: isNewOriginApplication,
              lang: currentLang,
              username: initialUsername,
              origin_id: resolvedOriginId,
              origin_type: originType,
              display_name: displayName.trim(),
              bio: bio.trim() || null,
              headquarters,
              branches: filteredBranches,
              links: filteredLinks,
              gear_ids: selectedGearIds,
              avatar_url: avatarUrl,
              cover_url: coverUrl,
            },
            status: "pending"
          })
          .select("id")
          .single()

        if (notifyError) throw notifyError
        const pendingLinkResponse = await fetch("/api/owner-profile-application/pending-link", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ requestId: createdApplication.id }),
        })
        if (!pendingLinkResponse.ok) {
          const result = await pendingLinkResponse.json().catch(() => null)
          throw new Error(result?.error || "申請中の所有者情報を整理できませんでした。")
        }

        onAccessStatusChange?.(false)
        setIsApproved(false)
        setIsPublic(false)
        setIsProfileCompleted(true)
      } else {
        const { error: notificationError } = await supabase
          .from("admin_notifications")
          .insert({
            user_id: userId,
            type: "owner_display_name_change",
            requested_display_name: requestedJa || displayName.trim(),
            requested_display_name_en: requestedEn,
            request_payload: {
              profile_type: "owner",
              lang: currentLang,
              username: initialUsername,
              origin_id: resolvedOriginId,
              origin_type: originType,
              display_name: displayName.trim(),
              bio: bio.trim() || null,
              headquarters,
              branches: filteredBranches,
              links: filteredLinks,
              gear_ids: selectedGearIds,
              avatar_url: avatarUrl,
              cover_url: coverUrl,
            },
            status: "pending"
          })

        if (notificationError) throw notificationError

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
        if (!response.ok) console.error("Failed to delete replaced owner profile image from R2:", url)
      }))
      committedAvatarUrlRef.current = avatarUrl
      committedCoverUrlRef.current = coverUrl

      setTemporaryStatusMessage({
        text: !isProfileCompleted ? t.successRequestMessage : t.successMessage,
        type: "success"
      })
      window.scrollTo({ top: 0, behavior: "smooth" })

    } catch (error: unknown) {
      setTemporaryStatusMessage({ text: t.errorMessage(getErrorMessage(error)), type: "error" })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } finally {
      setLoading(false)
    }
  }

  const handleCalendarSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatusMessage(null)

    if (!startDate) {
      setStatusMessage({ 
        text: currentLang === "ja" ? "開始日を選択してください。" : "Please select a start date.", 
        type: "error" 
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (!scheduleTitle.trim()) {
      setStatusMessage({ 
        text: currentLang === "ja" ? "スケジュール名を入力してください。" : "Please enter a schedule name.", 
        type: "error" 
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    if (scheduleTitle.length > 40) {
      setStatusMessage({
        text: currentLang === "ja" ? "タイトルは40文字以内で入力してください。" : "Title must be 40 characters or fewer.",
        type: "error"
      })
      return
    }

    setFormLoading(true)

    try {
      const start = new Date(startDate)
      const end = endDate ? new Date(endDate) : new Date(startDate)
      
      if (end < start) {
        setStatusMessage({ 
          text: currentLang === "ja" ? "終了日は開始日以降の日付を選択してください。" : "End date must be after the start date.", 
          type: "error" 
        })
        setFormLoading(false)
        return
      }

      const { error } = await supabase
        .from("calendar_memos")
        .insert({
          user_id: userId,
          title: scheduleTitle.trim(),
          start_date: startDate,
          end_date: endDate || startDate,
          memo: null,
          visibility: visibility,
          lang: currentLang 
        })

      if (error) throw error

      await refreshCalendarData()

      setTemporaryStatusMessage({ 
        text: currentLang === "ja" ? "スケジュールをカレンダーに登録しました。" : "Schedule saved to calendar.", 
        type: "success" 
      })

      setScheduleTitle("")
      setStartDate("")
      setEndDate("")
      setVisibility("draft")
    } catch (error: unknown) {
      setStatusMessage({ 
        text: currentLang === "ja" ? `保存に失敗しました: ${getErrorMessage(error)}` : `Failed to save: ${getErrorMessage(error)}`, 
        type: "error" 
      })
    } finally {
      setFormLoading(false)
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
              ? "オーナー会員プロフィールは未申請です。プロフィールを入力し、運営へ利用申請を送信してください。"
              : "Your owner profile has not been submitted. Please complete your profile and submit an application to the team."}
          </div>
        ) : !isApproved || !isPublic ? (
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-600 text-[13px] leading-relaxed">
            {currentLang === "ja"
              ? "現在、運営にてプロフィールの確認および登録審査を行っております。承認が完了するまでしばらくお待ちください。"
              : "Your profile and access request are currently under review by the team. Thank you for your patience."}
          </div>
        ) : (
          <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 text-neutral-600 text-[13px] leading-relaxed">
            {currentLang === "ja"
              ? "オーナー会員アカウントが承認されています。すべての投稿フォームと機能をご利用いただけます。※プロフィール内容を今後変更する際は、都度運営への再申請と承認が必要になります。"
              : "Your owner account has been approved. All post forms and features are fully accessible. *Any future profile changes will require re-application and approval by the team."}
          </div>
        )}
      </div>
      <div className="w-full space-y-10 rounded-2xl border border-neutral-200 bg-white px-5 pb-10 pt-6 shadow-sm animate-fade-in sm:px-8 sm:pb-12 sm:pt-10">
        
        <div className="space-y-10">
          <div className="w-full">
            <MediaUpload
              userId={userId}
              type="cover"
              initialUrl={initialCoverUrl}
              onUploaded={(url) => setCoverUrl(url)}
              label={currentLang === "en" ? "Upload Cover Image" : "カバー画像をアップロード"}
              lang={currentLang}
            />
          </div>

          <div className="w-full">
            <MediaUpload
              userId={userId}
              type="avatar"
              initialUrl={initialAvatarUrl}
              onUploaded={(url) => setAvatarUrl(url)}
              label={currentLang === "en" ? "Set Avatar Image" : "アバター画像を設定"}
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

              {/* USERNAME */}
              <div className="space-y-1.5 w-full">
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-[14px] font-mono font-medium text-neutral-400 select-none">
                    origins/
                  </span>
                  <input 
                    type="text" 
                    value={username} 
                    readOnly
                    className={`${inputStyle} pl-[88px] font-mono text-neutral-500 bg-neutral-100/70 cursor-not-allowed select-none`}
                    placeholder="bluepine-roasters"
                  />
                </div>
                <p className="text-[11px] text-neutral-400/90 leading-normal px-1">
                  {t.noteUsername}
                </p>
                {isProfileCompleted && isApproved && isPublic && initialSlug ? (
                  <a
                    href={`/${currentLang}/origins/${initialSlug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block text-[12px] font-semibold text-neutral-600 underline underline-offset-2 transition-colors hover:text-neutral-900"
                  >
                    {t.viewPublicPage}
                  </a>
                ) : (
                  <span className="block text-[12px] text-neutral-300">
                    {t.viewPublicPage} ({currentLang === "ja" ? "未承認" : "Pending"})
                  </span>
                )}
              </div>

              {/* BRAND NAME & SEARCH SUGGESTIONS */}
              <div ref={dropdownRef} className="relative w-full space-y-1.5">
                <div className="relative flex items-center">
                  <input 
                    type="text" 
                    value={displayName} 
                    onChange={(e) => {
                      setDisplayName(e.target.value)
                      setSelectedOrigin(null)
                      setShowSuggestions(!isProfileCompleted)
                    }} 
                    onFocus={() => setShowSuggestions(!isProfileCompleted)}
                    onKeyDown={handleKeyDownDisplayName}
                    placeholder="Blue Pine Coffee"
                    className={`${inputStyle} pr-10 transition-all duration-300 ${
                      selectedOrigin 
                        ? "border-emerald-500 bg-emerald-50/20 text-emerald-950 font-semibold ring-1 ring-emerald-500" 
                        : matchStatus === "exact"
                        ? "border-red-400 bg-red-50/20 ring-1 ring-red-400"
                        : matchStatus === "prefix"
                        ? "border-amber-400 bg-amber-50/20 ring-1 ring-amber-400"
                        : ""
                    }`} 
                    required
                    aria-expanded={showSuggestions && suggestions.length > 0}
                    aria-autocomplete="list"
                  />
                  {isSearching && (
                    <span className="absolute right-3 text-[11px] text-neutral-400 font-mono animate-pulse">
                      ...
                    </span>
                  )}

                  {selectedOrigin && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrigin(null)
                        setShowSuggestions(true)
                      }}
                      className="absolute right-3 text-[11px] font-mono font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded-md transition-colors"
                    >
                      ✕ {t.deselectStore}
                    </button>
                  )}
                </div>
                {isProfileCompleted && isApproved && isNameChanged && (
                  <p className="rounded-xl border border-amber-200 bg-amber-50/80 p-2.5 text-[12px] font-medium leading-relaxed text-amber-700 animate-fade-in">
                    {t.nameChangeWarning}
                  </p>
                )}

                {/* 💡 ビジュアル切替: サジェスト選択時 */}
                {selectedOrigin ? (
                  <div className="flex items-center gap-2 px-1 py-1 text-[12px] text-emerald-700 bg-emerald-50/80 rounded-lg border border-emerald-200/80 animate-fade-in">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-semibold">{t.selectedExistingStore}</span>
                    <span className="text-[11px] font-mono text-emerald-600">({selectedOrigin.slug})</span>
                  </div>
                ) : matchStatus === "exact" ? (
                  /* ⚠️ 完全一致警告表示 */
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[12px] font-medium space-y-1 animate-fade-in">
                    <p>{t.exactMatchWarning}</p>
                  </div>
                ) : matchStatus === "prefix" ? (
                  /* ⚠️ 前方一致警告表示 */
                  <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[12px] font-medium space-y-1 animate-fade-in">
                    <p>{t.prefixMatchWarning}</p>
                  </div>
                ) : displayName ? (
                  <p className="text-[11px] text-neutral-400 px-1">
                    {t.createNewStore}
                  </p>
                ) : null}

                {/* サジェストドロップダウン */}
                {showSuggestions && suggestions.length > 0 && !selectedOrigin && (
                  <div 
                    role="listbox"
                    className="absolute left-0 right-0 mt-1 bg-white border border-neutral-200 shadow-xl rounded-xl overflow-hidden z-30 max-h-[240px] overflow-y-auto"
                  >
                    {suggestions.map((item, idx) => {
                      // 💡 name_ja / name を最優先で取得
                      const displayTitle = getStoreDisplayName(item, currentLang)
                      const isHighlighted = idx === highlightedIndex

                      return (
                        <button
                          key={item.id}
                          type="button"
                          role="option"
                          aria-selected={isHighlighted}
                          onClick={() => {
                            setDisplayName(displayTitle)
                            setSelectedOrigin(item)
                            if (item.type === "market" || item.type === "source" || item.type === "event") {
                              setOriginType(item.type)
                            }
                            setShowSuggestions(false)
                          }}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                          className={`w-full text-left px-4 py-2.5 text-[13px] transition-colors border-b border-neutral-100 last:border-0 flex justify-between items-center ${
                            isHighlighted ? "bg-emerald-50 text-emerald-900 font-semibold" : "hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-neutral-800">{displayTitle}</span>
                            <span className="text-[10px] bg-neutral-100 text-neutral-500 px-1.5 py-0.5 rounded font-mono">既存店舗</span>
                          </div>
                          <span className="text-[11px] text-neutral-400 font-mono">/{item.slug}</span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2.5">
              <label className="text-[14px] font-bold tracking-[0.05em] text-neutral-900 font-mono">
                {t.labelOriginType}<span className={requiredBadgeStyle}>{t.requiredBadge}</span>
              </label>
              <select
                value={originType}
                onChange={(event) => setOriginType(event.target.value as OwnerOriginType)}
                className={inputStyle}
                disabled={Boolean(selectedOrigin)}
                required
              >
                <option value="market">{t.originTypeMarket}</option>
                <option value="source">{t.originTypeSource}</option>
                <option value="event">{t.originTypeEvent}</option>
              </select>
            </div>

            <BranchLocationsInput
              headquarters={headquarters}
              onHqChange={handleHqChange}
              branches={branches}
              onBranchesChange={setBranches}
              t={t}
              inputStyle={inputStyle}
            />

            <div className="space-y-2.5">
              <SocialLinksInput
                links={links}
                onChange={setLinks}
                label={t.labelLinks}
                description={t.descLinks}
                placeholderLabel={t.placeholderLinkLabel}
                placeholderUrl={t.placeholderLinkUrl}
                addLabel={t.addLinkBtn}
              />
            </div>

            <div className="space-y-2.5">
              <ProfileGearSelector value={selectedGearIds} onChange={setSelectedGearIds} lang={currentLang} />
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
                required
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={loading} 
                className="rounded-xl bg-neutral-900 px-7 py-3.5 text-[15px] font-medium tracking-wide text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md active:scale-[0.97] disabled:opacity-50"
              >
                {loading ? t.loading : isProfileCompleted ? t.submitButton : t.submitRequestButton}
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
                onDateClick={(date) => {
                  if (!startDate) {
                    setStartDate(date)
                  } else if (!endDate && date >= startDate) {
                    setEndDate(date)
                  } else {
                    setStartDate(date)
                    setEndDate("")
                  }
                }} 
                onEventDelete={async (deletedId) => {
                  setCalendarItems(prev => prev.filter(item => item.id !== deletedId))
                  await refreshCalendarData()
                }}
                onEventUpdate={async (id, type, newMemo, newTitle, newStartDate, newEndDate) => {
                  handleEventUpdate(id, type, newMemo, newTitle, newStartDate, newEndDate)
                  await refreshCalendarData()
                }}
                lang={currentLang}
              />
            </div>

            <form onSubmit={handleCalendarSubmit} className="bg-neutral-50/30 border border-neutral-200/60 pt-10 pb-12 px-6 sm:px-12 rounded-xl space-y-9">
              <div className="space-y-9">
                <div className="space-y-2.5">
                  <label className="text-[13px] font-bold text-neutral-900 tracking-wide">
                    {t.labelScheduleTitle}
                  </label>
                  <input 
                    type="text" 
                    maxLength={40}
                    value={scheduleTitle} 
                    onChange={(e) => setScheduleTitle(e.target.value)} 
                    placeholder={t.placeholderScheduleTitle} 
                    className={inputStyle} 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.labelStartDate}</label>
                    <input 
                      type={startDate ? "date" : "text"}
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)} 
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => { if (!e.target.value) e.target.type = "text" }}
                      placeholder={t.placeholderStartDate} 
                      className={inputStyle} 
                    />
                  </div>
                  
                  <div className="space-y-2.5">
                    <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.labelEndDate}</label>
                    <input 
                      type={endDate ? "date" : "text"}
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)} 
                      onFocus={(e) => (e.target.type = "date")}
                      onBlur={(e) => { if (!e.target.value) e.target.type = "text" }}
                      placeholder={t.placeholderEndDate} 
                      className={inputStyle} 
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <label className="text-[13px] font-bold text-neutral-900 tracking-wide block">{t.labelVisibility}</label>
                  <div className="w-full overflow-x-auto no-scrollbar scroll-smooth -mx-2 px-2 py-1">
                    <div className="flex flex-nowrap md:grid md:grid-cols-4 gap-3 min-w-max md:min-w-0">
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
                            className={`whitespace-nowrap px-2 py-3.5 text-[12px] sm:text-[13px] font-semibold rounded-xl border text-center transition-all duration-200 select-none flex-1 min-w-[145px] md:min-w-0 ${
                              isSelected
                                ? "bg-white border-neutral-900 text-neutral-900 shadow-sm ring-1 ring-neutral-900"
                                : "bg-white border-neutral-200 text-neutral-500 hover:text-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/50"
                            }`}
                          >
                            {labelMap[type]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3.5 border-t border-neutral-200/40">
                  {Boolean(scheduleTitle || startDate || endDate) && (
                    <button 
                      type="button" 
                      onClick={() => { setScheduleTitle(""); setStartDate(""); setEndDate(""); setVisibility("draft"); }} 
                      className="w-full sm:w-auto text-[14px] font-medium tracking-wide text-neutral-500 hover:text-red-500 hover:bg-red-50 px-5 py-3 rounded-full border border-transparent hover:border-red-100 transition-all duration-200 text-center select-none"
                    >
                      {t.clearForm}
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={formLoading}
                    className="w-full rounded-xl bg-neutral-900 px-8 py-3.5 text-center text-[15px] font-semibold tracking-wide text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md active:scale-[0.97] disabled:opacity-50 sm:w-auto"
                  >
                    {formLoading ? t.loading : t.submitCalendarForm}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
