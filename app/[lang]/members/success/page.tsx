import Link from "next/link"

type Props = {
  params: Promise<{ lang: string }>
}

export default async function MembersSuccessPage({ params }: Props) {
  const { lang } = await params
  const currentLang = lang === "en" ? "en" : "ja"
  const isEn = currentLang === "en"

  return (
    <main className="min-h-screen p-10 md:p-14 lg:p-16">
      <div className="max-w-2xl">
        <p className="type-label text-[11px] text-subtle tracking-[0.12em] pr-[0.12em]">
          MEMBERSHIP
        </p>

        <h1 className="mt-8 type-display text-5xl md:text-6xl text-foreground">
          {isEn ? "PAYMENT SUCCESS" : "決済完了"}
        </h1>

        <p className="mt-4 text-base tracking-[0.12em] text-muted font-medium">
          {isEn ? "Your payment is complete" : "決済が完了しました"}
        </p>

        <p className="mt-10 text-[15px] leading-8 text-muted">
          {isEn ? "Thank you for joining." : "MEMBERへの登録ありがとうございます。"}
          <br />
          {isEn ? "Your subscription is now being activated." : "サブスクリプションを有効化しています。"}
        </p>

        <div className="mt-14">
          <Link
            href={`/${currentLang}`}
            className="inline-block border border-border bg-surface rounded-xl px-6 py-3 text-xs font-medium tracking-[0.1em] hover:bg-foreground hover:text-background transition-colors duration-300"
          >
            {isEn ? "BACK TO HOME" : "トップページへ戻る"}
          </Link>
        </div>
      </div>
    </main>
  )
}
