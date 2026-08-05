"use client"

import { useCallback, useEffect, useState } from "react"
import { requestAdminTranslation } from "@/lib/request-admin-translation"

type Item = { resource: "posts" | "blogs" | "pro_recipes" | "admin_journals"; id: string; title: string; created_at: string | null }

export default function AdminTranslationManager({ lang }: { lang: "ja" | "en" }) {
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const response = await fetch("/api/admin/translations", { cache: "no-store" })
    const body = await response.json().catch(() => ({}))
    setItems(response.ok ? body.items || [] : [])
    if (!response.ok) setMessage(body.error || "Failed to load translations")
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const translate = async (item: Item) => {
    setProcessing(`${item.resource}:${item.id}`); setMessage(null)
    try {
      await requestAdminTranslation(item.resource, item.id)
      setItems(current => current.filter(candidate => candidate.id !== item.id || candidate.resource !== item.resource))
      setMessage(lang === "en" ? "English version created." : "英語版を作成しました。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (lang === "en" ? "Translation failed." : "翻訳に失敗しました。"))
    } finally { setProcessing(null) }
  }

  const dismiss = async (item: Item) => {
    const key = `${item.resource}:${item.id}`
    setProcessing(`dismiss:${key}`); setMessage(null)
    try {
      const response = await fetch("/api/admin/translations", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resource: item.resource, id: item.id }),
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || "Failed to dismiss translation candidate")
      setItems(current => current.filter(candidate => candidate.id !== item.id || candidate.resource !== item.resource))
      setMessage(lang === "en" ? "Removed from translation suggestions." : "英語版の作成候補から外しました。")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (lang === "en" ? "Failed to remove suggestion." : "候補から外せませんでした。"))
    } finally { setProcessing(null) }
  }

  const translateAll = async () => {
    setProcessing("all"); setMessage(null)
    let completed = 0
    try {
      for (const item of items) {
        await requestAdminTranslation(item.resource, item.id)
        completed += 1
        setItems(current => current.filter(candidate => candidate.id !== item.id || candidate.resource !== item.resource))
      }
      setMessage(lang === "en" ? `${completed} English versions created.` : `${completed}件の英語版を作成しました。`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : (lang === "en" ? "Translation stopped." : "翻訳処理を停止しました。"))
    } finally { setProcessing(null) }
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-100 pb-5">
        <div><p className="text-xs font-bold tracking-[.2em] text-neutral-400">DEEPL TRANSLATION</p><h2 className="mt-2 text-xl font-bold">{lang === "en" ? "Japanese posts awaiting translation" : "英語版が未作成の投稿"}</h2></div>
        <div className="flex items-center gap-3"><span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-bold text-neutral-500">{items.length}</span>{items.length > 0 && <button type="button" disabled={Boolean(processing)} onClick={() => void translateAll()} className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold disabled:opacity-40">{processing === "all" ? (lang === "en" ? "Translating..." : "一括翻訳中...") : (lang === "en" ? "Translate all" : "すべて翻訳")}</button>}</div>
      </div>
      {message && <p className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm">{message}</p>}
      {loading ? <div className="mt-6 h-24 animate-pulse rounded-xl bg-neutral-50" /> : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">{lang === "en" ? "All Japanese posts have an English version." : "すべての日本語投稿に英語版があります。"}</p>
      ) : <div className="mt-5 divide-y divide-neutral-100">{items.map(item => {
        const key = `${item.resource}:${item.id}`
        return <div key={key} className="flex items-center justify-between gap-4 py-4"><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{item.resource}</p><p className="mt-1 truncate text-sm font-semibold">{item.title}</p></div><div className="flex shrink-0 items-center gap-2"><button type="button" disabled={Boolean(processing)} onClick={() => void dismiss(item)} className="rounded-xl border border-neutral-200 px-4 py-2 text-xs font-bold text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-900 disabled:opacity-40">{processing === `dismiss:${key}` ? (lang === "en" ? "Removing..." : "処理中...") : (lang === "en" ? "Dismiss" : "候補から外す")}</button><button type="button" disabled={Boolean(processing)} onClick={() => void translate(item)} className="rounded-xl bg-neutral-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">{processing === key ? (lang === "en" ? "Translating..." : "翻訳中...") : (lang === "en" ? "Create English" : "英語版を作成")}</button></div></div>
      })}</div>}
    </section>
  )
}
