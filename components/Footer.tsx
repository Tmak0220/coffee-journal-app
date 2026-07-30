'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()
  const isEn = pathname.startsWith('/en/') || pathname === '/en'
  const langPrefix = isEn ? '/en' : '/ja'

  const t = {
    ja: {
      guide: '使い方',
      legal: '特定商取引法',
      terms: '利用規約',
      privacy: 'プライバシーポリシー',
      contact: 'お問い合わせ',
    },
    en: {
      guide: 'Guide',
      legal: 'Legal Notice',
      terms: 'Terms of Service',
      privacy: 'Privacy Policy',
      contact: 'Contact',
    },
  }[isEn ? 'en' : 'ja']

  return (
    <footer className="mt-12 w-full border-t border-neutral-200 bg-white text-[11px] tracking-wider text-neutral-400 sm:mt-20 sm:text-xs">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-y-5 px-4 py-8 sm:flex-row sm:px-10 sm:py-10 md:px-14 lg:px-16">
        <nav className="grid w-full grid-cols-2 items-center gap-x-4 gap-y-3 text-center font-medium sm:flex sm:w-auto sm:flex-wrap sm:justify-center sm:gap-x-5 sm:gap-y-2">
          <Link href={`${langPrefix}/guide`} className="hover:text-black transition-colors duration-300">
            {t.guide}
          </Link>
          <Link href={`${langPrefix}/legal`} className="hover:text-black transition-colors duration-300">
            {t.legal}
          </Link>
          <Link href={`${langPrefix}/terms`} className="hover:text-black transition-colors duration-300">
            {t.terms}
          </Link>
          <Link href={`${langPrefix}/privacy`} className="hover:text-black transition-colors duration-300">
            {t.privacy}
          </Link>
          <Link href={`${langPrefix}/contact`} className="hover:text-black transition-colors duration-300">
            {t.contact}
          </Link>
        </nav>

        <div className="text-center text-[9px] font-light uppercase tracking-[0.08em] text-neutral-400 sm:text-[11px]">
          © 2026 COFFEE JOURNAL. ALL RIGHTS RESERVED.
        </div>
      </div>
    </footer>
  )
}
