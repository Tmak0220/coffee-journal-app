export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import Link from "next/link"

type Props = {
  params: Promise<{
    lang: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const isEn = lang === "en"
  
  return {
    title: isEn ? "COFFEE JOURNAL" : "COFFEE JOURNAL - コーヒージャーナル",
    description: isEn ? "Comprehensive coffee platform" : "コーヒーの総合プラットフォーム",
  }
}

const dict = {
  ja: {
    title: "COFFEE JOURNAL",
    subtitle: "コーヒージャーナル",
    guidePrefix: "初めに",
    guideLinkText: "使い方",
    guideSuffix: "を必ずお読みください。",
    sections: [
      { id: "origins", name: "ORIGINS", name_lang: "起源", description: "生産地・消費地から探す", slug: "origins" },
      { id: "experts", name: "EXPERTS", name_lang: "人物", description: "生産者・ロースター・バリスタなどから探す", slug: "experts" },
      { id: "search", name: "SEARCH", name_lang: "検索", description: "品種、精製方法、味わい、器具などから探す", slug: "search" },
      { id: "journal", name: "JOURNAL", name_lang: "最新動向", description: "ニュースとタイムライン", slug: "journal" },
    ]
  },
  en: {
    title: "COFFEE JOURNAL",
    subtitle: "",
    guidePrefix: "Please be sure to read the ",
    guideLinkText: "User Guide",
    guideSuffix: " first.",
    sections: [
      { id: "origins", name: "ORIGINS", name_lang: "Origins", description: "Find by origins and destinations.", slug: "origins" },
      { id: "experts", name: "EXPERTS", name_lang: "Experts", description: "Find by producers, roasters, and baristas.", slug: "experts" },
      { id: "search", name: "SEARCH", name_lang: "Search", description: "Find by variety, process, taste, and gear.", slug: "search" },
      { id: "journal", name: "JOURNAL", name_lang: "Journal", description: "News and timeline updates.", slug: "journal" },
    ]
  }
}

export default async function Home({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"
  const t = dict[currentLang]

  return (
    <div className="public-page-shell journal-page-wrapper w-full">
      <section className="relative z-10 mx-auto w-full max-w-6xl px-4 pt-6 sm:p-10 sm:pb-0 md:p-14 md:pb-0 lg:p-16 lg:pb-0">
        <div className="flex flex-col pt-8 sm:pt-14">
          <h1 className="text-3xl font-semibold leading-none tracking-tight text-neutral-850 sm:text-5xl md:text-6xl">
            {t.title}
          </h1>
          {t.subtitle && (
            <p className="mt-3 text-xs sm:text-sm tracking-[0.12em] text-neutral-500 font-medium">
              {t.subtitle}
            </p>
          )}

          <div className="mt-6 inline-flex w-fit items-center gap-1.5 rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-2.5 text-xs font-medium text-amber-900 sm:text-sm">
            <span>* {t.guidePrefix}</span>
            <Link
              href={`/${currentLang}/guide`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline decoration-rose-400 decoration-1 underline-offset-4 hover:text-rose-950 hover:decoration-rose-600 transition-all"
            >
              {t.guideLinkText}
            </Link>
            <span>{t.guideSuffix}</span>
          </div>
        </div>
      </section>

      <section className="relative z-10 mx-auto mb-10 mt-8 w-full max-w-6xl px-4 sm:mb-12 sm:mt-10 sm:px-10 md:px-14 lg:px-16">
        <div className="mb-6 border-b border-neutral-200/50 sm:mb-10" />

        <div className="journal-grid-container">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {t.sections.map((section) => (
              <Link 
                key={section.id} 
                href={`/${currentLang}/${section.slug}`} 
                className="friendly-card group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 hover:border-neutral-300 hover:bg-white hover:shadow-md sm:p-8"
              >
                <div className="flex flex-col h-full justify-between">
                  <div>
                    <h2 className="text-lg font-semibold tracking-wider text-neutral-900 group-hover:text-black transition duration-300 font-sans">
                      {section.name}
                    </h2>
                    <p className="mt-1 text-[13px] font-normal tracking-wide text-neutral-500">
                      {section.name_lang}
                    </p>
                  </div>
                  
                  <div className="mt-5 border-t border-neutral-200/40 pt-4 transition duration-300 group-hover:border-neutral-300/80 sm:mt-8">
                    <p className="text-sm md:text-[15px] leading-relaxed text-neutral-600 tracking-wide font-normal group-hover:text-neutral-900 transition duration-300">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
