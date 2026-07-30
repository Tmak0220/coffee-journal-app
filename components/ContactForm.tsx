"use client"

import { useState } from "react"

type Props = {
  lang: "ja" | "en"
}

const contactFormDict = {
  ja: {
    labelName: "NAME",
    subName: "お名前を入力してください",
    placeholderName: "Name",
    labelEmail: "EMAIL",
    subEmail: "返信先のメールアドレスを入力してください",
    placeholderEmail: "mail@example.com",
    labelMessage: "MESSAGE",
    subMessage: "ご質問やご要望、お気づきの点などをご記入ください",
    placeholderMessage: "ご質問やご要望をご記入ください。",
    btnSubmit: "内容を送信する",
    btnSubmitting: "送信中...",
    successTitle: "お問い合わせを受け付けました。",
    successDesc: "通常2〜3営業日以内にご返信いたします。",
    errorText: "送信に失敗しました。直接メールにてご連絡ください。"
  },
  en: {
    labelName: "NAME",
    subName: "Please enter your name",
    placeholderName: "Name",
    labelEmail: "EMAIL",
    subEmail: "Please enter your email address for reply",
    placeholderEmail: "mail@example.com",
    labelMessage: "MESSAGE",
    subMessage: "Please enter your questions, requests, or feedback",
    placeholderMessage: "Your message here...",
    btnSubmit: "Send Message",
    btnSubmitting: "Sending...",
    successTitle: "Thank you! Your message has been received.",
    successDesc: "We will usually respond within 2 to 3 business days.",
    errorText: "Failed to send message. Please contact us directly via email."
  }
}

export default function ContactForm({ lang }: Props) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const currentLang = lang === "en" ? "en" : "ja"
  const t = contactFormDict[currentLang]

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setStatus("loading")

    const formData = new FormData(e.currentTarget)
    const data = Object.fromEntries(formData.entries())

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (response.ok) {
        setStatus("success")
        ;(e.target as HTMLFormElement).reset()
      } else {
        setStatus("error")
      }
    } catch (error) {
      console.error(error)
      setStatus("error")
    }
  }

  return (
    <div className="public-panel mx-auto w-full max-w-5xl p-6 sm:p-10">
      {status === "success" ? (
        <div className="text-sm p-5 rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-900 transition-all duration-300">
          <p className="font-semibold tracking-wide">{t.successTitle}</p>
          <p className="mt-2 text-neutral-500 text-xs leading-relaxed">{t.successDesc}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="hidden" aria-hidden="true">
            <input type="text" name="honey" tabIndex={-1} autoComplete="off" />
          </div>

          <div>
            <p className="text-xs sm:text-[13px] mb-1 tracking-[0.14em] text-neutral-900 font-bold uppercase">
              {t.labelName}
            </p>
            <p className="text-xs text-neutral-500 mb-3">{t.subName}</p>
            <input 
              type="text" 
              id="name" 
              name="name" 
              required 
              className="w-full text-[15px] border border-neutral-300 rounded-xl px-4 py-3 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 placeholder:text-neutral-400 transition-all duration-300" 
              placeholder={t.placeholderName} 
            />
          </div>

          <div>
            <p className="text-xs sm:text-[13px] mb-1 tracking-[0.14em] text-neutral-900 font-bold uppercase">
              {t.labelEmail}
            </p>
            <p className="text-xs text-neutral-500 mb-3">{t.subEmail}</p>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              className="w-full text-[15px] border border-neutral-300 rounded-xl px-4 py-3 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 placeholder:text-neutral-400 transition-all duration-300" 
              placeholder={t.placeholderEmail} 
            />
          </div>

          <div>
            <p className="text-xs sm:text-[13px] mb-1 tracking-[0.14em] text-neutral-900 font-bold uppercase">
              {t.labelMessage}
            </p>
            <p className="text-xs text-neutral-500 mb-3">{t.subMessage}</p>
            <textarea 
              id="message" 
              name="message" 
              required 
              rows={6} 
              className="w-full text-[15px] border border-neutral-300 rounded-xl px-4 py-3 bg-white text-neutral-900 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 placeholder:text-neutral-400 resize-none leading-relaxed transition-all duration-300" 
              placeholder={t.placeholderMessage} 
            />
          </div>

          {status === "error" && (
            <div className="text-sm p-4 rounded-xl border text-red-600 bg-red-50/40 border-red-200 transition-all duration-300">
              {t.errorText}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-xl border border-transparent bg-neutral-950 px-10 py-3.5 text-sm font-medium tracking-wider text-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:bg-neutral-900 hover:shadow-md active:scale-[0.98] disabled:opacity-50 sm:w-auto"
            >
              {status === "loading" ? t.btnSubmitting : t.btnSubmit}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
