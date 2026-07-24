"use client"

import Link from "next/link"

const TRENDING_TAGS = [
  { label: "Anaerobic", query: "anaerobic", isHot: true },
  { label: "Geisha", query: "geisha", isHot: false },
  { label: "Carbonic Maceration", query: "carbonic", isHot: true },
  { label: "Thermal Shock", query: "thermal_shock", isHot: true },
  { label: "Washed", query: "washed", isHot: false },
  { label: "Natural", query: "natural", isHot: false },
]

export default function TrendingProcess() {
  return (
    <section className="space-y-3">
      <h2 className="text-xs font-bold uppercase font-mono tracking-widest text-amber-950 border-b border-neutral-100 pb-2">
        TRENDING VARIETALS & PROCESS / トレンド・精製
      </h2>
      <div className="flex flex-wrap gap-2">
        {TRENDING_TAGS.map((item) => (
          <Link
            key={item.query}
            href={`/search/result?q=${item.query}`}
            className={`pl-3 pr-2.5 py-2 border rounded-xl text-xs font-mono flex items-center gap-2 transition duration-200 active:scale-[0.97] ${
              item.isHot 
                ? "bg-amber-950 text-amber-50 border-amber-950 font-bold shadow-sm" 
                : "bg-surface border-border text-foreground hover:bg-neutral-50"
            }`}
          >
            <span>#{item.label}</span>
            {item.isHot && (
              <span className="text-[8px] bg-amber-800 text-amber-100 px-1 py-0.2 rounded font-sans font-bold">
                🔥 HOT
              </span>
            )}
          </Link>
        ))}
      </div>
    </section>
  )
}