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
  lang: "ja" | "en"
  mode?: "public" | "inbox" | "sent"
  className?: string
}

export default function B2BInquiryPanel({ originId, ownerId, currentUserId, lang, mode = "public", className = "" }: B2BInquiryPanelProps) {
  const isEn = lang === "en"
  const { showPopup, confirmPopup } = useAppPopup()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [subject, setSubject] = useState("wholesale")
  const [company, setCompany] = useState("")
  const [body, setBody] = useState("")
  const [reply, setReply] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null)
  const [recipientIsBusiness, setRecipientIsBusiness] = useState(false)

  const canUse = Boolean(currentUserId)
  const isOwner = Boolean(currentUserId && ownerId === currentUserId)

  useEffect(() => {
    if (!ownerId) return
    if (!originId) return
    supabase.from("origins").select("is_approved, is_public, user_id").eq("id", originId).eq("user_id", ownerId).maybeSingle().then(({ data, error }) => {
      if (error) console.error("Failed to verify B2B recipient:", error)
      setRecipientIsBusiness(Boolean(data?.is_approved && data?.is_public))
    })
  }, [originId, ownerId])

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
      showPopup(isEn ? "Your inquiry has been sent." : "問い合わせを送信しました。", "success", isEn ? "Inquiry sent" : "送信しました")
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

  const deleteMessage = async (messageId: string) => {
    if (deletingMessageId) return
    const confirmed = await confirmPopup({
      title: isEn ? "Delete message" : "メッセージを削除",
      message: isEn
        ? "Delete this message? This action cannot be undone."
        : "このメッセージを削除しますか？この操作は取り消せません。",
      confirmLabel: isEn ? "Delete" : "削除する",
      cancelLabel: isEn ? "Cancel" : "キャンセル",
      danger: true,
    })
    if (!confirmed) return

    setDeletingMessageId(messageId)
    try {
      const response = await fetch("/api/delete-b2b-message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: messageId }),
      })
      if (!response.ok) throw new Error("Delete failed")
      setMessages((current) => current.filter((message) => message.id !== messageId))
      showPopup(
        isEn ? "The message has been deleted." : "メッセージを削除しました。",
        "success",
        isEn ? "Message deleted" : "削除しました",
      )
    } catch (error) {
      console.error("Failed to delete B2B message:", error)
      showPopup(
        isEn ? "We couldn't delete the message." : "メッセージを削除できませんでした。",
        "error",
        isEn ? "Unable to delete" : "削除に失敗しました",
      )
    } finally {
      setDeletingMessageId(null)
    }
  }

  const subjectLabel = (value: string) => ({
    wholesale: isEn ? "Wholesale and sourcing" : "卸売・仕入れについて",
    collaboration: isEn ? "Events and collaborations" : "イベント・コラボレーション",
    media: isEn ? "Media and press" : "取材・メディア掲載",
    large_order: isEn ? "Bulk orders" : "大口注文について",
    other: isEn ? "Other business inquiries" : "その他のビジネス相談",
  }[value] || value)
  const active = conversations.find((item) => item.id === activeId)
  const activeMessages = messages.filter((item) => item.conversation_id === activeId)
  const inputClass = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[13px] outline-none transition focus:border-neutral-500"

  return <section className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm sm:p-8 ${className}`}>
    <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-900">B2B INQUIRIES</p>
    <h2 className="mt-2 text-xl font-bold tracking-tight text-neutral-900">{mode === "inbox" ? (isEn ? "Received inquiries" : "届いたビジネス問い合わせ") : mode === "sent" ? (isEn ? "Sent inquiries" : "送信したビジネス問い合わせ") : (isEn ? "Business inquiry" : "ビジネスに関する問い合わせ")}</h2>
    <p className="mt-2 text-xs leading-6 text-neutral-500">{mode === "inbox" ? (isEn ? "Manage and reply to inquiries from professional and business members." : "届いたビジネス問い合わせの確認と返信ができます。") : mode === "sent" ? (isEn ? "Continue your business inquiry conversations here." : "送信した問い合わせの確認や、その後のやり取りができます。") : (isEn ? "Contact this account directly about business inquiries." : "ビジネスに関して、このアカウントへ直接問い合わせできます。")}</p>

    {mode !== "public" && conversations.length > 0 && <div className="mt-7 grid gap-5 md:grid-cols-[220px_1fr]">
      <div className="space-y-2">{conversations.map((item) => <button key={item.id} type="button" onClick={() => setActiveId(item.id)} className={`w-full rounded-xl border p-3 text-left transition ${activeId === item.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"}`}><span className="block text-xs font-semibold">{subjectLabel(item.subject_type)}</span><span className="mt-1 block truncate text-[10px] opacity-60">{item.company_name || new Date(item.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")}</span></button>)}</div>
      {active && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4 sm:p-5">
          <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
            {activeMessages.map((message) => {
              const mine = message.sender_id === currentUserId
              return (
                <div key={message.id} className={`group flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[82%] rounded-2xl px-4 py-3.5 text-xs leading-relaxed shadow-sm ${
                    mine
                      ? "rounded-br-md bg-neutral-900 text-white"
                      : "rounded-bl-md border border-neutral-200 bg-white text-neutral-700"
                  }`}>
                    <p className={`mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] ${
                      mine ? "text-white/45" : "text-neutral-400"
                    }`}>
                      {mine ? (isEn ? "You" : "自分") : (isEn ? "From account" : "相手から")}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                    <div className="mt-2.5 flex items-center justify-between gap-4">
                      <time className={`text-[9px] ${mine ? "text-white/45" : "text-neutral-400"}`}>
                        {new Date(message.created_at).toLocaleString(isEn ? "en-US" : "ja-JP")}
                      </time>
                      {mine && (
                        <button
                          type="button"
                          onClick={() => void deleteMessage(message.id)}
                          disabled={deletingMessageId === message.id}
                          className="text-[9px] font-medium text-white/50 underline-offset-2 transition hover:text-red-200 hover:underline disabled:opacity-40"
                        >
                          {deletingMessageId === message.id
                            ? (isEn ? "Deleting..." : "削除中...")
                            : (isEn ? "Delete" : "削除")}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <form onSubmit={sendReply} className="mt-5 flex gap-2 border-t border-neutral-200/70 pt-4">
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              rows={2}
              maxLength={2000}
              placeholder={isEn ? "Write a reply..." : "返信を入力してください。"}
              className={`${inputClass} resize-none`}
              required
            />
            <button disabled={submitting} className="shrink-0 rounded-xl bg-neutral-900 px-5 text-xs font-semibold text-white transition hover:bg-neutral-700 disabled:opacity-50">
              {isEn ? "SEND" : "送信"}
            </button>
          </form>
        </div>
      )}
    </div>}

    {mode === "public" && conversations.length === 0 && <form onSubmit={startInquiry} className="mt-7 space-y-4 border-t border-neutral-100 pt-7"><div className="grid gap-4 sm:grid-cols-2"><select value={subject} onChange={(event) => setSubject(event.target.value)} className={inputClass}><option value="wholesale">{subjectLabel("wholesale")}</option><option value="collaboration">{subjectLabel("collaboration")}</option><option value="media">{subjectLabel("media")}</option><option value="large_order">{subjectLabel("large_order")}</option><option value="other">{subjectLabel("other")}</option></select><input value={company} onChange={(event) => setCompany(event.target.value)} maxLength={120} placeholder={isEn ? "Company or organization (optional)" : "会社名・所属名（任意）"} className={inputClass} /></div><textarea value={body} onChange={(event) => setBody(event.target.value)} rows={5} maxLength={2000} placeholder={isEn ? "Enter the details of your inquiry..." : "お問い合わせ内容をご入力ください。"} className={`${inputClass} resize-y`} required /><button disabled={submitting} className="rounded-xl bg-neutral-900 px-7 py-3.5 text-xs font-semibold tracking-wide text-white transition hover:bg-neutral-700 disabled:opacity-50">{submitting ? (isEn ? "SENDING..." : "送信中...") : (isEn ? "SEND INQUIRY" : "問い合わせを送信する")}</button></form>}
    {mode === "inbox" && conversations.length === 0 && <div className="mt-7 rounded-2xl border border-dashed border-neutral-200 px-6 py-10 text-center text-xs text-neutral-400">{isEn ? "No business inquiries yet." : "現在、届いているビジネス問い合わせはありません。"}</div>}
    {mode === "sent" && conversations.length === 0 && <div className="mt-7 rounded-2xl border border-dashed border-neutral-200 px-6 py-10 text-center text-xs text-neutral-400">{isEn ? "No sent business inquiries yet." : "送信済みのビジネス問い合わせはありません。"}</div>}
  </section>
}
