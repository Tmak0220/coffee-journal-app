"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

type Roaster = {
  id: string
  name: string
  image_url: string | null
  location?: string // originsテーブルの国名や地域名など
}

export default function FeaturedRoasters() {
  const [roasters, setRoasters] = useState<Roaster[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        // origins テーブルから roaster タイプを数件ピックアップ
        const { data } = await supabase
          .from("origins")
          .select("id, name, image_url")
          .eq("category_type", "roaster")
          .limit(2) // とりあえず2件表示
        
        // 画像がない場合のデフォルトモックをブレンド
        const formattedData = (data || []).map((r, idx) => ({
          ...r,
          location: "国内登録ショップ",
          image_url: r.image_url || [
            "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?q=80&w=300&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=300&auto=format&fit=crop"
          ][idx % 2]
        }))

        setRoasters(formattedData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    fetchFeatured()
  }, [])

  if (loading) return <div className="h-28 bg-neutral-50 rounded-2xl animate-pulse" />
  if (roasters.length === 0) return null

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950 border-b border-neutral-100 pb-2">
        RECOMMENDED ROASTERS / 注目のロースター
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roasters.map((roaster) => (
          <Link
            key={roaster.id}
            href={`/search/result?q=${roaster.name}`}
            className="group flex gap-4 border border-border bg-surface rounded-2xl p-3.5 hover:border-neutral-300 transition duration-300 active:scale-[0.995]"
          >
            <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-neutral-100 flex-shrink-0">
              {roaster.image_url && (
                <Image
                  src={roaster.image_url}
                  alt={roaster.name}
                  fill
                  sizes="96px"
                  className="object-cover transition duration-500 group-hover:scale-[1.03]"
                />
              )}
            </div>
            <div className="flex flex-col justify-center py-0.5 min-w-0">
              <span className="text-[9px] text-subtle font-medium">{roaster.location}</span>
              <h3 className="text-sm font-bold text-foreground truncate group-hover:underline mt-0.5">
                {roaster.name}
              </h3>
              <span className="text-[9px] text-amber-800 font-mono font-bold mt-2">VIEW NOTES ➔</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}