"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Gear = {
  id: string
  name: string
  slug: string
  type: string
}

export default function GearIndex() {
  const [gears, setGears] = useState<Gear[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchGears = async () => {
      try {
        const { data } = await supabase
          .from("gears")
          .select("id, name, slug, type")
          .order("type", { ascending: true })
        
        setGears(data || [])
      } catch (err) {
        console.error("Gears fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchGears()
  }, [])

  if (loading) return <div className="h-12 text-xs font-mono text-subtle animate-pulse bg-neutral-50 rounded-xl" />
  if (gears.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950 border-b border-neutral-100 pb-2">
        BREWING GEARS / 抽出器具から探す
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {gears.map((gear) => (
          <Link
            key={gear.id}
            href={`/search/result?gear_slug=${gear.slug}`}
            className="border border-border bg-surface hover:bg-neutral-50 hover:border-neutral-300 rounded-xl p-3 flex flex-col gap-0.5 transition"
          >
            <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase tracking-wider">
              {gear.type === "dripper" ? "☕ DRIPPER" : "🛠️ GEAR"}
            </span>
            <span className="text-xs font-bold text-foreground">{gear.name}</span>
          </Link>
        ))}
      </div>
    </section>
  )
}