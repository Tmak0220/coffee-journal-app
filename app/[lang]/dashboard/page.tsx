"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import UnifiedDashboard from "./_components/UnifiedDashboard"
import { DashboardSkeleton } from "@/components/ui/PageSkeletons"

type ToolType = "recipe" | "profile" | "cupping"

type UserProfile = {
  id: string
  username: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  cover_url: string | null
  role: "user" | "pro" | "owner" | "admin"
  enabled_tools: ToolType[]
}

type Props = {
  params: Promise<{ lang: "ja" | "en" }>
}

const dict = {
  ja: {
    title: "ダッシュボード",
    menu: "メニュー",
    tabPersonal: "ユーザー",
    tabPro: "プロ",
    tabShop: "オーナー",
    tabCurator: "アドミニストレーター"
  },
  en: {
    title: "Dashboard",
    menu: "MENU",
    tabPersonal: "USER",
    tabPro: "PRO",
    tabShop: "OWNER",
    tabCurator: "ADMINISTRATOR"
  }
}

export default function DashboardPage({ params }: Props) {
  const router = useRouter()
  const { lang } = use(params)
  const t = dict[lang] || dict.ja

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [enabledTools, setEnabledTools] = useState<ToolType[]>([])
  const [logs, setLogs] = useState<any[]>([])

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const currentPrefix = lang === "en" ? "/en" : "/ja"
      
      if (!user) { 
        router.push(`${currentPrefix}/login`)
        return 
      }

      setUserId(user.id)

      // 1. プロファイルデータの取得
      const { data: profData, error: profError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle()

      if (profError) {
        console.error("Profile fetch error detail:", profError)
        router.replace(`${currentPrefix}/login`)
        return
      }
      
      if (profData) {
        setProfile(profData)
        setEnabledTools(profData.enabled_tools || ["recipe", "profile", "cupping"])
      } else {
        router.replace(`${currentPrefix}/login`)
        return
      }

      // 🔑 修正ポイント：ユーザーページ(UserPageClient)と同じデータ構造に整えて取得する
      const [memosRes, postsRes] = await Promise.all([
        supabase
          .from("calendar_memos")
          .select("id, title, start_date, end_date, memo, visibility")
          .eq("user_id", user.id)
          .eq("lang", lang),
        supabase
          .from("posts")
          .select("id, title, event_date, end_date, description, visibility")
          .eq("user_id", user.id)
          .eq("lang", lang)
      ])

      // calendar_memos の整形（start_date を event_date に統一）
      const memoItems = (memosRes.data || []).map((m) => ({
        id: m.id,
        title: m.title,
        event_date: m.start_date,
        end_date: m.end_date || null,
        memo: m.memo || null,
        visibility: m.visibility,
        type: "memo" as const,
      }))

      // posts の整形
      const postItems = (postsRes.data || []).map((p) => ({
        id: p.id,
        title: p.title || "Untitled",
        event_date: p.event_date,
        end_date: p.end_date || null,
        memo: p.description || null,
        visibility: p.visibility || "public",
        type: "report" as const,
      }))

      // 両方を合体させてカレンダー用データ（logs）に渡す
      setLogs([...memoItems, ...postItems])

    } catch (e) {
      console.error("Dashboard core error:", e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [router, lang])

  const handleToggleTool = async (tool: ToolType) => {
    if (!profile) return
    
    const updatedTools = enabledTools.includes(tool)
      ? enabledTools.filter((t) => t !== tool)
      : [...enabledTools, tool]
    
    setEnabledTools(updatedTools)

    await supabase
      .from("users")
      .update({ enabled_tools: updatedTools })
      .eq("id", profile.id)
  }

  if (loading) return <DashboardSkeleton />

  if (!profile || !userId) return null

  return (
    <UnifiedDashboard 
      profile={profile}
      userId={userId}
      logs={logs}
      enabledTools={enabledTools}
      onToggleTool={handleToggleTool}
      t={t}
      lang={lang}
    />
  )
}
