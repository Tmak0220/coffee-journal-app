"use client"

import Link from "next/link"
import { useState } from "react"
import SectionHeading from "@/components/SectionHeading"

export type OriginLine = "americas" | "asia" | "both"

type EventOrigin = {
  id: number
  origin_slug: string
  start_year: number
  end_year: number | null
  description: string | null
  line?: OriginLine | null
  origins: {
    name: string
    name_ja: string
    region_slug: string
    country_slug: string
  } | null
}

type Props = {
  origins: EventOrigin[]
}

const PX_PER_YEAR_OFFSET = 24

type BothRow = { kind: "both"; origin: EventOrigin; anchorYear: number }
type SplitRow = { kind: "split"; americas?: EventOrigin; asia?: EventOrigin; anchorYear: number }
type TimelineRow = BothRow | SplitRow

function sortedOrigins(origins: EventOrigin[]): EventOrigin[] {
  return [...origins].sort((a, b) => a.start_year - b.start_year)
}

function periodsOverlap(a: EventOrigin, b: EventOrigin): boolean {
  const aEnd = a.end_year ?? 9999
  const bEnd = b.end_year ?? 9999
  return a.start_year <= bEnd && b.start_year <= aEnd
}

function yearOffset(year: number, anchorYear: number) {
  return Math.max(0, year - anchorYear) * PX_PER_YEAR_OFFSET
}

function buildTimelineRows(origins: EventOrigin[]): TimelineRow[] {
  const americas = sortedOrigins(origins.filter((o) => o.line === "americas"))
  const asia = sortedOrigins(origins.filter((o) => o.line === "asia"))
  const both = sortedOrigins(origins.filter((o) => o.line === "both"))

  const usedAmericas = new Set<number>()
  const usedAsia = new Set<number>()
  const splitRows: SplitRow[] = []

  for (const a of americas) {
    const match =
      asia.find((s) => !usedAsia.has(s.id) && s.start_year === a.start_year) ??
      asia.find((s) => !usedAsia.has(s.id) && periodsOverlap(a, s))

    if (match) {
      usedAmericas.add(a.id)
      usedAsia.add(match.id)
      splitRows.push({
        kind: "split",
        americas: a,
        asia: match,
        anchorYear: Math.min(a.start_year, match.start_year),
      })
    }
  }

  for (const a of americas) {
    if (!usedAmericas.has(a.id)) {
      splitRows.push({ kind: "split", americas: a, anchorYear: a.start_year })
    }
  }

  for (const s of asia) {
    if (!usedAsia.has(s.id)) {
      splitRows.push({ kind: "split", asia: s, anchorYear: s.start_year })
    }
  }

  const bothRows: BothRow[] = both.map((origin) => ({
    kind: "both",
    origin,
    anchorYear: origin.start_year,
  }))

  return [...bothRows, ...splitRows].sort(
    (a, b) => a.anchorYear - b.anchorYear || a.kind.localeCompare(b.kind),
  )
}

function OriginEntry({
  origin,
  centered = false,
}: {
  origin: EventOrigin
  centered?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  if (!origin.origins) return null

  return (
    <div className={`text-center flex flex-col items-center w-full`}>
      <p className="type-label text-[11px] tabular-nums text-subtle tracking-widest">
        {origin.start_year} — {origin.end_year ?? "Present"}
      </p>

      <Link
        href={`/origins/${origin.origins.region_slug}/${origin.origins.country_slug}/${origin.origin_slug}`}
        className="group mt-2 block mx-auto"
      >
        <h3 className="type-display text-2xl sm:text-[1.75rem] text-foreground tracking-[0.06em] uppercase font-light transition-colors group-hover:text-muted">
          {origin.origins.name}
        </h3>
        <p className="mt-1 text-[12px] tracking-[0.04em] text-muted">
          {origin.origins.name_ja}
        </p>
      </Link>

      {origin.description && (
        <div className="w-full flex flex-col items-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-4 group flex items-center gap-1.5 pb-0.5 border-b border-transparent hover:border-foreground/40 transition-all duration-300"
          >
            <span className="text-[10px] sm:text-[11px] tracking-[0.06em] text-muted group-hover:text-foreground transition-colors">
              {isExpanded ? "Close" : "Description"}
            </span>
            <span className={`text-[10px] text-muted group-hover:text-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}>
              ↓
            </span>
          </button>

          <div
            className={`w-full max-w-xl transition-all duration-500 ease-in-out grid ${
              isExpanded ? "grid-rows-[1fr] opacity-100 mt-6 pb-2" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden min-h-0 w-full">
              <p className="text-xs sm:text-[13px] text-foreground/80 leading-[2.1] tracking-wide text-center whitespace-pre-wrap px-4 sm:px-0">
                {origin.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OriginTimeline({ origins }: Props) {
  const withLine = origins.filter((o) => o.line != null)
  const hasLineData = withLine.length > 0

  if (!hasLineData) {
    return (
      <section className="mt-28 sm:mt-36">
        <SectionHeading title="Origins" titleJa="原産地" />
        <div className="mt-14 space-y-16">
          {sortedOrigins(origins).map((origin) => (
            <OriginEntry key={origin.id} origin={origin} centered />
          ))}
        </div>
      </section>
    )
  }

  const rows = buildTimelineRows(withLine)

  return (
    <section className="mt-28 sm:mt-36">
      <SectionHeading title="Origins" titleJa="原産地" />

      <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-24">
        <h3 className="text-center text-[10px] tracking-[0.15em] uppercase text-subtle font-medium border-b border-border/40 pb-3">
          Americas
        </h3>
        <h3 className="text-center text-[10px] tracking-[0.15em] uppercase text-subtle font-medium border-b border-border/40 pb-3">
          Asia & Africa
        </h3>
      </div>

      <div className="mt-12 flex flex-col gap-16">
        {rows.map((row) => {
          if (row.kind === "both") {
            return (
              <div key={`both-${row.origin.id}`} className="text-center">
                <OriginEntry origin={row.origin} centered />
              </div>
            )
          }

          return (
            <div
              key={`split-${row.americas?.id ?? "a"}-${row.asia?.id ?? "s"}`}
              className="grid grid-cols-1 items-start gap-16 md:grid-cols-2 md:gap-24"
            >
              <div style={{ paddingTop: row.americas ? yearOffset(row.americas.start_year, row.anchorYear) : 0 }}>
                {row.americas && <OriginEntry origin={row.americas} centered={false} />}
              </div>
              <div style={{ paddingTop: row.asia ? yearOffset(row.asia.start_year, row.anchorYear) : 0 }}>
                {row.asia && <OriginEntry origin={row.asia} centered={false} />}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
