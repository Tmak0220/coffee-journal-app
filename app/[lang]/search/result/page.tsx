import { Suspense } from "react"
import SearchContent from "./SearchContent"
import type { Metadata } from "next"
import { GridSkeleton } from "@/components/ui/PageSkeletons"

export const metadata: Metadata = {
  title: "検索結果 - COFFEE JOURNAL",
}

export default function SearchResultPage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <SearchContent />
    </Suspense>
  )
}
