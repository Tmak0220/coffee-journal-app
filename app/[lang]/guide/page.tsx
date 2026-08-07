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
    title: isEn ? "Guide - COFFEE JOURNAL" : "使い方 - COFFEE JOURNAL",
    description: isEn
      ? "Review the COFFEE JOURNAL usage guide, posting guidelines, and rules."
      : "コーヒージャーナルの使い方や投稿ガイドライン、ルールについてご確認いただけます。",
    alternates: { canonical: `${SITE_URL}/${lang}/guide` },
  }
}

export default async function GuidePage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"

  const { data: item, error } = await supabase
    .from("site_contents")
    .select("title, content, type")
    .eq("key", "guide")
    .eq("lang", currentLang)
    .maybeSingle()

  if (error || !item) {
    console.error(error)
    notFound()
  }

  const breadcrumbs = [
    {
      label: currentLang === "en" ? "Coffee Journal" : "コーヒージャーナル",
      href: `/${currentLang}`,
    },
    { label: currentLang === "en" ? "Guide" : "使い方" },
  ]

  return (
    <PageLayout
      title="Guide"
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
