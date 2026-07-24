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
    title: isEn ? "Privacy Policy - COFFEE JOURNAL" : "プライバシーポリシー - COFFEE JOURNAL",
    description: isEn 
      ? "You can review the privacy policy for COFFEE JOURNAL."
      : "コーヒージャーナルのプライバシーポリシーについてご確認いただけます。",
    alternates: { 
      canonical: `${SITE_URL}/${lang}/privacy`
    },
  }
}

export default async function PrivacyPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"

  const { data: item, error } = await supabase
    .from("site_contents")
    .select("title, content, type")
    .eq("key", "privacy")
    .eq("lang", currentLang)
    .maybeSingle()

  if (error || !item) {
    console.error(error)
    notFound()
  }

  return (
    <PageLayout
      title={currentLang === "en" ? "Privacy Policy" : "Privacy"}
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
