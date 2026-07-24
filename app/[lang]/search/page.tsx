import type { Metadata } from "next"
import AdvancedSearchForm from "./AdvancedSearchForm"

type Props = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const isEn = lang === "en"

  return {
    title: isEn ? "Search - COFFEE JOURNAL" : "探す - COFFEE JOURNAL",
    description: isEn
      ? "Combine varieties, processes, flavors, and gear to find tasting records."
      : "品種、精製方法、フレーバー、器具を組み合わせて、テイスト投稿を検索できます。",
  }
}

export default async function SearchPortalPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"
  const isEn = currentLang === "en"

  return (
    <div className="journal-page-wrapper w-full bg-white">
      <main className="relative z-10 mx-auto min-h-screen w-full max-w-6xl px-4 py-6 sm:px-10 sm:py-10 md:px-14 md:py-12 lg:px-16">
        <header className="max-w-2xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 sm:text-[11px]">
            DISCOVER
          </p>
          <h1 className="mt-2 text-xl font-bold tracking-tight text-neutral-900 sm:text-2xl md:text-3xl">
            {isEn ? "Find your coffee" : "コーヒーを条件から探す"}
          </h1>
          <p className="mt-2.5 text-xs leading-relaxed tracking-wide text-neutral-500 sm:text-sm">
            {isEn
              ? "Combine varieties, processes, flavors, and gear to find tasting records."
              : "品種、精製方法、フレーバー、器具を組み合わせて、テイスト投稿を検索できます。"}
          </p>
        </header>

        <div className="mt-6 border-b border-neutral-200/50 sm:mt-8" />

        <AdvancedSearchForm lang={currentLang} />
      </main>
    </div>
  )
}