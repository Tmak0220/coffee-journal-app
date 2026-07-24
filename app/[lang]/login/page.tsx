import { Suspense } from "react"
import LoginPageClient from "./LoginPageClient"
import type { Metadata } from "next"

type Props = {
  params: Promise<{
    lang: string
  }>
}

// 1. 動的にメタデータを生成する
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const isEn = lang === "en"

  return {
    title: isEn ? "LOGIN / SIGN UP | COFFEE DATABASE" : "ログイン / 新規登録 | COFFEE DATABASE",
    description: isEn 
      ? "Sign in or create a new account to join the coffee community." 
      : "アカウントへのログインおよび新規登録、コーヒーコミュニティへの参加",
  }
}

export default async function LoginPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"

  return (
    <Suspense 
      fallback={
        <main className="min-h-screen bg-white flex items-center justify-center p-8">
          <div className="font-mono text-xs text-neutral-400 tracking-widest uppercase animate-pulse">
            {currentLang === "en" ? "INITIALIZING AUTH CONSOLE..." : "認証コンソールを起動中..."}
          </div>
        </main>
      }
    >
      {/* 2. クライアント側でも言語を識別できるように lang をプロップスで渡す */}
      <LoginPageClient lang={currentLang} />
    </Suspense>
  )
}