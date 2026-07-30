import PeopleDetailPageClient from "./PeopleDetailPageClient"
import { supabase } from "@/lib/supabase"

type Props = {
  params: Promise<{
    username: string
    lang: string
  }>
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params
  const username = resolvedParams.username
  const lang = resolvedParams.lang || "ja"
  const isEn = lang === "en"

  // 1. users からユーザー情報を単体で取得
  const { data: userData } = await supabase
    .from("users")
    .select("id, username, display_name")
    .eq("username", username)
    .maybeSingle()

  if (!userData) {
    return {
      title: isEn ? "Profile Not Found | Coffee Community" : "プロフィールが見つかりません | Coffee Community",
    }
  }

  // 2. experts テーブルから直接データを取得して検証
  const { data: expertData } = await supabase
    .from("experts")
    .select("is_approved, is_public, display_name, display_name_en")
    .eq("user_id", userData.id)
    .maybeSingle()

  if (!expertData || !expertData.is_approved || !expertData.is_public) {
    return {
      title: isEn ? "Profile Not Found | Coffee Community" : "プロフィールが見つかりません | Coffee Community",
    }
  }

  const name = (isEn ? expertData.display_name_en : expertData.display_name)
    || expertData.display_name
    || userData.username
    || "Professional"

  return {
    title: isEn 
      ? `${name} Lab Logs & Profile | Coffee Community`
      : `${name} 検証ログ＆プロフィール | Coffee Community`,
    description: isEn
      ? `Verification logs, roasting profiles, hypotheses, and conclusions published by ${name}.`
      : `${name}が検証したコーヒーの抽出データ、焙煎プロファイル、仮説と結論のログ一覧。`,
  }
}

export default async function PeopleDetailPage({ params }: Props) {
  const resolvedParams = await params
  const username = resolvedParams.username
  const lang = resolvedParams.lang || "ja"

  return (
    <PeopleDetailPageClient 
      username={username}
      lang={lang} 
    />
  )
}
