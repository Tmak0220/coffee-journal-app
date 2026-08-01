"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type Review = { id: string; title: string | null; description: string | null; image_urls: string[] | null; created_at: string; gearName: string }

export default function ProfileGearReviews({ userId, profileType, lang }: { userId?: string | null; profileType: "expert" | "owner"; lang: "ja" | "en" }) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setReviews([])
      setLoading(false)
      return
    }
    const load = async () => {
      setLoading(true)
      const { data: selections, error: selectionError } = await supabase.from("profile_gears").select("gear_id").eq("user_id", userId).eq("profile_type", profileType)
      if (selectionError) { console.error("Failed to load profile gear selections:", selectionError); setLoading(false); return }
      const gearIds = (selections || []).map((item) => item.gear_id)
      if (!gearIds.length) { setReviews([]); setLoading(false); return }

      const { data: links, error: linkError } = await supabase.from("post_gears").select("post_id, gear_id, gears(name, name_ja, brand, brand_ja)").in("gear_id", gearIds)
      if (linkError) { console.error("Failed to load matching gear reviews:", linkError); setLoading(false); return }
      const postIds = Array.from(new Set((links || []).map((item) => item.post_id)))
      if (!postIds.length) { setReviews([]); setLoading(false); return }

      const { data: sessionData } = await supabase.auth.getSession()
      const viewerId = sessionData.session?.user?.id
      let visible = ["public"]
      if (viewerId === userId) visible = ["draft", "private", "members", "public"]
      else if (viewerId) {
        const { data: viewer } = await supabase.from("users").select("membership_tier").eq("id", viewerId).maybeSingle()
        if (viewerId) visible = ["members", "public"]
      }
      const { data: posts, error: postsError } = await supabase.from("posts").select("id, title, description, image_urls, created_at").eq("user_id", userId).eq("type", "gear_review").eq("lang", lang).in("visibility", visible).in("id", postIds).order("created_at", { ascending: false })
      if (postsError) { console.error("Failed to load profile gear reviews:", postsError); setLoading(false); return }
      const nameByPost = new Map((links || []).map((item: any) => { const gear = Array.isArray(item.gears) ? item.gears[0] : item.gears; const brand = lang === "ja" ? (gear?.brand_ja || gear?.brand) : gear?.brand; const name = lang === "ja" ? (gear?.name_ja || gear?.name) : gear?.name; return [item.post_id, [brand, name].filter(Boolean).join(" ")] }))
      setReviews((posts || []).map((post) => ({ ...post, image_urls: Array.isArray(post.image_urls) ? post.image_urls : [], gearName: nameByPost.get(post.id) || "GEAR" })))
      setLoading(false)
    }
    void load()
  }, [userId, profileType, lang])

  return <section className="mt-14 border-t border-border/40 pt-10">
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">GEAR REVIEWS</p>
    <h2 className="mt-2 text-sm font-bold tracking-wider text-foreground">{lang === "ja" ? "愛用している器具のレビュー" : "Reviews of regularly used gear"}</h2>
    {loading ? (
      <div className="mt-6 grid animate-pulse gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => <div key={index} className="overflow-hidden rounded-2xl border border-border/50"><div className="aspect-[4/3] bg-neutral-100" /><div className="space-y-3 p-4"><div className="h-3 w-1/2 rounded bg-neutral-100" /><div className="h-4 w-4/5 rounded bg-neutral-100" /></div></div>)}
      </div>
    ) : reviews.length === 0 ? (
      <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-neutral-50/40 px-5 py-10 text-center">
        <p className="text-xs text-subtle">{lang === "ja" ? "愛用している器具のレビューはまだありません。" : "No reviews of regularly used gear have been posted yet."}</p>
      </div>
    ) : (
    <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{reviews.map((review) => <Link key={review.id} href={`/${lang}/posts/${review.id}`} className="group overflow-hidden rounded-2xl border border-border/60 bg-surface transition hover:-translate-y-0.5 hover:shadow-md">
      {review.image_urls?.[0] && <div className="relative aspect-[16/9] overflow-hidden bg-neutral-100"><Image src={review.image_urls[0]} alt="" fill className="object-cover transition duration-500 group-hover:scale-[1.02]" /></div>}
      <div className="p-4"><p className="line-clamp-1 text-[9px] font-semibold tracking-[0.1em] text-neutral-500">{review.gearName}</p><h3 className="mt-2 line-clamp-2 text-[13px] font-bold leading-5 text-foreground">{review.title}</h3>{review.description && <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-subtle">{review.description}</p>}</div>
    </Link>)}</div>
    )}
  </section>
}
