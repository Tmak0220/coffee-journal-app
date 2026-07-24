export const dynamic = "force-dynamic"

import type { Metadata } from "next"
import { supabase } from "@/lib/supabase"
import { notFound } from "next/navigation"
import PageLayout from "@/components/PageLayout"
import ContentRenderer from "@/components/ContentRenderer"
import { SITE_URL } from "@/lib/site"

type Props = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const isEn = lang === "en"

  return {
    title: isEn ? "Terms of Service - COFFEE JOURNAL" : "利用規約 - COFFEE JOURNAL",
    description: isEn 
      ? "You can review the terms of service for COFFEE JOURNAL."
      : "コーヒージャーナルの利用規約についてご確認いただけます。",
    alternates: { 
      canonical: `${SITE_URL}/${lang}/terms`
    },
  }
}

export default async function TermsPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"

  const { data: item, error } = await supabase
    .from("site_contents")
    .select("title, content, type")
    .eq("key", "terms")
    .eq("lang", currentLang)
    .maybeSingle()

  if (error || !item) {
    console.error(error)
    notFound()
  }

  return (
    <PageLayout
      title={currentLang === "en" ? "Terms of Service" : "Terms"}
      subtitle={item.title}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4">
        <ContentRenderer 
          content={item.content} 
          type={item.type as "text" | "markdown" | "html"} 
        />
      </div>
    </PageLayout>
  )
}
