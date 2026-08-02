"use client"

import { FormEvent, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import Link from "next/link"

type SignupAccountType = "user" | "pro" | "owner"

type StatusMessage = {
  text: string
  type: "error" | "success"
}

type Props = {
  lang: "ja" | "en"
}

export default function LoginPageClient({ lang }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const prefix = lang === "en" ? "/en" : "/ja"

  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null)
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [signupEmail, setSignupEmail] = useState("")
  const [signupPassword, setSignupPassword] = useState("")
  const [signupAccountType, setSignupAccountType] = useState<SignupAccountType>("user")
  const [signupLoading, setSignupLoading] = useState(false)

  const t = {
    ja: {
      pageLabel: "ACCOUNT",
      pageTitle: "ログイン・新規登録",
      pageDescription: "メールアドレスとパスワードだけで利用できます。プロフィールは登録後にダッシュボードから設定できます。",
      loginSubtitle: "既にアカウントをお持ちの方",
      loginBtn: "ログイン",
      loginLoading: "ログイン中...",
      loginFailed: "ログインに失敗しました",
      forgotPassword: "パスワードをお忘れの方",
      signupSubtitle: "初めてご利用になる方",
      accountTypeLabel: "利用するアカウント",
      accountTypes: {
        user: { title: "ユーザー", description: "記録・投稿・フォローなどの基本機能" },
        pro: { title: "プロ", description: "基本機能＋EXPERTプロフィールと専門記事" },
        owner: { title: "オーナー", description: "基本機能＋ORIGINプロフィールと店舗機能" },
      },
      signupBtn: "無料で新規登録",
      signupLoading: "登録中...",
      signupSuccess: "確認メールを送信しました。メール内のリンクから登録を完了してください。",
      signupComplete: "アカウントを作成しました。",
      signupNote: "アカウント種別は登録後のダッシュボード機能と公開プロフィールに反映されます。",
    },
    en: {
      pageLabel: "ACCOUNT",
      pageTitle: "Log in or sign up",
      pageDescription: "You can get started with only your email address and password. You can complete your profile later from the dashboard.",
      loginSubtitle: "Already have an account",
      loginBtn: "LOG IN",
      loginLoading: "Logging in...",
      loginFailed: "Failed to log in",
      forgotPassword: "Forgot your password?",
      signupSubtitle: "New to Coffee Journal",
      accountTypeLabel: "Account type",
      accountTypes: {
        user: { title: "User", description: "Records, posts, follows, and other core features" },
        pro: { title: "Professional", description: "Core features plus an EXPERT profile and articles" },
        owner: { title: "Owner", description: "Core features plus one ORIGIN profile and shop tools" },
      },
      signupBtn: "CREATE FREE ACCOUNT",
      signupLoading: "Creating account...",
      signupSuccess: "We sent you a confirmation email. Open the link in the email to complete registration.",
      signupComplete: "Your account has been created.",
      signupNote: "Your selection determines the dashboard tools and public profile available to you.",
    },
  }[lang]

  const destination = (() => {
    const requested = searchParams.get("redirectTo")
    return requested?.startsWith(`/${lang}`) ? requested : prefix
  })()

  const showMessage = (text: string, type: StatusMessage["type"]) => {
    setStatusMessage({ text, type })
  }

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault()
    if (loginLoading) return
    setLoginLoading(true)
    setStatusMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      })
      if (error) throw error
      if (!data.user) throw new Error(t.loginFailed)

      router.push(destination)
      router.refresh()
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t.loginFailed, "error")
    } finally {
      setLoginLoading(false)
    }
  }

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault()
    if (signupLoading) return
    setSignupLoading(true)
    setStatusMessage(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          data: { account_type: signupAccountType },
        },
      })
      if (error) throw error

      if (data.session && data.user) {
        showMessage(t.signupComplete, "success")
        router.push(`${prefix}/dashboard`)
        router.refresh()
        return
      }

      showMessage(t.signupSuccess, "success")
      setSignupEmail("")
      setSignupPassword("")
    } catch (error) {
      showMessage(error instanceof Error ? error.message : t.loginFailed, "error")
    } finally {
      setSignupLoading(false)
    }
  }

  const inputClass = "w-full rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-500 focus:ring-2 focus:ring-neutral-900/5"
  const buttonClass = "w-full rounded-2xl border border-neutral-900 bg-neutral-900 px-6 py-4 text-xs font-semibold tracking-[0.12em] text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"

  return (
    <main className="public-page-shell min-h-[calc(100vh-120px)] px-4 py-8 sm:px-10 sm:py-16 md:px-14 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="max-w-2xl">
          <p className="type-label text-[11px] font-medium tracking-[0.14em] text-neutral-400">{t.pageLabel}</p>
          <h1 className="mt-4 text-3xl font-light tracking-[0.03em] text-neutral-900 sm:text-5xl sm:tracking-[0.04em]">{t.pageTitle}</h1>
          <p className="mt-5 text-sm leading-7 text-neutral-500">{t.pageDescription}</p>
        </header>

        {statusMessage && (
          <div className={`mt-8 rounded-2xl border px-5 py-4 text-sm ${statusMessage.type === "error" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            {statusMessage.text}
          </div>
        )}

        <div className="mt-10 grid gap-6 md:grid-cols-2 md:gap-8">
          <form onSubmit={handleLogin} className="public-panel flex h-full flex-col justify-between p-6 sm:p-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-400">LOGIN</p>
              <h2 className="mt-3 text-xl font-medium text-neutral-900">{t.loginSubtitle}</h2>
              <div className="mt-8 space-y-4">
                <input type="email" autoComplete="email" placeholder="EMAIL" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required className={inputClass} />
                <input type="password" autoComplete="current-password" placeholder="PASSWORD" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} required className={inputClass} />
              </div>
            </div>
            <div className="mt-8">
              <button type="submit" disabled={loginLoading} className={buttonClass}>{loginLoading ? t.loginLoading : t.loginBtn}</button>
              <div className="mt-4 text-center">
                <Link href={`${prefix}/forgot-password`} className="text-xs font-medium tracking-[0.04em] text-neutral-500 underline decoration-neutral-300 underline-offset-4 transition hover:text-neutral-900">
                  {t.forgotPassword}
                </Link>
              </div>
            </div>
          </form>

          <form onSubmit={handleSignup} className="public-panel flex h-full flex-col justify-between p-6 sm:p-8">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.14em] text-neutral-400">SIGN UP</p>
              <h2 className="mt-3 text-xl font-medium text-neutral-900">{t.signupSubtitle}</h2>
              <div className="mt-8 space-y-4">
                <input type="email" autoComplete="email" placeholder="EMAIL" value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} required className={inputClass} />
                <input type="password" autoComplete="new-password" minLength={6} placeholder="PASSWORD" value={signupPassword} onChange={(event) => setSignupPassword(event.target.value)} required className={inputClass} />
                <fieldset>
                  <legend className="mb-3 text-[11px] font-semibold tracking-[0.12em] text-neutral-500">{t.accountTypeLabel}</legend>
                  <div className="grid gap-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-3">
                    {(["user", "pro", "owner"] as SignupAccountType[]).map((type) => {
                      const option = t.accountTypes[type]
                      const selected = signupAccountType === type
                      return (
                        <label key={type} className={`cursor-pointer rounded-2xl border p-4 transition ${selected ? "border-neutral-950 bg-neutral-950 text-white shadow-sm" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"}`}>
                          <input type="radio" name="account_type" value={type} checked={selected} onChange={() => setSignupAccountType(type)} className="sr-only" />
                          <span className="block text-xs font-semibold">{option.title}</span>
                          <span className={`mt-2 block text-[10px] leading-5 ${selected ? "text-neutral-300" : "text-neutral-400"}`}>{option.description}</span>
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              </div>
            </div>
            <div className="mt-8">
              <button type="submit" disabled={signupLoading} className={buttonClass}>{signupLoading ? t.signupLoading : t.signupBtn}</button>
              <p className="mt-4 text-[11px] leading-relaxed text-neutral-400">
                {t.signupNote}
              </p>
            </div>
          </form>
        </div>
      </div>
    </main>
  )
}
