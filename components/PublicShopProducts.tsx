"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { supabase } from "@/lib/supabase"

type PublicProduct = {
  id: string
  platform_type: string
  title: string
  description: string | null
  product_url: string | null
  image_url: string | null
}

export default function PublicShopProducts({
  userId,
  lang,
}: {
  userId?: string | null
  lang: "ja" | "en"
}) {
  const [products, setProducts] = useState<PublicProduct[]>([])
  const [loading, setLoading] = useState(true)
  const isEn = lang === "en"

  useEffect(() => {
    if (!userId) {
      setProducts([])
      setLoading(false)
      return
    }

    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("shop_products")
        .select("id, platform_type, title, description, product_url, image_url")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Failed to load public shop products:", error)
        setProducts([])
      } else {
        setProducts(data || [])
      }
      setLoading(false)
    }

    void load()
  }, [userId])

  return (
    <section className="mt-14 border-t border-border/40 pt-10">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-subtle">Online Store</p>
      <h2 className="mt-2 text-sm font-bold tracking-wider text-foreground">
        {isEn ? "Products available online" : "オンラインストアの商品"}
      </h2>

      {loading ? (
        <div className="mt-6 grid animate-pulse grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="overflow-hidden rounded-2xl border border-border/50">
              <div className="aspect-square bg-neutral-100" />
              <div className="space-y-3 p-4"><div className="h-3 w-1/3 rounded bg-neutral-100" /><div className="h-4 w-4/5 rounded bg-neutral-100" /></div>
            </div>
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-border/70 bg-neutral-50/40 px-5 py-10 text-center">
          <p className="text-xs text-subtle">
            {isEn ? "No online store products are available yet." : "オンラインストアの商品はまだありません。"}
          </p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.map((product) => {
            const content = (
              <>
                <div className="relative aspect-square overflow-hidden bg-neutral-100">
                  {product.image_url ? (
                    <Image src={product.image_url} alt="" fill sizes="(max-width: 1023px) 50vw, 25vw" className="object-cover transition duration-700 group-hover:scale-[1.04]" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[9px] font-semibold uppercase tracking-[0.16em] text-neutral-300">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-subtle">{product.platform_type}</p>
                  <h3 className="mt-2 line-clamp-2 text-xs font-bold leading-5 text-foreground">{product.title}</h3>
                  {product.description && <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-subtle">{product.description}</p>}
                </div>
              </>
            )

            return product.product_url ? (
              <a key={product.id} href={product.product_url} target="_blank" rel="noopener noreferrer" className="group overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
                {content}
              </a>
            ) : (
              <article key={product.id} className="group overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm">
                {content}
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
