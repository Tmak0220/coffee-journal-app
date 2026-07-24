"use client"

import { FormEvent, useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAppPopup } from "@/context/AppPopupContext"

type Conversation = { id: string; sender_id: string; recipient_id: string; subject_type: string; company_name: string | null; created_at: string }
type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string }

type B2BInquiryPanelProps = {
  originId?: number
  ownerId?: string | null
  currentUserId: string | null
  currentUserTier: string | null
  lang: "ja" | "en"
  mode?: "public" | "inbox" | "sent"
}

export default function B2BInquiryPanel({ originId, ownerId, currentUserId, currentUserTier, lang, mode = "public" }: B2BInquiryPanelProps) {
  const isEn = lang === "en"
  const { showPopup } = useAppPopup()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [subject, setSubject] = useState("wholesale")
  const [company, setCompany] = useState("")
  const [body, setBody] = useState("")
  const [reply, setReply] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [recipientIsBusiness, setRecipientIsBusiness] = useState(false)

  const canUse = currentUserTier === "pro" || currentUserTier === "business"
  const isOwner = Boolean(currentUserId && ownerId === currentUserId)

  useEffect(() => {
    if (!ownerId) return
    supabase.from("users").select("membership_tier").eq("id", ownerId).maybeSingle().then(({ data, error }) => {
      if (error) console.error("Failed to verify B2B recipient:", error)
      setRecipientIsBusiness(data?.membership_tier === "business")
    })
  }, [ownerId])

  const loadThreads = useCallback(async () => {
    if (!currentUserId || !canUse) return
    if (mode !== "sent" && (!ownerId || !originId)) return
    let query = supabase.from("b2b_conversations").select("id, sender_id, recipient_id, subject_type, company_name, created_at")
    if (mode === "inbox") query = query.eq("origin_id", originId!).eq("recipient_id", currentUserId)
    else if (mode === "sent") query = query.eq("sender_id", currentUserId)
    else query = query.eq("origin_id", originId!).eq("sender_id", currentUserId).eq("recipient_id", ownerId!)
    const { data, error } = await query.order("created_at", { ascending: false })
    if (error) { console.error("Failed to load B2B conversations:", error); return }
    const threads = (data || []) as Conversation[]
    setConversations(threads)
    const ids = threads.map((thread) => thread.id)
    if (!ids.length) { setMessages([]); return }
    const { data: messageData, error: messageError } = await supabase.from("b2b_messages").select("id, conversation_id, sender_id, body, created_at").in("conversation_id", ids).order("created_at", { ascending: true })
    if (messageError) console.error("Failed to load B2B messages:", messageError)
    else setMessages((messageData || []) as Message[])
    setActiveId((current) => current && ids.includes(current) ? current : ids[0])
  }, [canUse, currentUserId, mode, originId, ownerId])

  useEffect(() => { loadThreads() }, [loadThreads])

  if (!canUse || !currentUserId) return null
  if (mode !== "sent" && (!ownerId || !originId || !recipientIsBusiness)) return null
  if (mode === "public" && isOwner) return null
  if (mode === "inbox" && !isOwner) return null
  if (mode === "public" && conversations.length > 0) return null

  const startInquiry = async (event: FormEvent) => {
    event.preventDefault()
    if (!body.trim() || submitting) return
    setSubmitting(true)
    if (!originId) return
    const { data, error } = await supabase.rpc("start_b2b_inquiry", { p_origin_id: originId, p_subject_type: subject, p_company_name: company.trim() || null, p_body: body.trim() })
    if (error) {
      console.error("Failed to start B2B inquiry:", error)
      showPopup(isEn ? "We couldn't send your inquiry. Please try again." : "問い合わせを送信できませんでした。時間をおいて、もう一度お試しください。", "error", isEn ? "Not sent" : "送信に失敗しました")
    } else {
      setBody(""); setCompany(""); setActiveId(data as string)
      showPopup(isEn ? "Your business inquiry has been sent." : "ビジネス問い合わせを送信しました。", "success", isEn ? "Inquiry sent" : "送信しました")
      await loadThreads()
    }
    setSubmitting(false)
  }

  const sendReply = async (event: FormEvent) => {
    event.preventDefault()
    if (!activeId || !reply.trim() || submitting) return
    setSubmitting(true)
    const { error } = await supabase.rpc("send_b2b_message", { p_conversation_id: activeId, p_body: reply.trim() })
    if (error) {
      console.error("Failed to send B2B reply:", error)
      showPopup(isEn ? "We couldn't send your message." : "メッセージを送信できませんでした。", "error", isEn ? "Not sent" : "送信に失敗しました")
    } else { setReply(""); await loadThreads() }
    setSubmitting(false)
  }

  const subjectLabel = (value: string) => ({ wholesale: isEn ? "Wholesale" : "卸売り・仕入れ", collaboration: isEn ? "Collaboration" : "イベント・コラボ", media: isEn ? "Media" : "取材・メディア", large_order: isEn ? "Bulk order" : "大口注文", other: isEn ? "Other" : "その他" }[value] || value)
  const active = conversations.find((item) => item.id === activeId)
  const activeMessages = messages.filter((item) => item.conversation_id === activeId)
  const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-500"

  return <section className="mt-14 rounded-3xl border border-neutral-200/70 bg-white/80 p-6 shadow-sm sm:p-8">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-400">B2B INQUIRIES</p>
    <h2 className="mt-2 text-lg font-medium text-neutral-900">{mode === "inbox" ? (isEn ? "Received inquiries" : "届いたビジネス問い合わせ") : mode === "sent" ? (isEn ? "Sent inquiries" : "送信したビジネス問い合わせ") : (isEn ? "Contact this business" : "ビジネスについて問い合わせる")}</h2>
    <p className="mt-2 text-xs leading-6 text-neutral-500">{mode === "inbox" ? (isEn ? "Manage and reply to inquiries from professional and business members." : "プロ会員・ビジネス会員から届いた問い合わせを管理し、返信できます。") : mode === "sent" ? (isEn ? "Continue your business inquiry conversations here." : "送信済みの問い合わせへの返信と、その後のやり取りはこちらで行えます。") : (isEn ? "Professional and business members can contact this business directly." : "プロ会員・ビジネス会員として、この運営者へ直接問い合わせできます。")}</p>

    {mode !== "public" && conversations.length > 0 && <div className="mt-7 grid gap-5 md:grid-cols-[220px_1fr]">
      <div className="space-y-2">{conversations.map((item) => <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${activeId === item.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"}`}><span className="block text-xs font-semibold">{subjectLabel(item.subject_type)}</span><span className="mt-1 block truncate text-[10px] opacity-60">{item.company_name || new Date(item.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</span></button>)}</div>
      {active && <div className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4 sm:p-5"><div className="max-h-80 space-y-3 overflow-y-auto pr-1">{activeMessages.map((message) => { const mine = message.sender_id === currentUserId; return <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${mine ? "bg-neutral-900 text-white" : "border border-neutral-200 bg-white text-neutral-700"}`}><p className="whitespace-pre-wrap">{message.body}</p><p className="mt-1.5 text-[9px] opacity-50">{new Date(message.created_at).toLocaleString(isEn ? "en-US" : "ja-JP")}</p></div></div> })}</div><form onSubmit={sendReply} className="mt-4 flex gap-2"><textarea value={reply} onChange={(event) => setReply(event.target.value)} rows={2} maxLength={2000} placeholder={isEn ? "Write a reply..." : "返信を入力..."} className={`${inputClass} resize-none`} required /><button disabled={submitting} className="shrink-0 rounded-xl bg-neutral-900 px-5 text-xs font-semibold text-white disabled:opacity-50">{isEn ? "SEND" : "送信"}</button></form></div>}
    </div>}

    {mode === "public" && conversations.length === 0 && <form onSubmit={startInquiry} className="mt-7 space-y-4 border-t border-neutral-100 pt-7"><div className="grid gap-4 sm:grid-cols-2"><select value={subject} onChange={(event) => setSubject(event.target.value)} className={inputClass}><option value="wholesale">{subjectLabel("wholesale")}</option><option value="collaboration">{subjectLabel("collaboration")}</option><option value="media">{subjectLabel("media")}</option><option value="large_order">{subjectLabel("large_order")}</option><option value="other">{subjectLabel("other")}</option></select><input value={company} onChange={(event) => setCompany(event.target.value)} maxLength={120} placeholder={isEn ? "Company / organization (optional)" : "会社・所属名（任意）"} className={inputClass} /></div><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={2000} placeholder={isEn ? "Describe your inquiry..." : "問い合わせ内容を入力してください..."} className={`${inputClass} resize-y`} required /><button disabled={submitting} className="rounded-xl bg-neutral-900 px-7 py-3.5 text-xs font-semibold tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-50">{submitting ? (isEn ? "SENDING..." : "送信中...") : (isEn ? "SEND INQUIRY" : "問い合わせを送信")}</button></form>}
    {mode === "inbox" && conversations.length === 0 && <div className="mt-7 rounded-2xl border border-dashed border-neutral-200 px-6 py-10 text-center text-xs text-neutral-400">{isEn ? "No business inquiries yet." : "現在、届いているビジネス問い合わせはありません。"}</div>}
    {mode === "sent" && conversations.length === 0 && <div className="mt-7 rounded-2xl border border-dashed border-neutral-200 px-6 py-10 text-center text-xs text-neutral-400">{isEn ? "No sent business inquiries yet." : "送信済みのビジネス問い合わせはありません。"}</div>}
  </section>
}
