"use client"

import { useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"

type Log = {
  varieties: string[]
  processes: string[]
  flavorTags: string[]
}

type Props = {
  userId: string
  lang?: string
}

const analyticsDict = {
  ja: {
    noData: "データがありません",
    loading: "投稿データを集計中...",
    posts: "対象投稿",
    unit: "回",
    other: "その他",
    titleVariety: "Varieties (品種)",
    titleProcess: "Process (精製方法)",
    titleFlavor: "Favorite Tastes (テイスト)"
  },
  en: {
    noData: "No data available",
    loading: "Analyzing your posts...",
    posts: "Posts analyzed",
    unit: "times",
    other: "Other",
    titleVariety: "Varieties",
    titleProcess: "Process",
    titleFlavor: "Favorite Tastes"
  }
} as const

const relationValue = (relation: unknown): Record<string, unknown> | null => {
  if (Array.isArray(relation)) return (relation[0] as Record<string, unknown>) || null
  return relation && typeof relation === "object" ? relation as Record<string, unknown> : null
}

export default function CoffeeAnalyticsCharts({ userId, lang = "ja" }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = analyticsDict[currentLang]
  const [logs, setLogs] = useState<Log[]>([])
  const [postCount, setPostCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const loadAnalytics = async () => {
      setLoading(true)
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id")
        .eq("user_id", userId)
        .eq("type", "blog")
        .neq("visibility", "draft")

      if (!active) return
      if (postsError) {
        console.error("Coffee analytics posts fetch error:", postsError)
        setLogs([])
        setPostCount(0)
        setLoading(false)
        return
      }

      const postIds = (posts || []).map((post) => post.id)
      setPostCount(postIds.length)
      if (postIds.length === 0) {
        setLogs([])
        setLoading(false)
        return
      }

      const [varietyResult, processResult, tasteResult] = await Promise.all([
        supabase
          .from("post_varieties")
          .select("post_id, varieties(name, name_ja)")
          .in("post_id", postIds),
        supabase
          .from("post_processes")
          .select("post_id, processes(name, name_ja)")
          .in("post_id", postIds),
        supabase
          .from("post_tastes")
          .select("post_id, tastes!fk_post_tastes_taste_id(name, name_ja)")
          .in("post_id", postIds),
      ])

      if (!active) return
      const rows = new Map<string, Log>(postIds.map((id) => [id, { varieties: [], processes: [], flavorTags: [] }]))
      const localizedName = (record: Record<string, unknown> | null) => {
        if (!record) return null
        const primary = currentLang === "ja" ? record.name_ja : record.name
        const fallback = currentLang === "ja" ? record.name : record.name_ja
        return typeof primary === "string" && primary.trim()
          ? primary.trim()
          : typeof fallback === "string" && fallback.trim() ? fallback.trim() : null
      }

      for (const row of varietyResult.data || []) {
        const name = localizedName(relationValue(row.varieties))
        if (name) rows.get(row.post_id)?.varieties.push(name)
      }
      for (const row of processResult.data || []) {
        const name = localizedName(relationValue(row.processes))
        if (name) rows.get(row.post_id)?.processes.push(name)
      }
      for (const row of tasteResult.data || []) {
        const name = localizedName(relationValue(row.tastes))
        if (name) rows.get(row.post_id)?.flavorTags.push(name)
      }

      if (varietyResult.error) console.error("Coffee analytics varieties fetch error:", varietyResult.error)
      if (processResult.error) console.error("Coffee analytics processes fetch error:", processResult.error)
      if (tasteResult.error) console.error("Coffee analytics tastes fetch error:", tasteResult.error)
      setLogs(Array.from(rows.values()))
      setLoading(false)
    }

    void loadAnalytics()
    return () => { active = false }
  }, [currentLang, userId])

  const analyticsData = useMemo(() => {
    const count = (values: string[][]) => {
      const map = new Map<string, number>()
      values.flat().forEach((value) => map.set(value, (map.get(value) || 0) + 1))
      return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    }
    return {
      varieties: count(logs.map((log) => log.varieties)),
      processes: count(logs.map((log) => log.processes)),
      flavors: count(logs.map((log) => log.flavorTags)),
    }
  }, [logs])

  const DistributionBars = ({ data, accent }: { data: { name: string; value: number }[]; accent: string }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    if (total === 0) return <p className="py-8 text-center text-[11px] text-neutral-400">{t.noData}</p>

    const visible = data.length <= 8
      ? data
      : [...data.slice(0, 7), { name: t.other, value: data.slice(7).reduce((sum, item) => sum + item.value, 0) }]

    return (
      <div className="mt-5 space-y-4">
        {visible.map((item) => {
          const percentage = (item.value / total) * 100
          return (
            <div key={item.name}>
              <div className="mb-1.5 flex items-end justify-between gap-3 text-xs">
                <span className="min-w-0 truncate font-medium text-neutral-700">{item.name}</span>
                <span className="shrink-0 font-mono text-[10px] text-neutral-500">
                  {percentage.toFixed(1)}% · {item.value}{currentLang === "ja" ? t.unit : ` ${t.unit}`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                <div className={`h-full rounded-full transition-[width] duration-500 ${accent}`} style={{ width: `${percentage}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (loading) {
    return <div className="py-14 text-center text-xs tracking-wide text-neutral-400 animate-pulse">{t.loading}</div>
  }

  return (
    <div>
      <p className="mb-4 font-mono text-[10px] uppercase tracking-wider text-neutral-400">{t.posts}: {postCount}</p>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{t.titleVariety}</h4>
          <DistributionBars data={analyticsData.varieties} accent="bg-amber-500/75" />
        </section>
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{t.titleProcess}</h4>
          <DistributionBars data={analyticsData.processes} accent="bg-sky-600/70" />
        </section>
        <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">{t.titleFlavor}</h4>
          <DistributionBars data={analyticsData.flavors} accent="bg-rose-500/70" />
        </section>
      </div>
    </div>
  )
}
