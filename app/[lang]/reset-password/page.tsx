"use client"

import { FormEvent, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"

export default function ResetPasswordPage() {
  const params = useParams<{ lang: string }>()
  const lang = params.lang === "en" ? "en" : "ja"
  const prefix = `/${lang}`
  const isEn = lang === "en"
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [complete, setComplete] = useState(false)

  const handleUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return
    setErrorMessage("")

    if (password.length < 6) {
      setErrorMessage(isEn ? "Use at least 6 characters for your new password." : "新しいパスワードは6文字以上で入力してください。")
      return
    }
    if (password !== confirmation) {
      setErrorMessage(isEn ? "The passwords do not match. Please enter them again." : "パスワードが一致しません。もう一度ご確認ください。")
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      console.error("Password update failed:", error)
      setErrorMessage(isEn
        ? "We couldn't update your password. The reset link may have expired. Please request a new link and try again."
        : "パスワードを更新できませんでした。リンクの有効期限が切れている可能性があります。再設定リンクをもう一度お申し込みください。")
      setLoading(false)
      return
    }

    setComplete(true)
    setLoading(false)
    setTimeout(() => router.push(`${prefix}/login`), 1800)
  }

  const inputClass = "w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/5"

  return (
    <main className="public-page-shell min-h-[calc(100vh-120px)] px-4 py-8 sm:px-10 sm:py-16 md:px-14 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="type-label text-[11px] font-medium tracking-[0.14em] text-neutral-400">ACCOUNT SECURITY</p>
          <h1 className="mt-4 text-3xl font-light tracking-[0.03em] text-neutral-900 sm:text-5xl sm:tracking-[0.04em]">
            {isEn ? "Choose a new password" : "新しいパスワードを設定"}
          </h1>
          <p className="mt-5 text-sm leading-7 text-neutral-500">
            {isEn ? "Enter your new password twice to confirm it." : "確認のため、新しいパスワードを2回入力してください。"}
          </p>
        </header>

        <section className="public-panel mt-10 max-w-xl p-6 sm:p-8">
          {complete ? (
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-emerald-600">PASSWORD UPDATED</p>
              <h2 className="mt-3 text-xl font-medium text-neutral-900">{isEn ? "Your password has been updated" : "パスワードを更新しました"}</h2>
              <p className="mt-4 text-sm leading-7 text-neutral-500">{isEn ? "Taking you to the login page..." : "ログイン画面へ移動します。"}</p>
            </div>
          ) : (
            <form onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label htmlFor="new-password" className="text-[11px] font-semibold tracking-[0.14em] text-neutral-400">NEW PASSWORD</label>
                <input id="new-password" type="password" placeholder={isEn ? "AT LEAST 6 CHARACTERS" : "6文字以上"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={6} required className={`${inputClass} mt-4`} />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-[11px] font-semibold tracking-[0.14em] text-neutral-400">CONFIRM PASSWORD</label>
                <input id="confirm-password" type="password" placeholder={isEn ? "ENTER IT AGAIN" : "もう一度入力"} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" minLength={6} required className={`${inputClass} mt-4`} />
              </div>

              {errorMessage && <p role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm leading-relaxed text-rose-700">{errorMessage}</p>}

              <button type="submit" disabled={loading} className="mt-3 w-full rounded-2xl border border-neutral-900 bg-neutral-900 px-6 py-4 text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50">
                {loading ? (isEn ? "UPDATING..." : "更新中...") : (isEn ? "UPDATE PASSWORD" : "パスワードを更新")}
              </button>
            </form>
          )}

          {!complete && (
            <div className="mt-8 border-t border-neutral-100 pt-6">
              <Link href={`${prefix}/forgot-password`} className="text-xs font-medium tracking-[0.06em] text-neutral-500 transition hover:text-neutral-900">
                {isEn ? "Request a new reset link" : "再設定リンクをもう一度申し込む"}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
