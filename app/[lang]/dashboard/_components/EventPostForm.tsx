"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import HeroImageUploader from "./HeroImageUploader"

type Props = {
  userId: string
  lang?: string
  isAdmin?: boolean
  onSuccess?: () => void
  editId?: string
}

export default function EventPostForm({ userId, lang = "ja", isAdmin = false, onSuccess, editId }: Props) {
  const router = useRouter()
  const currentLang = lang === "en" ? "en" : "ja"
  const t = currentLang === "en" ? {
    title: "EVENT REPORT",
    description: "Post an event report and add it to your calendar.",
    titleLabel: "Title",
    titlePlaceholder: "Event title",
    startDate: "Start Date",
    endDate: "End Date",
    bodyLabel: "Report",
    bodyPlaceholder: "Write your event report...",
    visibility: "Visibility",
    draft: "Draft",
    private: "Private",
    members: "Members Only",
    public: "Public",
    submit: "Post",
    submitting: "Posting...",
    success: "Event report posted.",
    error: "Failed to post the event report."
    , updateSuccess: "Event report updated.", update: "Save changes", updating: "Saving..."
  } : {
    title: "EVENT REPORT",
    description: "イベントレポートを投稿し、カレンダーに追加します。",
    titleLabel: "タイトル",
    titlePlaceholder: "イベントタイトル",
    startDate: "開始日",
    endDate: "終了日",
    bodyLabel: "レポート本文",
    bodyPlaceholder: "イベントの内容や感想を入力してください",
    visibility: "公開設定",
    draft: "下書き",
    private: "非公開（自分のみ）",
    members: "限定公開（会員のみ）",
    public: "公開（全員）",
    submit: "投稿する",
    submitting: "投稿中...",
    success: "イベントレポートを投稿しました。",
    error: "イベントレポートの投稿に失敗しました。"
    , updateSuccess: "イベント投稿を更新しました。", update: "変更を保存する", updating: "保存中..."
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
      if (error || !data || data.type !== "event") {
        setStatus({ text: currentLang === "en" ? "Event post not found." : "イベント投稿が見つかりません。", type: "error" })
        setLoadingInitial(false)
        return
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus(null)
    if (!title.trim() || !startDate) return
    setLoading(true)

    try {
      const payload = {
        user_id: userId,
        type: "event",
        title: title.trim(),
        description: description.trim(),
        event_date: startDate,
        end_date: endDate || null,
        image_urls: images,
        visibility: visibility,
        lang: currentLang,
      }
      const { error } = editId
        ? await supabase.from("posts").update(payload).eq("id", editId).eq("user_id", userId)
        : await supabase.from("posts").insert(payload)

      if (error) throw error
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

      <div className="space-y-2.5">
        <label className="text-[13px] font-bold text-neutral-900 tracking-wide">{t.titleLabel}</label>
        <input type="text" maxLength={40} value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} className="w-full text-[14px] border border-neutral-200/80 rounded-xl px-4 py-3 bg-neutral-50/30 focus:outline-none focus:border-neutral-400 focus:bg-white transition-colors" required />
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
        {status && <div role="status" className={`text-[13px] p-4 rounded-xl border text-center ${status.type === "success" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}>{status.text}</div>}
        <div className="flex justify-end"><button type="submit" disabled={loading || !title.trim() || !startDate} className="w-full sm:w-auto bg-neutral-900 hover:bg-neutral-800 text-white px-8 py-3.5 rounded-full text-[15px] font-semibold transition-colors disabled:opacity-50">{loading ? (editId ? t.updating : t.submitting) : (editId ? t.update : t.submit)}</button></div>
      </div>
    </form>
  )
}
