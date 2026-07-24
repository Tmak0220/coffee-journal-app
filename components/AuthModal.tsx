"use client"

import { useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { useAuthModal } from "@/context/AuthModalContext"

type StatusMessage = {
  text: string
  type: "error" | "success"
}

export default function AuthModal() {
  const router = useRouter()
  const pathname = usePathname()
  const { isOpen, closeAuthModal } = useAuthModal()
  const lang = pathname.startsWith("/en/") || pathname === "/en" ? "en" : "ja"
  const isEn = lang === "en"

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)

  if (!isOpen) return null

  const handleModalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatusMessage(null)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      setStatusMessage({ 
        text: error.status === 400 ? "メールアドレスまたはパスワードが正しくありません。" : "ログインに失敗しました。もう一度お試しください。", 
        type: "error" 
      })
      return
    }

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      setStatusMessage({ text: "ユーザー情報の取得に失敗しました", type: "error" })
      return
    }

    const { error: profileError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        email: user.email,
      })

    if (profileError) {
      console.log(profileError)
    }

    setLoading(false)
    closeAuthModal()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-neutral-950/25 backdrop-blur-sm" 
        onClick={closeAuthModal}
      />
      
      <form 
        onSubmit={handleModalLogin}
        className="relative w-full max-w-md rounded-3xl border border-neutral-200 bg-white/95 p-7 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-200 sm:p-9"
      >
        <button 
          type="button"
          onClick={closeAuthModal}
          className="absolute right-5 top-5 flex size-8 items-center justify-center rounded-full border border-neutral-200 text-xs text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-900"
        >
          ✕
        </button>

        <div className="pr-10 text-left">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-neutral-400">ACCOUNT</p>
          <h2 className="mt-4 text-2xl font-light tracking-[0.04em] text-neutral-900">
            {isEn ? "Log in to continue" : "ログインして続ける"}
          </h2>
          <p className="mt-4 text-sm leading-7 text-neutral-500">
            {isEn ? "Log in to follow this account. Browsing profiles and posts does not require an account." : "フォローするにはログインが必要です。プロフィールや投稿はログインせずに閲覧できます。"}
          </p>
        </div>

        <div className="mt-8 flex flex-col gap-3.5">
          <input
            type="email"
            placeholder="EMAIL"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/5"
          />

          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/5"
          />
        </div>

        {statusMessage && (
          <div className={`mt-4 text-xs p-3 rounded-xl border ${
            statusMessage.type === "error" 
              ? "text-red-500 bg-red-50/50 border-red-200" 
              : "text-foreground bg-neutral-50 border-border"
          }`}>
            {statusMessage.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-2xl border border-neutral-900 bg-neutral-900 px-8 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? (isEn ? "Logging in..." : "ログイン中...") : (isEn ? "LOG IN" : "ログイン")}
        </button>

        <div className="mt-6 border-t border-neutral-100 pt-5 text-center">
          <p className="text-xs text-neutral-500">{isEn ? "Don't have an account?" : "アカウントをお持ちでない方"}</p>
          <Link href={`/${lang}/login`} onClick={closeAuthModal} className="mt-2 inline-block text-xs font-semibold tracking-wide text-neutral-900 underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900">
            {isEn ? "CREATE AN ACCOUNT" : "新規登録へ"}
          </Link>
        </div>
      </form>
    </div>
  )
}
