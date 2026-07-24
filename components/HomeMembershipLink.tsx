"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type Props = {
  lang: "ja" | "en"
}

export default function HomeMembershipLink({ lang }: Props) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (active) setIsAuthenticated(Boolean(data.session?.user))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(Boolean(session?.user))
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (!isAuthenticated) return null

  return (
    <Link
      href={`/${lang}/members`}
      className="flex size-24 items-center justify-center border border-neutral-300 bg-white/80 text-[10px] font-semibold tracking-[0.14em] text-neutral-800 shadow-sm backdrop-blur-sm transition hover:border-neutral-900 hover:bg-neutral-900 hover:text-white sm:size-28"
    >
      MEMBERSHIP
    </Link>
  )
}
