"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabase"

type Props = {
  userId: string
  authorType: "pro" | "owner" | "admin"
  membership_tier?: "free" | "standard" | "pro" | "business"
  lang?: "ja" | "en"
  originSlug?: string | null
  onNotificationCreated?: () => void
}

const formDict = {
  ja: {
    title: "BROADCAST NOTIFICATION",
    desc: "新着情報・重要お知らせの発信",
    labelType: "通知タイプ",
    labelTitle: "タイトル",
    labelContent: "配信内容 (メッセージ)",
    labelLinkUrl: "関連リンク URL (任意)",
    labelTarget: "配信対象の設定",
    placeholderTitle: "エチオピア 販売開始のお知らせ",
    placeholderContent: "通知を受け取るユーザーに表示される詳細文を入力してください...",
    placeholderLink: "https://yourshop.com/news/...",
    btnSubmit: "配信する",
    btnSending: "配信中...",
    btnSuccess: "配信完了",
    btnFailed: "配信失敗",
    targetAll: "全員に配信",
    targetAllDesc: "すべての閲覧者・顧客",
    targetPremium: "ログインユーザー限定",
    targetPremiumDesc: "ログインしているユーザーのみ",
    badgeLocked: "",
    
    typeNotice: "お知らせ・案内",
    typeNewRelease: "新発売・入荷情報",
    typeEvent: "イベント情報",
    typeSeminar: "セミナー・ワークショップ",
    typeMaintenance: "メンテナンス・重要お知らせ",
  },
  en: {
    title: "BROADCAST NOTIFICATION",
    desc: "Send push alerts, product releases, or announcements to your users",
    labelType: "Notification Type",
    labelTitle: "Title",
    labelContent: "Content Message",
    labelLinkUrl: "Link URL (Optional)",
    labelTarget: "Publishing Target Settings",
    placeholderTitle: "e.g., [New Release] Ethiopia Gesha Natural is now active",
    placeholderContent: "Write the message details you want to broadcast...",
    placeholderLink: "https://yourshop.com/news/...",
    btnSubmit: "Broadcast",
    btnSending: "Sending...",
    btnSuccess: "Successfully Sent",
    btnFailed: "Failed to Send",
    targetAll: "Broadcast to Everyone",
    targetAllDesc: "All viewers and customers",
    targetPremium: "Signed-in Users Only",
    targetPremiumDesc: "Only signed-in users",
    badgeLocked: "",

    typeNotice: "General Announcement",
    typeNewRelease: "New Release / Restock",
    typeEvent: "Event Information",
    typeSeminar: "Seminar / Workshop",
    typeMaintenance: "Maintenance & Critical Updates",
  }
}

export default function BroadcastNotificationForm({ 
  userId, 
  authorType, 
  membership_tier = "free", 
  lang = "ja",
  originSlug = null,
  onNotificationCreated,
}: Props) {
  const isEn = lang === "en"
  const t = formDict[isEn ? "en" : "ja"]

  const [type, setType] = useState<string>("notice")
  const [title, setTitle] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const [linkUrl, setLinkUrl] = useState<string>("")
  const [targetGroup, setTargetGroup] = useState<"all" | "premium">("all")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")

  const isPremiumFeatureLocked = false

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !content) return

    setStatus("sending")

    try {
      // `premium` is retained as the database value for backward compatibility,
      // but now represents signed-in users rather than a paid membership.
      const effectiveTargetGroup = isPremiumFeatureLocked ? "all" : targetGroup
      const record = {
        user_id: userId,
        type,
        title: title.trim(),
        content: content.trim(),
        link_url: linkUrl.trim() || null,
        is_read: false,
        target_group: effectiveTargetGroup,
        lang: isEn ? "en" : "ja",
        author_type: authorType,
        membership_tier,
        origin_slug: authorType === "owner" ? originSlug : null,
      }

      const { error } = await supabase
        .from("notifications")
        .insert([record])

      if (error) throw error

      setStatus("success")
      setTitle("")
      setContent("")
      setLinkUrl("")
      setTargetGroup("all")
      onNotificationCreated?.()
    } catch (err) {
      console.error("Error broadcasting notification:", err)
      setStatus("error")
    } finally {
      setTimeout(() => setStatus("idle"), 4000)
    }
  }

  const getButtonClass = () => {
    const base = "w-full sm:w-auto text-[13px] font-semibold px-6 py-2.5 rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-2 border select-none"
    if (status === "sending") return `${base} bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed`
    if (status === "success") return `${base} bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white`
    if (status === "error") return `${base} bg-rose-500 hover:bg-rose-600 border-rose-500 text-white`
    return `${base} bg-neutral-950 hover:bg-neutral-900 border-neutral-950 text-white active:scale-[0.98]`
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-8 rounded-2xl border border-neutral-200 bg-white px-5 pb-10 pt-6 shadow-sm animate-fadeIn sm:px-8 sm:pb-12 sm:pt-8">
      
      <div className="border-b border-neutral-100 pb-5">
        <h2 className="text-[15px] font-bold tracking-wider text-neutral-900 uppercase">
          {t.title}
        </h2>
        <p className="text-[11px] font-normal tracking-wide text-neutral-400 mt-1">
          {t.desc}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="flex flex-col space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{t.labelType}</label>
            <div className="relative">
              <select 
                value={type} 
                onChange={(e) => setType(e.target.value)}
                className="w-full text-[14px] font-normal border border-neutral-300 rounded-xl px-4 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 pr-9 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat shadow-sm cursor-pointer transition-all duration-300 hover:border-neutral-400"
              >
                <option value="notice">{t.typeNotice}</option>
                <option value="new_release">{t.typeNewRelease}</option>
                <option value="event">{t.typeEvent}</option>
                <option value="seminar">{t.typeSeminar}</option>
                <option value="maintenance">{t.typeMaintenance}</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-2 flex flex-col space-y-1.5">
            <label className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{t.labelTitle}</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t.placeholderTitle}
              className="text-[14px] font-normal border border-neutral-300 rounded-xl px-4 py-2.5 bg-white text-neutral-800 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 shadow-sm transition-all duration-300 hover:border-neutral-400"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{t.labelContent}</label>
          <textarea 
            required
            rows={4}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t.placeholderContent}
            className="text-[14px] font-normal border border-neutral-300 rounded-xl p-4 bg-white text-neutral-800 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 shadow-sm resize-none leading-relaxed transition-all duration-300 hover:border-neutral-400"
          />
        </div>

        <div className="flex flex-col space-y-1.5">
          <label className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">{t.labelLinkUrl}</label>
          <input 
            type="url" 
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={t.placeholderLink}
            className="text-[14px] font-normal border border-neutral-300 rounded-xl px-4 py-2.5 bg-white text-neutral-800 placeholder-neutral-300 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 shadow-sm font-mono transition-all duration-300 hover:border-neutral-400"
          />
        </div>

        {/* 配信対象の設定 */}
        <div className="border-t border-neutral-100 pt-6 space-y-4">
          <div>
            <label className="text-[11px] font-bold tracking-wider text-neutral-400 uppercase">
              {t.labelTarget}
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 全員配信ボタン */}
            <button
              type="button"
              onClick={() => setTargetGroup("all")}
              className={`text-left p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-1 group relative overflow-hidden select-none ${
                targetGroup === "all"
                  ? "border-neutral-950 bg-white ring-4 ring-neutral-100"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <span className={`text-[13px] font-medium transition-colors ${targetGroup === "all" ? "text-neutral-900 font-semibold" : "text-neutral-700"}`}>
                {t.targetAll}
              </span>
              <span className="text-[11px] text-neutral-400 font-normal">
                {t.targetAllDesc}
              </span>
            </button>

            {/* ログインユーザー限定配信ボタン */}
            <button
              type="button"
              disabled={isPremiumFeatureLocked}
              onClick={() => setTargetGroup("premium")}
              className={`text-left p-4 rounded-xl border transition-all duration-300 flex flex-col justify-between gap-1 group relative overflow-hidden select-none ${
                isPremiumFeatureLocked
                  ? "border-neutral-200 bg-neutral-50/60 opacity-60 cursor-not-allowed"
                  : targetGroup === "premium"
                  ? "border-neutral-950 bg-white ring-4 ring-neutral-100"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
            >
              <div className="flex items-center justify-between gap-2 w-full">
                <span className={`text-[13px] font-medium transition-colors ${targetGroup === "premium" ? "text-neutral-900 font-semibold" : "text-neutral-700"}`}>
                  {t.targetPremium}
                </span>
                {isPremiumFeatureLocked && (
                  <span className="text-[9px] font-bold bg-neutral-200 text-neutral-600 px-2 py-0.5 rounded-md tracking-wide uppercase">
                    {t.badgeLocked}
                  </span>
                )}
              </div>
              <span className="text-[11px] text-neutral-400 font-normal">
                {t.targetPremiumDesc}
              </span>
            </button>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-neutral-100">
          <button type="submit" disabled={status === "sending"} className={getButtonClass()}>
            {status === "sending" ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>{t.btnSending}</span>
              </>
            ) : status === "success" ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                <span>{t.btnSuccess}</span>
              </>
            ) : status === "error" ? (
              <>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                <span>{t.btnFailed}</span>
              </>
            ) : (
              <span>{t.btnSubmit}</span>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
