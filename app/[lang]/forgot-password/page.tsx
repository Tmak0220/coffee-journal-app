"use client"

import { FormEvent, useState } from "react"
import { supabase } from "@/lib/supabase"
import Link from "next/link"
import { useParams } from "next/navigation"

export default function ForgotPasswordPage() {
  const params = useParams<{ lang: string }>()
  const lang = params.lang === "en" ? "en" : "ja"
  const prefix = `/${lang}`
  const isEn = lang === "en"
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleReset = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setErrorMessage("")

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}${prefix}/reset-password`,
    })

    if (error) {
      console.error("Password reset email failed:", error)
      setErrorMessage(isEn
        ? "We couldn't send the reset email. Check the address and try again."
        : "再設定メールを送信できませんでした。メールアドレスを確認して、もう一度お試しください。")
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  const inputClass = "w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/5"

  return (
    <main className="public-page-shell min-h-[calc(100vh-120px)] px-4 py-8 sm:px-10 sm:py-16 md:px-14 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="type-label text-[11px] font-medium tracking-[0.14em] text-neutral-400">ACCOUNT RECOVERY</p>
          <h1 className="mt-4 text-3xl font-light tracking-[0.03em] text-neutral-900 sm:text-5xl sm:tracking-[0.04em]">
            {isEn ? "Reset your password" : "パスワードを再設定"}
          </h1>
          <p className="mt-5 text-sm leading-7 text-neutral-500">
            {isEn
              ? "Enter the email address associated with your account. We'll send you a secure link to choose a new password."
              : "アカウントに登録したメールアドレスを入力してください。新しいパスワードを設定するためのリンクをお送りします。"}
          </p>
        </header>

        <section className="public-panel mt-10 max-w-xl p-6 sm:p-8">
          {sent ? (
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-emerald-600">EMAIL SENT</p>
              <h2 className="mt-3 text-xl font-medium text-neutral-900">
                {isEn ? "Check your inbox" : "受信トレイをご確認ください"}
              </h2>
              <p className="mt-4 text-sm leading-7 text-neutral-500">
                {isEn
                  ? "If an account exists for this email address, a password reset link will arrive shortly."
                  : "入力したメールアドレス宛に、パスワード再設定用のリンクを送信しました。メールが届かない場合は、迷惑メールフォルダもご確認ください。"}
              </p>
              <button type="button" onClick={() => { setSent(false); setErrorMessage("") }} className="mt-8 text-xs font-semibold tracking-[0.08em] text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-900">
                {isEn ? "Use a different email address" : "別のメールアドレスでやり直す"}
              </button>
            </div>
          ) : (
            <form onSubmit={handleReset}>
              <label htmlFor="reset-email" className="text-[11px] font-semibold tracking-[0.14em] text-neutral-400">EMAIL ADDRESS</label>
              <input id="reset-email" type="email" placeholder="EMAIL" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" inputMode="email" required className={`${inputClass} mt-4`} />

              {errorMessage && <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-relaxed text-rose-700">{errorMessage}</p>}

              <button type="submit" disabled={loading} className="mt-8 w-full rounded-2xl border border-neutral-900 bg-neutral-900 px-6 py-4 text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? (isEn ? "SENDING..." : "送信中...") : (isEn ? "SEND RESET LINK" : "再設定リンクを送信")}
              </button>
            </form>
          )}

          <div className="mt-8 border-t border-neutral-100 pt-6">
            <Link href={`${prefix}/login`} className="text-xs font-medium tracking-[0.06em] text-neutral-500 transition hover:text-neutral-900">
              ← {isEn ? "Back to login" : "ログイン画面に戻る"}
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
