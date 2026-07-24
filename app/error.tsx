"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"

type Props = {
  error: Error & { digest?: string }
  reset: () => void
}

export default function RootError({ error, reset }: Props) {
  const pathname = usePathname()
  const isEn = pathname?.startsWith('/en') ?? false

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-20 text-center">
      <p className="type-label text-[11px] tracking-[0.14em] text-subtle uppercase">
        Error
      </p>

      <h1 className="mt-6 type-brand text-4xl md:text-5xl tracking-[0.08em] text-foreground">
        Something went wrong
      </h1>

      <p className="mt-6 max-w-md text-sm leading-8 text-muted">
        {isEn ? (
          <>
            An error occurred while loading the page.
            <br />
            Please try again after a few moments.
          </>
        ) : (
          <>
            ページの読み込み中にエラーが発生しました。
            <br />
            時間を置いて再度お試しください。
          </>
        )}
      </p>

      <button
        onClick={() => reset()}
        className="mt-10 border border-border bg-white rounded-xl px-8 py-3 text-xs font-medium tracking-[0.1em] uppercase transition-all duration-200 hover:bg-foreground hover:text-background hover:border-foreground active:scale-[0.98]"
      >
        {isEn ? "Retry" : "再試行"}
      </button>
    </main>
  )
}