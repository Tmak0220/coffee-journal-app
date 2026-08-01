"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import HeroImageUploader from "./HeroImageUploader"

type OriginEventOption = {
  id: string
  name?: string | null
  name_ja?: string | null
  search_keywords?: string | null
}

type Props = {
  userId: string
  lang?: string
  isAdmin?: boolean
  onSuccess?: () => void
  editId?: string
  secondaryAction?: ReactNode
  deleteStatusMessage?: { text: string; type: "success" | "error" } | null
  eventOrigins?: OriginEventOption[]
}

export default function EventPostForm({ userId, lang = "ja", isAdmin = false, onSuccess, editId, secondaryAction, deleteStatusMessage, eventOrigins: initialEventOrigins }: Props) {
  const router = useRouter()
  const currentLang = lang === "en" ? "en" : "ja"
  const t = currentLang === "en" ? {
    title: "EVENT REPORT",
    description: "Post an event report for this event.",
    titleLabel: "Title (Search Event)",
    titlePlaceholder: "Type event name or keyword...",
    startDate: "Start Date",
    endDate: "End Date",
    bodyLabel: "Report",
    bodyPlaceholder: "Write your event report...",
    visibility: "Visibility",
    draft: "Draft",
    private: "Private",
    members: "Signed-in Users Only",
    public: "Public",
    submit: "Post",
    submitting: "Posting...",
    success: "Event report posted.",
    error: "Failed to post the event report.",
    updateSuccess: "Event report updated.",
    update: "Save changes",
    updating: "Saving..."
  } : {
    title: "EVENT REPORT",
    description: "イベントのレポートを投稿します。",
    titleLabel: "タイトル (イベント検索)",
    titlePlaceholder: "イベント名やキーワードを入力して検索...",
    startDate: "開始日",
    endDate: "終了日",
    bodyLabel: "レポート本文",
    bodyPlaceholder: "イベントの内容や感想を入力してください",
    visibility: "公開設定",
    draft: "下書き",
    private: "非公開（自分のみ）",
    members: "限定公開（ログインユーザーのみ）",
    public: "公開（全員）",
    submit: "投稿する",
    submitting: "投稿中...",
    success: "イベントレポートを投稿しました。",
    error: "イベントレポートの投稿に失敗しました。",
    updateSuccess: "イベント投稿を更新しました。",
    update: "変更を保存する",
    updating: "保存中..."
  }

  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [images, setImages] = useState<string[]>([])
  const [visibility, setVisibility] = useState<"draft" | "private" | "members" | "public">("draft")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const [loadingInitial, setLoadingInitial] = useState(Boolean(editId))
  const [removedImageUrls, setRemovedImageUrls] = useState<string[]>([])
  const initialImagesRef = useRef<string[]>([])

  const [eventOrigins, setEventOrigins] = useState<OriginEventOption[]>(initialEventOrigins || [])
  const [filteredOrigins, setFilteredOrigins] = useState<OriginEventOption[]>([])
  const [selectedOrigin, setSelectedOrigin] = useState<OriginEventOption | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    if (initialEventOrigins && initialEventOrigins.length > 0) {
      setEventOrigins(initialEventOrigins)
      return
    }
    let active = true
    void (async () => {
      const { data } = await supabase
        .from("origins")
        .select("id, name, name_ja, search_keywords")
        .eq("type", "event")
        .order("name_ja", { ascending: true })

      if (active && data) {
        setEventOrigins(data)
      }
    })()
    return () => { active = false }
  }, [initialEventOrigins])

  useEffect(() => {
    if (!editId) return
    let active = true
    void (async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("user_id, type, title, description, event_date, end_date, image_urls, visibility")
        .eq("id", editId)
        .eq("user_id", userId)
        .single()

      if (!active) return
      if (error || !data) {
        setStatus({ text: currentLang === "en" ? "Event post not found." : "イベント投稿が見つかりません。", type: "error" })
        setLoadingInitial(false)
        return
      }

      // 既存の紐づき(origin_post_links)を取得して選択状態にする
      const { data: linkData } = await supabase
        .from("origin_post_links")
        .select("origin_id, origins(id, name, name_ja)")
        .eq("post_id", editId)
        .maybeSingle()

      if (linkData?.origins) {
        const orig = linkData.origins as any
        setSelectedOrigin({
          id: String(orig.id),
          name: orig.name,
          name_ja: orig.name_ja
        })
      }

      const urls = Array.isArray(data.image_urls) ? data.image_urls.filter((url): url is string => typeof url === "string") : []
      setTitle(data.title || "")
      setDescription(data.description || "")
      setStartDate(data.event_date || "")
      setEndDate(data.end_date || "")
      setImages(urls)
      initialImagesRef.current = urls
      setVisibility(data.visibility || "draft")

      setLoadingInitial(false)
    })()
    return () => { active = false }
  }, [currentLang, editId, userId])

  const handleTitleChange = (text: string) => {
    setTitle(text)
    // タイトルを直接書き換えた場合は選択していたイベントを解除
    setSelectedOrigin(null)

    if (!text.trim()) {
      setFilteredOrigins([])
      setShowSuggestions(false)
      return
    }

    const query = text.toLowerCase()
    const matches = eventOrigins.filter(origin => {
      const jaMatch = origin.name_ja?.toLowerCase().includes(query)
      const enMatch = origin.name?.toLowerCase().includes(query)
      const kwMatch = origin.search_keywords?.toLowerCase().includes(query)
      return jaMatch || enMatch || kwMatch
    })

    setFilteredOrigins(matches)
    setShowSuggestions(matches.length > 0)
  }

  const handleSelectOrigin = (origin: OriginEventOption) => {
    const selectedName = currentLang === "en" ? (origin.name || origin.name_ja) : (origin.name_ja || origin.name)
    setTitle(selectedName || "")
    setSelectedOrigin(origin)
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    if (!title.trim() || !startDate) return
    setLoading(true)

    try {
      // 1. posts テーブルへの登録/更新（type は "post" とし、カレンダーから切り離す）
      const payload = {
        user_id: userId,
        type: "post",
        title: title.trim(),
        description: description.trim(),
        event_date: startDate,
        end_date: endDate || null,
        image_urls: images,
        visibility: visibility,
        lang: currentLang,
      }

      let targetPostId = editId

      if (editId) {
        const { error } = await supabase.from("posts").update(payload).eq("id", editId).eq("user_id", userId)
        if (error) throw error
      } else {
        const { data: insertedPost, error } = await supabase
          .from("posts")
          .insert(payload)
          .select("id")
          .single()

        if (error) throw error
        targetPostId = insertedPost?.id
      }

      // 2. origin_post_links への紐づけ制御（イベントページ表示用）
      if (targetPostId) {
        if (selectedOrigin && (visibility === "public" || visibility === "members")) {
          // 公開/限定公開の場合は紐づけ（存在しない場合のみ新規作成）
          await supabase.from("origin_post_links").upsert(
            {
              origin_id: Number(selectedOrigin.id),
              post_id: targetPostId,
              display_status: "approved"
            },
            { onConflict: "origin_id,post_id" }
          )
        } else {
          // 非公開/下書き、あるいはイベント未選択の場合は紐づけを解除
          await supabase
            .from("origin_post_links")
            .delete()
            .eq("post_id", targetPostId)
        }
      }

      // 3. 画像のクリーンアップ
      for (const url of removedImageUrls.filter(url => initialImagesRef.current.includes(url) && !images.includes(url))) {
        await fetch("/api/delete-object", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) })
      }
      setRemovedImageUrls([])
      initialImagesRef.current = images
      setStatus({ text: editId ? t.updateSuccess : t.success, type: "success" })
      
      if (editId) {
        router.push(`/${currentLang}/posts/${editId}`)
        router.refresh()
        return
      }

      setTitle("")
      setDescription("")
      setStartDate("")
      setEndDate("")
      setImages([])
      setSelectedOrigin(null)
      setVisibility("draft")
      setTimeout(() => onSuccess?.(), 700)
    } catch (err: any) {
      setStatus({ text: `${t.error} ${err.message}`, type: "error" })
    } finally {
      setLoading(false)
    }
  }

  if (loadingInitial) return <div className="h-[520px] animate-pulse rounded-xl border border-neutral-100 bg-neutral-50" />

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-neutral-200/60 rounded-xl shadow-sm px-6 py-8 sm:px-12 sm:py-12 space-y-9">
      <div>
        <h2 className="text-[18px] font-bold tracking-[0.05em] text-neutral-900">{t.title}</h2>
        <p className="mt-1 text-[13px] text-neutral-400">{t.description}</p>
      </div>

      <HeroImageUploader currentLang={currentLang} initialImageUrls={images} onImagesChanged={setImages} deferDeletion={Boolean(editId)} onRemovedImagesChanged={setRemovedImageUrls} isAdmin={isAdmin} />

      <div className="space-y-2.5 relative" ref={suggestRef}>
        <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.titleLabel}</label>
        <input 
          type="text" 
          maxLength={40} 
          value={title} 
          onChange={e => handleTitleChange(e.target.value)} 
          onFocus={() => { if (filteredOrigins.length > 0) setShowSuggestions(true) }}
          placeholder={t.titlePlaceholder} 
          className="w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 focus:outline-none focus:border-neutral-400 focus:bg-white transition-colors" 
          required 
        />

        {showSuggestions && filteredOrigins.length > 0 && (
          <div className="absolute z-20 left-0 right-0 top-[100%] mt-1 bg-white border border-neutral-200/90 rounded-xl shadow-lg max-h-56 overflow-y-auto py-1">
            {filteredOrigins.map((origin) => (
              <button
                key={origin.id}
                type="button"
                onClick={() => handleSelectOrigin(origin)}
                className="w-full text-left px-4 py-2.5 hover:bg-neutral-50 transition-colors flex flex-col border-b last:border-0 border-neutral-100"
              >
                <span className="text-[13px] font-semibold text-neutral-800">
                  {origin.name_ja || origin.name}
                </span>
                {origin.name && origin.name_ja && (
                  <span className="text-[11px] text-neutral-400">
                    {origin.name}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        <p className="text-right text-[11px] text-neutral-400 font-mono">{title.length} / 40</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="space-y-2.5"><label className="text-[13px] font-bold text-neutral-900">{t.startDate}</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 focus:outline-none focus:border-neutral-400" required /></div>
        <div className="space-y-2.5"><label className="text-[13px] font-bold text-neutral-900">{t.endDate}</label><input type="date" min={startDate || undefined} value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 focus:outline-none focus:border-neutral-400" /></div>
      </div>

      <div className="space-y-2.5">
        <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.bodyLabel}</label>
        <textarea maxLength={400} value={description} onChange={e => setDescription(e.target.value)} rows={6} placeholder={t.bodyPlaceholder} className="w-full text-[14px] leading-relaxed border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 focus:outline-none focus:border-neutral-400 focus:bg-white resize-y transition-colors" />
        <p className="text-right text-[11px] text-neutral-400 font-mono">{description.length} / 400</p>
      </div>

      <div className="space-y-3">
        <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.visibility}</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(["draft", "private", "members", "public"] as const).map(value => (
            <button key={value} type="button" onClick={() => setVisibility(value)} className={`min-h-[46px] px-3 py-3 text-[12px] font-semibold rounded-xl border transition-colors ${visibility === value ? "bg-white border-neutral-900 text-neutral-900 ring-1 ring-neutral-900" : "bg-white border-neutral-200 text-neutral-500 hover:border-neutral-400"}`}>{t[value]}</button>
          ))}
        </div>
      </div>

      <div className="pt-6 border-t border-neutral-100 space-y-4">
        {(deleteStatusMessage || status) && <div role="status" className={`text-[13px] p-4 rounded-xl border text-center ${(deleteStatusMessage || status)?.type === "success" ? "text-neutral-900 bg-neutral-50 border-neutral-200" : "text-red-700 bg-red-50 border-red-200"}`}>{deleteStatusMessage?.text || status?.text}</div>}
        <div className="flex flex-col justify-end gap-3 sm:flex-row sm:items-center"><button type="submit" disabled={loading || !title.trim() || !startDate} className="w-full rounded-xl bg-neutral-900 px-8 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow-md disabled:opacity-50 sm:w-auto">{loading ? (editId ? t.updating : t.submitting) : (editId ? t.update : t.submit)}</button>{secondaryAction}</div>
      </div>
    </form>
  )
}
