import { Suspense } from "react"
import BookmarkPageClient from "./BookmarkPageClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ブックマーク一覧 - COFFEE JOURNAL",
  description: "ブックマークしたアーカイブを一覧で管理できます。",
}

export default function BookmarksPage() {
  return (
    <Suspense>
      <BookmarkPageClient />
    </Suspense>
  )
}