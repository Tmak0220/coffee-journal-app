"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export default function NotFound() {
  const pathname = usePathname()
  const isEn = pathname?.startsWith('/en') ?? false

  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center px-6 py-20 text-center">
      <p className="type-label text-[11px] tracking-[0.14em] text-subtle uppercase">
        404 Error
      </p>

      <h1 className="mt-6 type-brand text-4xl md:text-5xl tracking-[0.08em] text-foreground">
        Page Not Found
      </h1>

      <p className="mt-6 max-w-md text-sm leading-8 text-muted">
        {isEn ? (
          <>
            The page you are looking for does not exist
            <br />
            or may have been removed.
          </>
        ) : (
          <>
            ページが存在しないか、
            <br />
            削除された可能性があります。
          </>
        )}
      </p>

      <Link
        href={isEn ? "/en" : "/ja"}
        className="mt-10 border border-border bg-white rounded-xl px-8 py-3 text-xs font-medium tracking-[0.1em] uppercase transition-all duration-200 hover:bg-foreground hover:text-background hover:border-foreground active:scale-[0.98]"
      >
        {isEn ? "Top Page" : "トップページへ"}
      </Link>
    </main>
  )
}