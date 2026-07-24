export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import JournalPageClient from "./JournalPageClient"
import PageLayout from "@/components/PageLayout"
import Link from "next/link"
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
    title: isEn ? "JOURNAL - COFFEE JOURNAL" : "ジャーナル - COFFEE JOURNAL",
    description: isEn 
      ? "Columns for a deeper understanding of coffee and the latest industry news" 
      : "コーヒーを深く知るためのコラムと、業界の最新ニュース",
    alternates: { canonical: `${SITE_URL}/${lang}/journal` },
  }
}

const dict = {
  ja: {
    title: "JOURNAL",
    subtitle: "ジャーナル",
    siteName: "コーヒージャーナル",
    roleLabel: "運営者",
    bioFallback: "コーヒーに関する最新ニュースやイベント情報、コラム、このウェブサイトに関するお知らせなどをお届けします。",
    breadcrumbs: (lang: string) => [
      { label: "コーヒージャーナル", href: `/${lang}` },
      { label: "ジャーナル" },
    ]
  },
  en: {
    title: "JOURNAL",
    subtitle: "Journal",
    siteName: "COFFEE JOURNAL",
    roleLabel: "Administrator",
    bioFallback: "Delivering the latest coffee news, event information, and exclusive columns, notice regarding this website.",
    breadcrumbs: (lang: string) => [
      { label: "COFFEE JOURNAL", href: `/${lang}` },
      { label: "Journal" },
    ]
  }
}

export default async function JournalPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"
  const t = dict[currentLang]

  const { data: userData } = await supabase
    .from("users")
    .select("id, username, display_name")
    .eq("role", "admin")
    .maybeSingle()

  let adminInfo = null
  if (userData) {
    const { data: expertData } = await supabase
      .from("experts")
      .select("username, display_name, title_raw, bio_expert, bio_expert_en")
      .eq("id", userData.id)
      .maybeSingle()

    const bio = currentLang === "en" 
      ? (expertData?.bio_expert_en || t.bioFallback) 
      : (expertData?.bio_expert || t.bioFallback)

    const displayName = expertData?.display_name || userData.display_name
    const finalDisplayName = (!displayName || displayName === "COFFEE JOURNAL") ? t.siteName : displayName

    adminInfo = {
      username: expertData?.username || userData.username || "coffeejournal",
      display_name: finalDisplayName,
      title_raw: expertData?.title_raw || t.roleLabel,
      bio_expert: bio
    }
  }

  return (
    <div className="journal-page-wrapper relative min-h-screen w-full overflow-hidden bg-[radial-gradient(circle_at_88%_6%,rgba(71,127,151,0.07),transparent_26%),radial-gradient(circle_at_8%_35%,rgba(180,112,32,0.06),transparent_28%),#fff]">

      <div className="max-w-6xl mx-auto p-6 sm:p-10 md:p-14 lg:p-16 relative z-10 w-full flex-grow">
        
        <div className="relative w-full">
          
          {adminInfo && (
            <div className="absolute top-12 right-0 z-20 hidden md:block w-full max-w-sm">
              <Link 
                href={`/${currentLang}/users/${adminInfo.username}`} 
                className="block pl-6 pr-5 py-5 rounded-2xl border border-neutral-200/85 bg-white/90 backdrop-blur-sm hover:bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05),0_1px_3px_-1px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] border-neutral-200/60 hover:border-neutral-300 transition-all duration-300 group text-left relative overflow-hidden"
              >
                <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-neutral-950" />

                <div className="flex flex-col gap-0.5">
                  <span className="text-[15px] font-bold tracking-wide text-neutral-900 group-hover:text-black font-sans transition duration-200">
                    {adminInfo.display_name}
                  </span>
                  <p className="text-xs font-medium text-neutral-400 tracking-wide font-sans">
                    {adminInfo.title_raw}
                  </p>
                </div>
                
                {adminInfo.bio_expert && (
                  <div className="mt-3.5 pt-3.5 border-t border-neutral-100 group-hover:border-neutral-200/60 transition duration-300">
                    <p className="text-[13px] leading-6 text-neutral-600 tracking-wide font-normal group-hover:text-neutral-900 transition duration-300">
                      {adminInfo.bio_expert}
                    </p>
                  </div>
                )}
              </Link>
            </div>
          )}

          <PageLayout
            title={t.title}
            subtitle={t.subtitle}
            breadcrumbs={t.breadcrumbs(currentLang)}
          >
            <section className="mt-12 mb-12 sm:mt-16 max-w-5xl">
              <div className="mb-8 border-b border-neutral-200 sm:mb-10" />
              
              {adminInfo && (
                <div className="block md:hidden mb-8">
                  <Link 
                    href={`/${currentLang}/users/${adminInfo.username}`} 
                    className="block pl-6 pr-5 py-5 rounded-2xl border border-neutral-200/85 bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] text-left relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-neutral-950" />
                    
                    <span className="text-[15px] font-bold tracking-wide text-neutral-900 font-sans block">
                      {adminInfo.display_name}
                    </span>
                    <p className="text-xs font-medium text-neutral-400 tracking-wide font-sans mt-0.5">
                      {adminInfo.title_raw}
                    </p>
                    
                    {adminInfo.bio_expert && (
                      <div className="mt-3 pt-3 border-t border-neutral-100">
                        <p className="text-[13px] leading-6 text-neutral-600 tracking-wide">
                          {adminInfo.bio_expert}
                        </p>
                      </div>
                    )}
                  </Link>
                </div>
              )}

              <div className="w-full">
                <JournalPageClient lang={currentLang} />
              </div>
            </section>
          </PageLayout>
        </div>

      </div>
    </div>
  )
}