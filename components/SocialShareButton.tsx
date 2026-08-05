"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

type Props = {
  title: string
  text?: string
  lang: "ja" | "en"
  className?: string
  compact?: boolean
}

function ShareIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className} aria-hidden="true">
      <circle cx="18" cy="5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="19" r="2.5" />
      <path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" />
    </svg>
  )
}

export default function SocialShareButton({ title, text: description, lang, className = "", compact = false }: Props) {
  const [mounted, setMounted] = useState(false)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const isJa = lang === "ja"

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  const url = () => window.location.href.split("#")[0]
  const message = () => [title, description].filter(Boolean).join("\n")
  const openWindow = (href: string) => window.open(href, "_blank", "noopener,noreferrer,width=680,height=640")

  const nativeShare = async () => {
    if (!navigator.share) return
    try {
      await navigator.share({ title, text: description, url: url() })
      setOpen(false)
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") console.error("Share failed:", error)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url())
    } catch {
      const input = document.createElement("textarea")
      input.value = url()
      document.body.appendChild(input)
      input.select()
      document.execCommand("copy")
      input.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2200)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={isJa ? "投稿を共有" : "Share this post"}
        className={`flex shrink-0 items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white text-xs font-bold tracking-wider text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-50 active:scale-95 ${className}`}
      >
        <ShareIcon />
        {!compact && <span>{isJa ? "共有" : "SHARE"}</span>}
      </button>

      {mounted && open && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="share-dialog-title" className="w-full max-w-md rounded-[28px] border border-neutral-200 bg-white p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-5 border-b border-neutral-100 pb-5">
              <div>
                <p className="text-[10px] font-semibold tracking-[0.22em] text-neutral-400">SHARE</p>
                <h2 id="share-dialog-title" className="mt-2 text-lg font-semibold text-neutral-900">{isJa ? "投稿を共有" : "Share this post"}</h2>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label={isJa ? "閉じる" : "Close"} className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-xl font-light text-neutral-500 hover:bg-neutral-50">×</button>
            </div>

            <p className="mt-5 line-clamp-2 text-sm font-medium leading-6 text-neutral-700">{title}</p>
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              {typeof navigator !== "undefined" && !!navigator.share && (
                <button type="button" onClick={nativeShare} className="col-span-2 flex h-12 items-center justify-center gap-2 rounded-xl bg-neutral-900 text-xs font-semibold tracking-wider text-white hover:bg-neutral-800"><ShareIcon className="h-4 w-4" />{isJa ? "端末の共有メニュー" : "DEVICE SHARE"}</button>
              )}
              <button type="button" onClick={() => openWindow(`https://twitter.com/intent/tweet?text=${encodeURIComponent(message())}&url=${encodeURIComponent(url())}`)} className="h-12 rounded-xl border border-neutral-200 text-xs font-semibold hover:border-neutral-400">X</button>
              <button type="button" onClick={() => openWindow(`https://www.threads.net/intent/post?text=${encodeURIComponent(`${message()}\n${url()}`)}`)} className="h-12 rounded-xl border border-neutral-200 text-xs font-semibold hover:border-neutral-400">Threads</button>
              <button type="button" onClick={() => openWindow(`https://line.me/R/share?text=${encodeURIComponent(`${message()}\n${url()}`)}`)} className="h-12 rounded-xl border border-neutral-200 text-xs font-semibold hover:border-neutral-400">LINE</button>
              <button type="button" onClick={() => openWindow(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)} className="h-12 rounded-xl border border-neutral-200 text-xs font-semibold hover:border-neutral-400">Facebook</button>
              <button type="button" onClick={copyLink} className="h-12 rounded-xl border border-neutral-200 text-xs font-semibold hover:border-neutral-400">{copied ? (isJa ? "コピーしました" : "COPIED") : (isJa ? "リンクをコピー" : "COPY LINK")}</button>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-neutral-400">{isJa ? "Instagramなどへは、スマートフォンの「端末の共有メニュー」から共有できます。" : "Use the device share menu to share to Instagram and other installed apps."}</p>
          </section>
        </div>,
        document.body
      )}
    </>
  )
}
