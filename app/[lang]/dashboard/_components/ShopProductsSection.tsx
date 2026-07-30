"use client"

import { useEffect, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"

export type ShopProduct = {
  id: string
  platform_type: "shopify" | "base" | "stores" | "square"
  external_product_id: string
  title: string
  description: string | null
  product_url: string | null
  image_url: string | null
  is_active: boolean
  origin_country: string | null
  farm_or_station: string | null
  variety: string | null
  process_method: string | null
  roast_level: string | null
  updated_at: string
}

type Props = {
  userId: string
  lang: "ja" | "en"
}

export default function ShopProductsSection({ userId, lang }: Props) {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [syncing, setSyncing] = useState<boolean>(false)
  const [syncStatus, setSyncStatus] = useState<"idle" | "success" | "error">("idle")
  const [filterPlatform, setFilterPlatform] = useState<string>("all")
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([])
  const [shopifyDomain, setShopifyDomain] = useState("")
  const handledCallback = useRef(false)

  const isEn = lang === "en"

  const fetchProducts = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from("shop_products")
        .select("*")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false })

      if (filterPlatform !== "all") {
        query = query.eq("platform_type", filterPlatform)
      }

      const { data, error } = await query
      if (error) throw error
      setProducts(data || [])
    } catch (err) {
      console.error("Error fetching shop products:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [userId, filterPlatform])

  const fetchConnections = async () => {
    const response = await fetch("/api/integrations/status")
    if (!response.ok) return
    const json = await response.json()
    setConnectedPlatforms((json.integrations || []).map((item: { platform_type: string }) => item.platform_type))
  }

  useEffect(() => { fetchConnections() }, [userId])

  const handleSyncNow = async () => {
    setSyncing(true)
    setSyncStatus("idle")
    try {
      const targets = filterPlatform === "all" ? connectedPlatforms : [filterPlatform]
      if (!targets.length) throw new Error("No connected platform")
      const responses = await Promise.all(targets.map((platform) => fetch(`/api/integrations/${platform}/sync`, { method: "POST" })))
      if (responses.some((response) => !response.ok)) throw new Error("Sync failed")
      await fetchProducts()
      setSyncStatus("success")
    } catch (err) {
      console.error(err)
      setSyncStatus("error")
    } finally {
      setSyncing(false)
      // 4秒後に通常のボタン状態に戻す
      setTimeout(() => setSyncStatus("idle"), 4000)
    }
  }

  useEffect(() => {
    const callbackUrl = new URL(window.location.href)
    const status = callbackUrl.searchParams.get("integration")
    const platform = callbackUrl.searchParams.get("platform")
    if (
      handledCallback.current ||
      status !== "success" ||
      !platform ||
      !["base", "shopify", "square"].includes(platform)
    ) return

    handledCallback.current = true
    const initialSync = async () => {
      setSyncing(true)
      setSyncStatus("idle")
      try {
        const response = await fetch(`/api/integrations/${platform}/sync`, { method: "POST" })
        if (!response.ok) throw new Error("Initial sync failed")
        await Promise.all([fetchProducts(), fetchConnections()])
        setSyncStatus("success")
      } catch (error) {
        console.error(error)
        setSyncStatus("error")
      } finally {
        setSyncing(false)
        const cleanUrl = new URL(window.location.href)
        cleanUrl.searchParams.delete("integration")
        cleanUrl.searchParams.delete("platform")
        window.history.replaceState({}, "", `${cleanUrl.pathname}${cleanUrl.search}`)
        setTimeout(() => setSyncStatus("idle"), 4000)
      }
    }

    void initialSync()
  }, [])

  const badgeStyle = "px-2 py-0.5 text-[10px] font-mono font-bold tracking-wider rounded uppercase"
  const metaTagStyle = "inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 border border-neutral-100 rounded-lg text-[12px] text-neutral-600 font-normal transition-colors"

  // 状態に応じた同期ボタンのスタイル分岐
  const getSyncButtonClass = () => {
    const base = "flex-1 sm:flex-initial text-[13px] font-medium px-4 py-2 rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-2 select-none shrink-0 border"
    if (syncing) return `${base} bg-neutral-50 border-neutral-200 text-neutral-400 cursor-not-allowed`
    if (syncStatus === "success") return `${base} bg-emerald-500 hover:bg-emerald-600 border-emerald-500 text-white font-semibold`
    if (syncStatus === "error") return `${base} bg-rose-500 hover:bg-rose-600 border-rose-500 text-white font-semibold`
    return `${base} bg-white hover:bg-neutral-50 border-neutral-300 text-neutral-700 active:scale-[0.98]`
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* 統一されたコンテナカード */}
      <div className="space-y-8 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm animate-fadeIn sm:p-8">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-neutral-400 uppercase">EC CONNECTIONS</p>
          <h2 className="mt-2 text-lg font-medium text-neutral-900">{isEn ? "Connect your online store" : "ECストアを連携"}</h2>
          <p className="mt-2 text-xs leading-6 text-neutral-500">{isEn ? "Import product data from BASE, Shopify, or Square. Only read access to products is requested." : "BASE・Shopify・Squareの商品情報を取り込みます。商品を読み取るための権限のみを使用します。"}</p>
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            {(["base", "shopify", "square"] as const).map((platform) => {
              const connected = connectedPlatforms.includes(platform)
              const shopQuery = platform === "shopify" ? `&shop=${encodeURIComponent(shopifyDomain)}` : ""
              return <div key={platform} className="rounded-2xl border border-neutral-200 bg-neutral-50/40 p-4">
                <div className="flex items-center justify-between"><span className="text-sm font-bold uppercase text-neutral-800">{platform}</span><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${connected ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-400"}`}>{connected ? (isEn ? "CONNECTED" : "連携済み") : (isEn ? "NOT CONNECTED" : "未連携")}</span></div>
                {platform === "shopify" && <input value={shopifyDomain} onChange={(event) => setShopifyDomain(event.target.value)} placeholder="your-store.myshopify.com" className="mt-4 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-xs outline-none focus:border-neutral-500" />}
                <button type="button" disabled={platform === "shopify" && !shopifyDomain.trim()} onClick={() => { window.location.href = `/api/integrations/${platform}/connect?lang=${lang}${shopQuery}` }} className="mt-4 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-900 disabled:cursor-not-allowed disabled:opacity-40">{connected ? (isEn ? "RECONNECT" : "再連携") : (isEn ? "CONNECT" : "連携する")}</button>
              </div>
            })}
          </div>
        </div>
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 border-b border-neutral-100 pb-6">
          <div>
            <h2 className="text-[14px] font-bold tracking-wider text-neutral-900 uppercase flex items-center gap-2 select-none">
              <span className={`w-2 h-2 rounded-full transition-colors duration-500 ${
                syncStatus === 'success' ? 'bg-emerald-500' : syncStatus === 'error' ? 'bg-rose-500' : 'bg-neutral-300'
              }`} />
              EC PRODUCT SYNC LINEUP
            </h2>
            <p className="text-[11px] font-normal tracking-wide text-neutral-400 mt-1">
              {isEn 
                ? "PRODUCTS AUTOMATICALLY SYNCED FROM YOUR CONNECTED SHOP" 
                : "連携中のECプラットフォームから自動同期された製品一覧"}
            </p>
          </div>

          {/* コントロールエリア */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <select 
              value={filterPlatform} 
              onChange={(e) => setFilterPlatform(e.target.value)}
              className="text-[13px] font-normal border border-neutral-300 rounded-xl px-4 py-2 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 transition-all cursor-pointer pr-8 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:12px] bg-[right_12px_center] bg-no-repeat shadow-sm"
            >
              <option value="all">{isEn ? "All Platforms" : "すべてのECサイト"}</option>
              <option value="shopify">Shopify</option>
              <option value="base">BASE</option>
              <option value="square">Square</option>
            </select>

            <button
              type="button"
              onClick={handleSyncNow}
              disabled={syncing}
              className={getSyncButtonClass()}
            >
              {syncing ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-neutral-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>{isEn ? "Syncing..." : "同期中..."}</span>
                </>
              ) : syncStatus === "success" ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span>{isEn ? "Success" : "同期完了"}</span>
                </>
              ) : syncStatus === "error" ? (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span>{isEn ? "Failed" : "同期失敗"}</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  <span>{isEn ? "Sync Now" : "今すぐ同期"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* コンテンツエリア */}
        {loading ? (
          <div aria-busy="true" className="grid animate-pulse grid-cols-2 gap-4 py-6 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-neutral-100 bg-white p-3 shadow-sm">
                <div className="aspect-square rounded-xl bg-neutral-100" />
                <div className="mt-4 h-4 w-4/5 rounded bg-neutral-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-neutral-100" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <p className="text-[14px] font-medium text-neutral-500">
              {isEn ? "No synced product data found" : "同期された商品データがまだありません"}
            </p>
            <p className="text-[12px] text-neutral-400 max-w-md mx-auto leading-relaxed">
              {isEn 
                ? "Automatically fetch product items from Shopify, BASE, or Square to seamlessly attach master beans to your pro profiles."
                : "ShopifyやBASE等のECサイトの商品データを自動で取得し、プロレシピの紐付けマスタとして利用できます。"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {products.map((product) => (
              <div 
                key={product.id} 
                className="border border-neutral-200 rounded-2xl bg-white p-5 flex gap-4 shadow-sm hover:border-neutral-300 transition-all duration-300 group"
              >
                {/* サムネイル */}
                <div className="w-20 h-20 bg-neutral-50 border border-neutral-100 rounded-xl overflow-hidden flex-shrink-0 relative">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold font-mono text-neutral-300">NO IMAGE</div>
                  )}
                  <span className={`absolute top-1.5 left-1.5 w-2 h-2 rounded-full border border-white ${product.is_active ? "bg-emerald-500" : "bg-neutral-300"}`} />
                </div>

                {/* メイン詳細 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`${badgeStyle} ${
                        product.platform_type === 'shopify' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                        product.platform_type === 'base' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-neutral-100 text-neutral-600'
                      }`}>
                        {product.platform_type}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 truncate">ID: {product.external_product_id}</span>
                    </div>

                    <h3 className="text-[14px] font-bold text-neutral-800 truncate leading-snug">
                      {product.title}
                    </h3>
                  </div>

                  {/* タグリスト */}
                  <div className="flex flex-wrap gap-1.5">
                    {product.origin_country ? (
                      <span className={metaTagStyle}>📍 {product.origin_country}</span>
                    ) : (
                      <span className="text-[11px] text-neutral-300 font-normal italic">
                        {isEn ? "No origin" : "生産国未割り当て"}
                      </span>
                    )}
                    {product.variety && <span className={metaTagStyle}>🧬 {product.variety}</span>}
                    {product.process_method && <span className={metaTagStyle}>✨ {product.process_method}</span>}
                  </div>

                  {/* フッター */}
                  <div className="flex justify-between items-center pt-2 border-t border-neutral-50 text-[10px] font-mono text-neutral-400">
                    <span>
                      {isEn ? "SYNCED: " : "同期: "} 
                      {new Date(product.updated_at).toLocaleDateString(isEn ? "en-US" : "ja-JP", { month: "2-digit", day: "2-digit" })}
                    </span>
                    {product.product_url && (
                      <a 
                        href={product.product_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-neutral-500 hover:text-neutral-900 font-medium underline flex items-center gap-0.5 transition-colors"
                      >
                        {isEn ? "Link ↗" : "ページ ↗"}
                      </a>
                    )}
                  </div>
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
