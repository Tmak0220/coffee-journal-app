import type { Metadata } from "next"
import AdvancedSearchForm from "./AdvancedSearchForm"

export const metadata: Metadata = {
  title: "探す - COFFEE JOURNAL",
}

type Props = {
  params: Promise<{ lang: string }>
}

export default async function SearchPortalPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-5 py-10 sm:px-8 md:py-14 lg:px-12">
      <header className="max-w-2xl">
        <p className="text-[10px] font-bold tracking-[0.2em] text-subtle">DISCOVER</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {currentLang === "en" ? "Find your coffee" : "コーヒーを条件から探す"}
        </h1>
        <p className="mt-3 text-xs leading-relaxed text-subtle sm:text-sm">
          {currentLang === "en"
            ? "Combine varieties, processes, flavors, and gear to find tasting records."
            : "品種、精製方法、フレーバー、器具を組み合わせて、テイスト投稿を検索できます。"}
        </p>
      </header>

      <AdvancedSearchForm lang={currentLang} />
    </main>
  )
}
