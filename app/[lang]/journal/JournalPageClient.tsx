"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"

type JournalCategory = "news" | "event" | "column" | "announcement"

type Journal = {
  id: string
  title: string
  content: string
  category: JournalCategory
  is_published: boolean
  created_at: string
  source_name?: string
  source_url?: string
}

const tabDict = {
  ja: {
    all: "すべて",
    news: "ニュース",
    event: "イベント",
    column: "コラム",
    announcement: "お知らせ",
    close: "閉じる"
  },
  en: {
    all: "All",
    news: "News",
    event: "Event",
    column: "Column",
    announcement: "Announcement",
    close: "Close"
  }
}

// 🌐 サーバーコンポーネントから lang を受け取るための型定義
type Props = {
  lang: "ja" | "en"
}

export default function JournalPageClient({ lang }: Props) {
  const currentLang = lang === "en" ? "en" : "ja"
  const t = tabDict[currentLang]

  const [journals, setJournals] = useState<Journal[]>([])
  const [activeTab, setActiveTab] = useState<"all" | JournalCategory>("all")
  const [loading, setLoading] = useState(true)
  const [activeJournal, setActiveJournal] = useState<Journal | null>(null)

  useEffect(() => {
    const fetchJournalData = async () => {
      try {
        setLoading(true) // 言語切り替え時の安全対策
        const { data: journalsData, error: journalsError } = await supabase
          .from("admin_journals")
          .select("id, title, content, category, is_published, created_at, source_name, source_url")
          .eq("is_published", true)
          .eq("lang", currentLang) // 🔥 ここで選択されている言語に完全絞り込み
          .in("category", ["news", "event", "column", "announcement"])
          .order("created_at", { ascending: false })

        if (journalsError) console.error("Journals fetch error:", journalsError)
        setJournals((journalsData as Journal[]) || [])
      } catch (err) {
        console.error("Journal core fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchJournalData()
  }, [currentLang]) // 💡 言語が変わったら再フェッチを走らせる

  useEffect(() => {
    if (activeJournal) {
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = "unset"
    }
    return () => { document.body.style.overflow = "unset" }
  }, [activeJournal])

  const filteredJournals = activeTab === "all" 
    ? journals 
    : journals.filter(j => j.category === activeTab)

  if (loading) {
    return (
      <div aria-busy="true" className="animate-pulse">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-12 w-28 shrink-0 rounded-xl bg-neutral-100" />
          ))}
        </div>
        <div className="mt-10 space-y-5">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <div className="flex gap-4">
                <div className="h-7 w-16 rounded bg-neutral-100" />
                <div className="h-4 w-24 rounded bg-neutral-100" />
              </div>
              <div className="mt-6 h-6 w-4/5 rounded bg-neutral-100" />
              <div className="mt-5 h-3 w-full rounded bg-neutral-100" />
              <div className="mt-2 h-3 w-3/4 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-10 animate-fadeIn">
      
      <div className="flex w-full gap-1 overflow-x-auto rounded-2xl border border-neutral-200/70 bg-white/75 p-1.5 shadow-sm backdrop-blur-sm scrollbar-none sm:w-fit">
        {(["all", "news", "event", "column", "announcement"] as const).map((tab) => {
          const isActive = activeTab === tab
          
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`min-w-[92px] px-5 py-2.5 text-xs font-medium rounded-xl transition-all duration-300 tracking-wide active:scale-[0.98] whitespace-nowrap outline-none ${
                isActive
                  ? "bg-neutral-950 text-white font-semibold shadow-sm"
                  : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/50"
              }`}
            >
              {t[tab]}
            </button>
          )
        })}
      </div>

      {/* 📰 記事リスト */}
      {filteredJournals.length === 0 ? (
        <p className="text-sm font-mono text-neutral-400 italic py-16 text-center tracking-wide">
          {currentLang === "en" ? "No articles available in this category." : "現在このカテゴリの記事はありません。"}
        </p>
      ) : (
        <div className="grid gap-4">
          {filteredJournals.map((journal) => (
            <button 
              key={journal.id} 
              onClick={() => setActiveJournal(journal)}
              className="group relative flex w-full flex-col space-y-4 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white/85 p-5 text-left shadow-[0_12px_35px_-30px_rgba(0,0,0,0.3)] outline-none transition-all duration-300 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-[0_18px_45px_-30px_rgba(0,0,0,0.38)] md:p-6"
            >
              <div className="flex items-center gap-3.5">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 bg-neutral-900 text-white rounded font-sans">
                  {journal.category}
                </span>
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 tracking-wide">
                  <span>
                    {new Date(journal.created_at).toLocaleDateString("ja-JP", {
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit"
                    })}
                  </span>
                </div>
              </div>
              
              <h3 className="w-full font-sans text-[15px] font-semibold leading-[1.65] tracking-[0.015em] text-neutral-900 transition-colors group-hover:text-black sm:text-base md:text-[17px]">
                {journal.title}
              </h3>
              <p className="line-clamp-2 max-w-3xl text-xs leading-6 text-neutral-500 sm:text-sm">
                {journal.content}
              </p>
            </button>
          ))}
        </div>
      )}

      {/* 🌌 背景ぼかし＆浮遊コンテントカード（モーダル） */}
      {activeJournal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10">
          <div 
            className="absolute inset-0 bg-neutral-950/20 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
            onClick={() => setActiveJournal(null)}
          />

          <div className="public-panel relative z-10 flex max-h-[85vh] w-full max-w-2xl transform flex-col justify-between overflow-y-auto p-6 transition-all duration-300 animate-scaleUp sm:p-8 md:p-10">
            
            <div className="space-y-5">
              <div className="flex items-center gap-3.5">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 bg-neutral-900 text-white rounded font-sans">
                  {activeJournal.category}
                </span>
                <span className="text-xs font-mono text-neutral-400">
                  {new Date(activeJournal.created_at).toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                  })}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 leading-snug tracking-wide">
                {activeJournal.title}
              </h2>

              <div className="h-[1px] w-full bg-neutral-100" />

              <p className="text-sm sm:text-base leading-relaxed text-neutral-700 font-normal tracking-wide whitespace-pre-wrap pt-2 select-text">
                {activeJournal.content}
              </p>
            </div>

            {/* 🔗 ボタンエリア */}
            <div className="mt-8 pt-4 flex items-center justify-between border-t border-neutral-100">
              
              {activeJournal.source_url && activeJournal.source_name ? (
                <a
                  href={activeJournal.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium tracking-wide text-neutral-700 hover:text-black bg-neutral-50 hover:bg-neutral-100 border border-neutral-200/80 rounded-xl transition-all duration-200"
                >
                  <span className="truncate max-w-[150px] sm:max-w-[200px]">{activeJournal.source_name}</span>
                  <span className="text-[10px] font-sans text-neutral-400">↗</span>
                </a>
              ) : (
                <div /> 
              )}

              <button
                onClick={() => setActiveJournal(null)}
                className="px-5 py-2 text-xs font-medium tracking-wider uppercase text-neutral-400 hover:text-neutral-900 transition-colors duration-200 border border-transparent hover:border-neutral-200 rounded-xl"
              >
                {t.close}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
