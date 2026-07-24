import type { Metadata } from "next"

import "@/app/globals.css"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import Script from "next/script"
import { AuthModalProvider } from "@/context/AuthModalContext"
import AuthModal from "@/components/AuthModal"
import { Suspense } from "react"
import { AuthListener } from "@/components/AuthListener"
import { AppPopupProvider } from "@/context/AppPopupContext"
import { SITE_NAME, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "コーヒージャーナル | Coffee Journal",
    template: "%s | コーヒージャーナル",
  },
  description: "お気に入りのコーヒー豆やロースターの記録、公式タイムラインをまとめたコーヒージャーナル",
  keywords: ["コーヒー", "コーヒー豆", "ロースター", "自家焙煎", "サードウェーブ", "カフェ", "coffee", "roaster", "journal", "beans"],
  openGraph: {
    title: "コーヒージャーナル | Coffee Journal",
    description: "お気に入りのコーヒー豆やロースターの記録、公式タイムラインをまとめたコーヒージャーナル",
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "コーヒージャーナル | Coffee Journal",
    description: "お気に入りのコーヒー豆やロースターの記録、公式タイムラインをまとめたコーヒージャーナル",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,opsz,wght@0,6..96,400..600;1,6..96,400..600&family=Noto+Serif+JP:wght@400;500&display=swap" rel="stylesheet" />

        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}');
          `}
        </Script>
      </head>
      <body>
        <AuthListener />
        <AppPopupProvider>
        <AuthModalProvider>
          
          {/* 
            💡 根本解決：背景専用レイヤー
            グラデーションとノイズを完全に画面最背面に固定配置します。
            これでコンテンツの長さや複雑なDOM階層に影響されなくなります。
          */}
          <div className="site-background-layer" aria-hidden="true" />

          {/* 
            💡 コンテンツ専用コンテナ
            背景は完全に透過（transparent）し、背後の固定グラデーションをシームレスに映します。
          */}
          <div className="site-content-container">
            <Suspense fallback={<div className="h-[81px] border-b border-border" />}>
              <Header />
            </Suspense>
            
            <main className="flex-1">
              {children}
            </main>
            
            <Footer />
          </div>
          
          <AuthModal />
        </AuthModalProvider>
        </AppPopupProvider>
      </body>
    </html>
  )
}
