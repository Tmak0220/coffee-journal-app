"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

export type MasterRequestOption = {
  value: string
  labelJa: string
  labelEn: string
}

type Props = {
  currentLang: "ja" | "en"
  options: MasterRequestOption[]
  placeholderJa: string
  placeholderEn: string
}

export default function MasterRequestButton({ currentLang, options, placeholderJa, placeholderEn }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [requestType, setRequestType] = useState(options[0]?.value || "OTHER")
  const [requestValue, setRequestValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null)
  const isEn = currentLang === "en"

  const submitRequest = async () => {
    if (!requestValue.trim() || isSubmitting) return
    setIsSubmitting(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error(isEn ? "Please log in to submit a request." : "リクエストを送信するにはログインが必要です。")

      const { error } = await supabase.from("admin_notifications").insert({
        user_id: user.id,
        type: "master_request",
        requested_display_name: `[${requestType}] ${requestValue.trim()}`,
        status: "pending",
        created_at: new Date().toISOString()
      })
      if (error) throw error

      setRequestValue("")
      setMessage({ text: isEn ? "Request submitted successfully." : "リクエストを送信しました。", type: "success" })

      setTimeout(() => {
        setIsOpen(false)
        setMessage(null)
      }, 1200)

    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : (isEn ? "Failed to submit request." : "送信に失敗しました。"), type: "error" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 underline transition-colors">
        {isEn ? "Can't find it? Request new registration" : "見つからない場合は登録をリクエストする"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-neutral-200 w-full max-w-md p-6 shadow-xl space-y-5">
            <h3 className="text-base font-bold text-neutral-900">{isEn ? "Registration Request" : "登録リクエスト"}</h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{isEn ? "Category" : "種類"}</label>
                <select value={requestType} onChange={(e) => setRequestType(e.target.value)} className="w-full text-sm border border-neutral-200 rounded-xl px-3.5 py-3 bg-neutral-50 font-medium text-neutral-800 focus:outline-none">
                  {options.map(option => <option key={option.value} value={option.value}>{isEn ? option.labelEn : option.labelJa}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-neutral-600 uppercase tracking-wider">{isEn ? "Request details" : "登録したい内容"}</label>
                <input
                  type="text"
                  value={requestValue}
                  onChange={(e) => setRequestValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.preventDefault()
                  }}
                  placeholder={isEn ? placeholderEn : placeholderJa}
                  className="w-full text-sm border border-neutral-200 rounded-xl px-3.5 py-3 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400"
                />
              </div>
              {message && <div className={`text-xs p-3 rounded-xl border font-medium ${message.type === "success" ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-red-700 bg-red-50 border-red-200"}`}>{message.text}</div>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsOpen(false); setMessage(null) }} disabled={isSubmitting} className="flex-1 px-4 py-3 border border-neutral-200 hover:bg-neutral-50 rounded-xl text-xs font-bold text-neutral-600">{isEn ? "Cancel" : "キャンセル"}</button>
                <button type="button" onClick={submitRequest} disabled={isSubmitting || !requestValue.trim()} className="flex-1 px-4 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-xl text-xs font-bold">{isSubmitting ? "..." : (isEn ? "Submit Request" : "リクエストを送信")}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}