"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "@/lib/supabase"

export function AuthListener() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        const lang = pathname.startsWith("/en/") || pathname === "/en" ? "en" : "ja"
        const pathWithoutLang = pathname.replace(/^\/(ja|en)(?=\/|$)/, "") || "/"
        const protectedRoutes = ["/dashboard", "/bookmarks", "/edit-post"]
        const isProtectedRoute = protectedRoutes.some((route) => pathWithoutLang === route || pathWithoutLang.startsWith(`${route}/`))

        if (isProtectedRoute) {
          router.push(`/${lang}`)
          router.refresh()
        } else {
          router.refresh()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [pathname, router])

  return null
}
