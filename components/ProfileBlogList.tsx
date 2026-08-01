"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { supabase } from "@/lib/supabase"

type BlogItem = {
  id: string
  title: string
  content: string
  image_urls: string[] | null
  created_at: string
}

export default function ProfileBlogList({
  userId,
  target,
  lang,
}: {
  userId?: string | null
  target: "experts" | "origins"
  lang: "ja" | "en"
}) {
  const [blogs, setBlogs] = useState<BlogItem[]>([])
  const [loading, setLoading] = useState(true)
  const isEn = lang === "en"

  useEffect(() => {
    if (!userId) {
      setBlogs([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      const { data: sessionData } = await supabase.auth.getSession()
      const viewerId = sessionData.session?.user?.id || null
      let visible = ["public"]

      if (viewerId === userId) {
        visible = ["private", "members", "public"]
      } else if (viewerId) {
        visible = ["members", "public"]
      }

      const { data, error } = await supabase
        .from("blogs")
        .select("id, title, content, image_urls, created_at")
        .eq("user_id", userId)
        .eq("lang", lang)
        .in("publish_target", [target, "both"])
        .in("visibility", visible)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Failed to load profile blogs:", error)
        setBlogs([])
      } else {
        setBlogs((data || []).map((blog: any) => ({
          ...blog,
          image_urls: Array.isArray(blog.image_urls) ? blog.image_urls : [],
        })))
      }
      setLoading(false)
    }

    void load()
  }, [lang, target, userId])

  return (
    <section className="mt-14 border-t border-border/40 pt-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">Blogs</p>
      <h2 className="mt-2 text-sm font-bold tracking-wider text-foreground">
        {isEn ? "Published articles" : "公開ブログ"}
      </h2>

      {loading ? (
        <div className="mt-6 grid animate-pulse grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border/50">
              <div className="aspect-[4/3] bg-neutral-100" />
              <div className="space-y-3 p-4"><div className="h-3 w-1/3 rounded bg-neutral-100" /><div className="h-4 w-4/5 rounded bg-neutral-100" /></div>
            </div>
          ))}
        </div>
      ) : blogs.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-neutral-50/40 px-5 py-10 text-center">
          <p className="text-xs text-subtle">
            {isEn ? "No blog articles have been published yet." : "ブログの投稿はまだありません。"}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {blogs.map((blog) => (
            <Link
              key={blog.id}
              href={`/${lang}/blogs/${blog.id}`}
              className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_12px_30px_-10px_rgba(0,0,0,0.10)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
                {blog.image_urls?.[0] ? (
                  <Image
                    src={blog.image_urls[0]}
                    alt=""
                    fill
                    sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                    className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.05]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-300">
                    {isEn ? "No image" : "画像なし"}
                  </div>
                )}
              </div>
              <div className="flex flex-1 flex-col p-4">
                <time className="font-mono text-[9px] text-subtle">
                  {new Date(blog.created_at).toLocaleDateString(isEn ? "en-US" : "ja-JP")}
                </time>
                <h3 className="mt-2 line-clamp-2 text-[13px] font-bold leading-5 text-foreground">{blog.title}</h3>
                <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-subtle">{blog.content}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground transition-all group-hover:gap-2">
                  {isEn ? "Read article" : "記事を読む"} →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
