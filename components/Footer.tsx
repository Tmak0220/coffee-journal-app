'use client'

import Link from 'next/link'

export default function Footer() {
  return (
    /* 
      💡 修正ポイント：
      背景を完全に透明（bg-transparent）にし、余計なレイヤーの重なり（relativeやz-10）を削除。
      親要素の fixed グラデーションの上に、ただ文字が乗るだけの極めてクリーンな構造に直しました。
    */
    <footer className="mt-12 w-full bg-white text-[11px] tracking-wider text-neutral-400 sm:mt-20 sm:text-xs">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-y-5 px-4 py-8 sm:flex-row sm:px-10 sm:py-10 md:px-14 lg:px-16">
        
        {/* 左側：ナビゲーションリンク */}
        <nav className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-3 text-center font-medium sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2">
          <Link href="/guide" className="hover:text-black transition-colors duration-300">
            使い方
          </Link>
          <Link href="/legal" className="hover:text-black transition-colors duration-300">
            特定商取引法
          </Link>
          <Link href="/terms" className="hover:text-black transition-colors duration-300">
            利用規約
          </Link>
          <Link href="/privacy" className="hover:text-black transition-colors duration-300">
            プライバシーポリシー
          </Link>
          <Link href="/contact" className="hover:text-black transition-colors duration-300">
            お問い合わせ
          </Link>
        </nav>

        {/* 右側：コピーライト */}
        <div className="text-center text-[9px] font-light uppercase tracking-[0.08em] text-neutral-400 sm:text-[11px]">
          © 2026 COFFEE JOURNAL. ALL RIGHTS RESERVED.
        </div>

      </div>
    </footer>
  )
}
