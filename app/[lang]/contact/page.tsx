import type { Metadata } from "next"
import ContactForm from "@/components/ContactForm"

type Props = {
  params: Promise<{ lang: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  const isEn = lang === "en"

  return {
    title: isEn ? "Contact - COFFEE JOURNAL" : "コンタクト - COFFEE JOURNAL",
    description: isEn
      ? "If you have any questions or requests regarding our services, please contact us."
      : "コーヒージャーナルへのお問い合わせはこちらから。サービスに関する質問やご要望を受け付けております。",
  }
}

export default async function ContactPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"

  return (
    <main className="public-page-shell mx-auto max-w-4xl p-6 sm:p-10 md:p-14 lg:p-16 animate-[fadeIn_0.3s_ease-out_forwards]">
      <div className="border-b border-border pb-6">
        <h1 className="text-2xl tracking-[0.12em] font-medium text-foreground uppercase flex flex-col gap-1">
          CONTACT
          <span className="text-[10px] tracking-[0.05em] font-normal text-muted lowercase">
            {currentLang === "en" ? "inquiry form" : "お問い合わせ"}
          </span>
        </h1>
      </div>

      <div className="mt-8 space-y-3 leading-relaxed text-xs text-subtle font-medium">
        <p>
          {currentLang === "en"
            ? "If you have any questions or requests regarding our services, please contact us using the form below or via email."
            : "サービスに関するご質問、ご要望などございましたら、以下のフォームまたはメールアドレスよりご連絡ください。"}
        </p>
        <p className="text-foreground tracking-wide font-semibold block pt-1 selection:bg-neutral-100">
          contact@pct-e.com
        </p>
      </div>

      <div className="mt-12 bg-surface">
        <ContactForm lang={currentLang} />
      </div>
    </main>
  )
}
