"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { LayoutDashboard, Bookmark, Globe } from "lucide-react"

export default function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState<string | null>(null)
  const [hasMemberAccess, setHasMemberAccess] = useState(false)
  const [search, setSearch] = useState("")
  const [lang, setLang] = useState<"ja" | "en">("ja")
  
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const isEnPath = pathname.startsWith('/en/') || pathname === '/en'
    setLang(isEnPath ? "en" : "ja")
    setMounted(true)
  }, [pathname])

  useEffect(() => {
    const syncUserAccess = async (userId?: string, userEmail?: string | null) => {
      let id = userId
      let resolvedEmail = userEmail

      if (!id) {
        const { data: { user } } = await supabase.auth.getUser()
        id = user?.id
        resolvedEmail = user?.email
      }

      if (!id) {
        setEmail(null)
        setHasMemberAccess(false)
        return
      }

      setEmail(resolvedEmail ?? null)
      const { data: profile } = await supabase
        .from("users")
        .select("membership_tier, role")
        .eq("id", id)
        .maybeSingle()

      setHasMemberAccess(profile?.role === "admin" || Boolean(profile?.membership_tier && profile.membership_tier !== "free"))
    }

    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setEmail(user?.email ?? null)
      await syncUserAccess(user?.id, user?.email)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null)
      void syncUserAccess(session?.user?.id, session?.user?.email)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const changeLanguage = (newLang: "ja" | "en") => {
    if (newLang === lang) return

    let cleanPath = pathname
    if (pathname.startsWith("/en/")) {
      cleanPath = pathname.replace("/en/", "/")
    } else if (pathname === "/en") {
      cleanPath = "/"
    } else if (pathname.startsWith("/ja/")) {
      cleanPath = pathname.replace("/ja/", "/")
    } else if (pathname === "/ja") {
      cleanPath = "/"
    }

    let newPath = cleanPath
    if (newLang === "en") {
      newPath = cleanPath === "/" ? "/en" : `/en${cleanPath}`
    } else if (newLang === "ja") {
      newPath = cleanPath === "/" ? "/ja" : `/ja${cleanPath}`
    }

    const currentQuery = searchParams.toString()
    const targetUrl = currentQuery ? `${newPath}?${currentQuery}` : newPath

    document.cookie = `lang=${newLang}; path=/; max-age=${60 * 60 * 24 * 365}`
    router.push(targetUrl)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!search.trim()) return
    const prefix = lang === "en" ? "/en" : "/ja"
    router.push(`${prefix}/search/result?q=${encodeURIComponent(search)}`)
  }

  const getReturnToPath = () => {
    if (pathname.endsWith("/login")) {
      return lang === "en" ? "/en" : "/ja"
    }

    const params = new URLSearchParams(searchParams.toString())
    params.delete('redirectTo')

    const cleanQuery = params.toString()
    return cleanQuery ? `${pathname}?${cleanQuery}` : pathname
  }

  const returnTo = getReturnToPath()

  const activeLang = mounted ? lang : "ja"

  const t = {
    ja: {
      title: "COFFEE JOURNAL",
      placeholder: "ロースター、品種、精製方法など...",
      searchBtn: "検索",
      dashboard: "ダッシュボード",
      bookmark: "ブックマーク",
      logout: "ログアウト",
      signin: "サインイン",
      homePath: "/ja",
      dashboardPath: "/ja/dashboard",
      bookmarkPath: "/ja/bookmarks",
      loginPath: "/ja/login"
    },
    en: {
      title: "COFFEE JOURNAL",
      placeholder: "Roaster, Varietal, Process...",
      searchBtn: "Search",
      dashboard: "Dashboard",
      bookmark: "Bookmarks",
      logout: "Sign Out",
      signin: "Sign In",
      homePath: "/en",
      dashboardPath: "/en/dashboard",
      bookmarkPath: "/en/bookmarks",
      loginPath: "/en/login"
    }
  }[activeLang]

  return (
    <header className="sticky top-0 z-50 flex w-full flex-col gap-3 overflow-hidden border-b border-neutral-100 bg-white px-4 py-3 shadow-[0_1px_0_rgba(226,226,231,0.22)] transition-all duration-300 sm:gap-4 sm:px-6 sm:py-5 md:flex-row md:items-center md:justify-between md:gap-8 md:px-10 md:py-7">
      
      <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 md:w-auto md:gap-8">
        <Link href={t.homePath} className="site-header-logo type-brand block shrink-0 border-0 bg-transparent p-0 text-left text-lg font-bold tracking-wide text-neutral-900 shadow-none sm:text-xl md:text-2xl">
          {t.title}
        </Link>

        <form onSubmit={handleSearch} className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <input
            type="text"
            placeholder={t.placeholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 w-full rounded-xl border border-neutral-200/60 bg-white/70 px-3.5 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400/70 transition focus:border-neutral-400 focus:bg-white focus:outline-none sm:w-52 sm:text-xs md:w-72"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-neutral-200/60 bg-white/70 px-4 py-2.5 text-xs font-bold tracking-wider text-neutral-900 shadow-xs transition hover:bg-white active:scale-[0.98] sm:px-5"
          >
            {t.searchBtn}
          </button>
        </form>
      </div>

      <div className="flex w-full min-w-0 items-center justify-between gap-3 border-t border-neutral-200/30 pt-3 text-xs text-neutral-900 sm:justify-end sm:gap-5 md:w-auto md:gap-8 md:border-t-0 md:pt-0">
        
        <div className="flex min-w-0 items-center gap-3 sm:gap-5 md:gap-8">
          {email ? (
            <>
              {hasMemberAccess && (
                <>
                  <Link href={t.dashboardPath} className="flex flex-col items-center gap-1.5 hover:text-neutral-500 transition">
                    <LayoutDashboard size={19} strokeWidth={1.8} />
                    <span className="font-bold tracking-wide text-[9px] md:text-[10px]">{t.dashboard}</span>
                  </Link>

                  <Link href={t.bookmarkPath} className="flex flex-col items-center gap-1.5 hover:text-neutral-500 transition">
                    <Bookmark size={19} strokeWidth={1.8} />
                    <span className="font-bold tracking-wide text-[9px] md:text-[10px]">{t.bookmark}</span>
                  </Link>
                </>
              )}

              <button
                onClick={handleLogout}
                className="rounded-xl border border-neutral-200/60 bg-white/60 px-3 py-2.5 text-[10px] font-bold tracking-wide text-neutral-900 transition hover:bg-white active:scale-[0.97] sm:px-4 md:text-xs"
              >
                {t.logout}
              </button>
            </>
          ) : (
            <div className="flex items-center text-neutral-900">
              <Link 
                href={`${t.loginPath}?redirectTo=${encodeURIComponent(returnTo)}`} 
                className="type-ui border border-neutral-200 rounded-xl px-4 py-2.5 text-[10px] sm:text-xs tracking-wider hover:bg-neutral-50 transition uppercase font-bold"
              >
                {t.signin}
              </Link>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 border border-neutral-200/60 bg-white/50 rounded-xl p-1 shrink-0">
          <div className="text-neutral-400 p-1 hidden sm:block">
            <Globe size={13} strokeWidth={1.8} />
          </div>
          <button
            onClick={() => changeLanguage("ja")}
            className={`px-2.5 py-1.5 text-[9px] font-mono font-bold rounded-lg transition-all sm:px-3 ${
              activeLang === "ja" 
                ? "bg-neutral-900 text-white shadow-xs" 
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            JA
          </button>
          <button
            onClick={() => changeLanguage("en")}
            className={`px-2.5 py-1.5 text-[9px] font-mono font-bold rounded-lg transition-all sm:px-3 ${
              activeLang === "en" 
                ? "bg-neutral-900 text-white shadow-xs" 
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            EN
          </button>
        </div>

      </div>
    </header>
  )
}