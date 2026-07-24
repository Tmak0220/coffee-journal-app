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
    title: isEn ? "Legal Notice - COFFEE JOURNAL" : "特定商取引法に基づく表記 - COFFEE JOURNAL",
    description: isEn 
      ? "You can review the legal notice for COFFEE JOURNAL."
      : "コーヒージャーナルの特定商取引法に基づく表記についてご確認いただけます。",
    alternates: { 
      canonical: `${SITE_URL}/${lang}/legal`
    },
  }
}

export default async function LegalPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"

  const { data: item, error } = await supabase
    .from("site_contents")
    .select("title, content, type")
    .eq("key", "legal")
    .eq("lang", currentLang)
    .maybeSingle()

  if (error || !item) {
    console.error(error)
    notFound()
  }

  const breadcrumbs = [
    { label: currentLang === "en" ? "Legal Notice" : "特定商取引法に基づく表記" },
  ] 

  return (
    <PageLayout
      title={currentLang === "en" ? "Legal Notice" : "Legal"}
      subtitle={item.title}
      breadcrumbs={breadcrumbs}
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
