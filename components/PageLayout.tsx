"use client"

import Link from "next/link"
import React from "react"
import { useParams } from "next/navigation"

type BreadcrumbItem = {
  label: string
  href?: string
}

type Props = {
  title?: string
  subtitle?: string
  breadcrumbs?: BreadcrumbItem[]
  children: React.ReactNode
  titleSize?: string
}

export default function PageLayout({
  title,
  subtitle,
  breadcrumbs,
  children,
  titleSize = "text-2xl sm:text-3xl font-bold tracking-[0.08em]", 
}: Props) {
  const params = useParams()
  const lang = params?.lang === "en" ? "en" : "ja"

  const shouldRenderBreadcrumbs = breadcrumbs === undefined || breadcrumbs.length > 0

  return (
    <main className="public-page-container">
      {shouldRenderBreadcrumbs && (
        <nav className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] text-neutral-400 sm:gap-2 sm:text-sm">
          {breadcrumbs ? (
            breadcrumbs.map((item, index) => (
              <React.Fragment key={index}>
                {index > 0 && <span className="text-neutral-300 font-light">/</span>}
                {item.href ? (
                  <Link
                    href={item.href}
                    className="hover:text-black transition-colors duration-300"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="min-w-0 font-medium text-black">{item.label}</span>
                )}
              </React.Fragment>
            ))
          ) : (
            <>
              <Link
                href={`/${lang}`}
                className="hover:text-black transition-colors duration-300"
              >
                {lang === "en" ? "COFFEE JOURNAL" : "コーヒージャーナル"}
              </Link>
              <span className="text-neutral-300 font-light">/</span>
              <span className="text-black font-medium">
                {subtitle ?? title}
              </span>
            </>
          )}
        </nav>
      )}

      {title && (
        <header className={shouldRenderBreadcrumbs ? "mt-7 mb-10 border-b border-neutral-200 pb-7" : "mb-10 border-b border-neutral-200 pb-7"}>
          <h1 className={`${titleSize} type-brand pr-[0.08em] text-black uppercase`}>
            {title}
          </h1>
          {subtitle && (
            <p className="mt-2 text-xs sm:text-sm tracking-[0.04em] text-neutral-500 font-medium">
              {subtitle}
            </p>
          )}
        </header>
      )}

      <div className={!title && shouldRenderBreadcrumbs ? "mt-6" : ""}>
        {children}
      </div>
    </main>
  )
}
