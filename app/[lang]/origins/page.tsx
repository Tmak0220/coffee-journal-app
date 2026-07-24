export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import PageLayout from "@/components/PageLayout"
import OriginSearchManager from "@/components/OriginSearchManager"
import { SITE_URL } from "@/lib/site"

type Props = {
  params: Promise<{
    lang: string
  }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const isEn = lang === "en"

  return {
    title: isEn ? "ORIGINS - COFFEE JOURNAL" : "原産地一覧 - COFFEE JOURNAL",
    description: isEn 
      ? "Browse coffee origins registered in Coffee Journal by region and country."
      : "コーヒージャーナルに登録されている原産地を、地域・国別に探すことができます。",
    alternates: { canonical: `${SITE_URL}/${lang}/origins` },
  }
}

const dict = {
  ja: {
    title: "ORIGINS",
    subtitle: "原産地",
    breadcrumbs: (lang: string) => [
      { label: "コーヒージャーナル", href: `/${lang}` },
      { label: "原産地" },
    ]
  },
  en: {
    title: "ORIGINS",
    subtitle: "Origins",
    breadcrumbs: (lang: string) => [
      { label: "COFFEE JOURNAL", href: `/${lang}` },
      { label: "Origins" },
    ]
  }
}

export default async function OriginsPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"
  const t = dict[currentLang]
  const { data: initialAreas } = await supabase
    .from("origins")
    .select("*")
    .is("parent_id", null)
    .order("sort_order", { ascending: true })

  return (
    <div className="journal-page-wrapper relative overflow-hidden min-h-screen flex flex-col justify-between w-full bg-white">
      <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-gradient-to-br from-white via-white/40 to-transparent blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tr from-white via-white/30 to-transparent blur-[80px] pointer-events-none" />

      <div className="max-w-6xl mx-auto p-6 sm:p-10 md:p-14 lg:p-16 relative z-10 w-full flex-grow">
        <PageLayout
          title={t.title}
          subtitle={t.subtitle}
          breadcrumbs={t.breadcrumbs(currentLang)}
        >
          <section className="mt-12 mb-12 sm:mt-16 max-w-5xl">
            <div className="border-b border-neutral-200 mb-8 sm:mb-10" />
            
            <div className="journal-grid-container">
              <OriginSearchManager initialAreas={initialAreas ?? []} lang={currentLang} />
            </div>
          </section>
        </PageLayout>
      </div>
    </div>
  )
}
