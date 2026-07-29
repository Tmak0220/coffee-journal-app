"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"

type PopupTone = "success" | "error" | "info"

type ConfirmOptions = {
  title: string
  message: string
  confirmLabel: string
  cancelLabel: string
  danger?: boolean
}

type AppPopupContextValue = {
  showPopup: (message: string, tone?: PopupTone, title?: string) => void
  confirmPopup: (options: ConfirmOptions) => Promise<boolean>
}

type Notice = { message: string; tone: PopupTone; title?: string } | null

const AppPopupContext = createContext<AppPopupContextValue | null>(null)

export function AppPopupProvider({ children }: { children: React.ReactNode }) {
  const [notice, setNotice] = useState<Notice>(null)
  const [confirmation, setConfirmation] = useState<ConfirmOptions | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resolverRef = useRef<((value: boolean) => void) | null>(null)

  const showPopup = useCallback((message: string, tone: PopupTone = "info", title?: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setNotice({ message, tone, title })
    timerRef.current = setTimeout(() => setNotice(null), 5000)
  }, [])

  const confirmPopup = useCallback((options: ConfirmOptions) => {
    resolverRef.current?.(false)
    setConfirmation(options)
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve
    })
  }, [])

  const closeConfirmation = useCallback((accepted: boolean) => {
    resolverRef.current?.(accepted)
    resolverRef.current = null
    setConfirmation(null)
  }, [])

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    resolverRef.current?.(false)
  }, [])

  const toneStyles = notice?.tone === "error"
    ? "border-rose-200 bg-rose-50/95 text-rose-950"
    : notice?.tone === "success"
      ? "border-emerald-200 bg-emerald-50/95 text-emerald-950"
      : "border-sky-200 bg-sky-50/95 text-sky-950"

  return (
    <AppPopupContext.Provider value={{ showPopup, confirmPopup }}>
      {children}

      {notice && (
        <div className="fixed left-1/2 top-24 z-[120] w-max max-w-[calc(100vw-2rem)] -translate-x-1/2 animate-fadeIn" role="status" aria-live="polite">
          <div className={`flex min-w-[280px] max-w-lg items-center gap-3 rounded-xl border px-4 py-3 shadow-[0_14px_42px_-24px_rgba(0,0,0,0.32)] backdrop-blur-md ${toneStyles}`}>
            <div className="min-w-0 flex-1">
              {notice.title && <p className="text-[11px] font-bold tracking-[0.08em]">{notice.title}</p>}
              <p className={`${notice.title ? "mt-1" : ""} text-[13px] leading-[1.65]`}>{notice.message}</p>
            </div>
            <button type="button" onClick={() => setNotice(null)} className="-mr-0.5 shrink-0 rounded-full p-1 text-current opacity-40 transition-opacity hover:opacity-100" aria-label="閉じる">✕</button>
          </div>
        </div>
      )}

      {confirmation && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="app-confirm-title">
          <div className="w-full max-w-md rounded-3xl border border-neutral-200 bg-white p-7 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.45)] sm:p-8">
            <p className="mb-3 text-[10px] font-bold tracking-[0.18em] text-neutral-400">CONFIRMATION</p>
            <h2 id="app-confirm-title" className="text-lg font-bold tracking-tight text-neutral-900">{confirmation.title}</h2>
            <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">{confirmation.message}</p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => closeConfirmation(false)} className="rounded-xl border border-neutral-200 px-4 py-3 text-xs font-semibold text-neutral-600 transition-colors hover:bg-neutral-50">{confirmation.cancelLabel}</button>
              <button type="button" onClick={() => closeConfirmation(true)} className={`rounded-xl px-4 py-3 text-xs font-semibold text-white transition-colors ${confirmation.danger ? "bg-rose-600 hover:bg-rose-700" : "bg-neutral-900 hover:bg-neutral-700"}`}>{confirmation.confirmLabel}</button>
            </div>
          </div>
        </div>
      )}
    </AppPopupContext.Provider>
  )
}

export function useAppPopup() {
  const context = useContext(AppPopupContext)
  if (!context) throw new Error("useAppPopup must be used within AppPopupProvider")
  return context
}
