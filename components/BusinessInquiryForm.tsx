"use client"

import React, { useState } from "react"
import { Send, CheckCircle2 } from "lucide-react"

type Props = {
  targetOwnerId: string
  targetOwnerName: string
  currentUserProfile: {
    id: string
    username: string
    display_name: string | null
    email: string
    membership_tier: "free" | "standard" | "pro" | "business"
  }
  lang: "ja" | "en"
}

export default function BusinessInquiryForm({ targetOwnerId, targetOwnerName, currentUserProfile, lang }: Props) {
  const isEn = lang === "en"
  const [subjectType, setSubjectType] = useState("wholesale")
  const [companyName, setCompanyName] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // 💡 将来的にここでAPIを叩いて送信処理を行います
    setIsSubmitted(true)
  }

  if (isSubmitted) {
    return (
      <div className="space-y-3 rounded-2xl border border-emerald-200/60 bg-emerald-50/30 p-6 text-center shadow-sm">
        <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
        <h4 className="text-sm font-bold text-neutral-900">
          {isEn ? "Inquiry Sent Successfully" : "ビジネス問い合わせを送信しました"}
        </h4>
        <p className="text-xs text-neutral-500">
          {isEn ? `Your message has been delivered to ${targetOwnerName}.` : `${targetOwnerName} さんへメッセージが届きました。`}
        </p>
      </div>
    )
  }

  return (
    <div className="public-panel space-y-5 p-6 sm:p-8">
      <div>
        <span className="text-[10px] bg-neutral-900 text-white font-semibold tracking-[0.1em] px-2.5 py-1 rounded-md uppercase">
          {isEn ? "Send Inquiry (Preview)" : "問い合わせを送る（プレビュー）"}
        </span>
        <h3 className="text-base font-bold text-neutral-800 mt-2">
          {isEn ? `Contact ${targetOwnerName}` : `${targetOwnerName} へビジネス商談を持ちかける`}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            {isEn ? "Inquiry Type" : "問い合わせ種別"}
          </label>
          <select
            value={subjectType}
            onChange={(e) => setSubjectType(e.target.value)}
            className="w-full text-sm border border-neutral-300 rounded-xl px-3 py-2 bg-white"
          >
            <option value="wholesale">{isEn ? "Wholesale" : "卸売り・仕入れ"}</option>
            <option value="collaboration">{isEn ? "Collaboration" : "イベント・コラボ"}</option>
            <option value="media">{isEn ? "Media" : "取材・メディア"}</option>
            <option value="large_order">{isEn ? "Bulk Order" : "大口注文"}</option>
            <option value="other">{isEn ? "Other" : "その他ビジネス"}</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            {isEn ? "Company / Brand Name" : "貴社名 ・ ブランド名"}
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder={isEn ? "e.g., Coffee Roasters Inc." : "例: ○○珈琲株式会社"}
            className="w-full text-sm border border-neutral-300 rounded-xl px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-500 mb-1">
            {isEn ? "Message" : "提案・問い合わせ内容"}
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            required
            placeholder={isEn ? "Describe your business proposal..." : "具体的な商談・提案内容をご記入ください。"}
            className="w-full text-sm border border-neutral-300 rounded-xl px-3 py-2"
          />
        </div>

        <button
          type="submit"
          className="w-full flex items-center justify-center gap-2 bg-neutral-950 hover:bg-neutral-900 text-white font-medium text-sm py-2.5 rounded-xl transition-colors"
        >
          <Send className="w-4 h-4" />
          {isEn ? "Send Business Proposal" : "ビジネス問い合わせを送信する"}
        </button>
      </form>
    </div>
  )
}
