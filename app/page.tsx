import { redirect } from "next/navigation"

export default function RootPage() {
  // 言語なしでアクセスされたら、自動的に /ja へリダイレクト
  redirect("/ja")
  
  // Next.jsの型チェックを通すために null を返す（画面には何も映りません）
  return null
}