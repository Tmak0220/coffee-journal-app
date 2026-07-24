"use client"

import { useState, useEffect, useMemo, useRef } from "react"

type R2Image = {
  key: string
  url: string
  size: number
  lastModified: string
}

export default function R2ImageViewer({ lang = "ja" }: { lang?: "ja" | "en" }) {
  const [images, setImages] = useState<R2Image[]>([])
  const [totalCount, setTotalCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(false)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest")
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>("all")

  const pageRef = useRef<number>(0)
  const isEn = lang === "en"

  // 利用可能な年月（2018年〜現在まで自動生成）
  const availableMonths = useMemo(() => {
    const months: string[] = []
    const startYear = 2018
    const currentYear = new Date().getFullYear()
    for (let year = currentYear; year >= startYear; year--) {
      for (let month = 12; month >= 1; month--) {
        months.push(`${year}-${String(month).padStart(2, "0")}`)
      }
    }
    return months
  }, [])

  const fetchImages = async (isInitial = false) => {
    if (loading) return
    setLoading(true)
    setError(null)

    if (isInitial) {
      pageRef.current = 0 
    }

    try {
      const params = new URLSearchParams({
        page: String(pageRef.current),
        sortOrder: sortOrder,
        selectedYearMonth: selectedYearMonth
      })

      const res = await fetch(`/api/admin/r2-images?${params.toString()}`)
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP error! status: ${res.status}`)
      }
      
      const data = await res.json()
      const newImages = data.images || []
      
      if (isInitial) {
        setImages(newImages)
      } else {
        setImages(prev => {
          const combined = [...prev, ...newImages]
          return combined.filter((img, idx, self) => self.findIndex(i => i.key === img.key) === idx)
        })
      }
      
      setTotalCount(data.totalCount || 0)
      setHasMore(data.hasMore ?? false)
      
      pageRef.current = pageRef.current + 1

    } catch (err: any) {
      console.error("R2 fetch error:", err)
      setError(err.message || "画像の取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setImages([])
    setHasMore(true)
    fetchImages(true)
  }, [sortOrder, selectedYearMonth])

  const copyToClipboard = (text: string) => {
    if (!navigator.clipboard) return
    navigator.clipboard.writeText(text)
    setCopiedKey(text)
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // 💡 ダッシュボードのデザイントレンドに合わせた美しいセレクトボックススタイル
  const selectBoxStyle = "text-[14px] font-normal border border-neutral-300 rounded-xl px-4 py-2.5 bg-white text-neutral-800 focus:outline-none focus:border-neutral-400 focus:ring-4 focus:ring-neutral-100 cursor-pointer transition-all duration-300 pr-9 appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%22%20fill%3D%22none%22%20stroke%3D%22%23737373%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat shadow-sm"

  return (
    <div className="bg-white border border-neutral-200 pt-6 sm:pt-10 pb-10 sm:pb-16 px-6 sm:px-10 rounded-3xl shadow-sm w-full max-w-5xl mx-auto space-y-8">
      
      {/* コントロールヘッダー領域 */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-neutral-100 pb-5">
        <div>
          <h2 className="text-[15px] font-bold tracking-wider text-neutral-900 uppercase">
            R2 STORAGE IMAGES
          </h2>
          <p className="mt-1 text-[11px] font-mono tracking-wider text-neutral-400 uppercase">
            TOTAL: {images.length} / {totalCount} IMAGES
          </p>
          <p className="text-[12px] text-neutral-400 mt-1.5 font-normal">
            {isEn ? "View and sort storage assets in real-time." : "バケット内の画像オブジェクトをリアルタイムで確認・ソートできます。"}
          </p>
        </div>
        
        {/* フィルタリングUIマウント部分 */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select value={selectedYearMonth} onChange={(e) => setSelectedYearMonth(e.target.value)} className={selectBoxStyle}>
            <option value="all">{isEn ? "All Months" : "すべての年月"}</option>
            {availableMonths.map((ym) => {
              const [year, month] = ym.split("-")
              return (
                <option key={ym} value={ym}>
                  {!isEn ? `${year}年${parseInt(month, 10)}月` : ym}
                </option>
              )
            })}
          </select>

          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} className={selectBoxStyle}>
            <option value="newest">{isEn ? "Newest first" : "新しい順"}</option>
            <option value="oldest">{isEn ? "Oldest first" : "古い順"}</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="max-w-md mx-auto p-4 border border-red-200 bg-red-50/50 rounded-xl text-center text-xs text-red-500">
          エラーが発生しました: {error}
        </div>
      )}

      {images.length === 0 && !loading ? (
        <div className="text-center py-24 text-neutral-400 text-[14px] tracking-wide font-normal">
          {isEn ? "No image assets match the selected criteria." : "該当する画像データがありません。"}
        </div>
      ) : (
        <>
          {/* グリッドレイアウト */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img) => (
              <div key={img.key} className="group bg-white border border-neutral-200 hover:border-neutral-300 rounded-xl overflow-hidden flex flex-col transition-all duration-300 shadow-sm hover:shadow-md">
                <div className="w-full aspect-square bg-neutral-50 border-b border-neutral-100 overflow-hidden relative">
                  <img src={img.url} alt={img.key} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" loading="lazy" />
                  <div className="absolute inset-0 bg-neutral-950/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-2">
                    <button
                      type="button"
                      onClick={() => copyToClipboard(img.url)}
                      className="text-[11px] text-white tracking-wide font-medium bg-neutral-950/90 hover:bg-neutral-900 px-3 py-2 rounded-xl backdrop-blur-sm transition-all duration-200 w-full text-center truncate shadow-sm active:scale-[0.97]"
                    >
                      {copiedKey === img.url ? (isEn ? "Copied! ✨" : "コピー完了!") : (isEn ? "Copy URL" : "URLをコピー")}
                    </button>
                  </div>
                </div>
                <div className="p-3.5 space-y-1.5 bg-white flex-1 flex flex-col justify-between">
                  <p className="text-[12px] font-medium text-neutral-700 truncate cursor-pointer hover:text-neutral-900 transition-colors" title={img.key} onClick={() => copyToClipboard(img.key)}>
                    {img.key}
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono text-neutral-400 pt-1 border-t border-neutral-50">
                    <span>{formatSize(img.size)}</span>
                    <span>{new Date(img.lastModified).toLocaleDateString("ja-JP", { month: "2-digit", day: "2-digit" })}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 追加読み込みボタン */}
          {hasMore && (
            <div className="flex justify-center pt-8">
              <button
                type="button"
                onClick={() => fetchImages(false)}
                disabled={loading}
                className="text-[14px] font-medium border border-neutral-300 text-neutral-700 hover:text-neutral-900 hover:border-neutral-400 bg-white px-8 py-2.5 rounded-xl transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-50 select-none"
              >
                {loading ? (isEn ? "Loading..." : "読み込み中...") : (isEn ? "もっと見る" : "もっと見る")}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}