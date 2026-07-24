import UserPageClient from "./UserPageClient"

type Props = {
  params: Promise<{
    lang: "ja" | "en"
    username: string
  }>
}

export async function generateMetadata({ params }: Props) {
  // params の Promise を解決
  const resolvedParams = await params
  const decodedUsername = decodeURIComponent(resolvedParams.username).replace(/^@/, "")
  const isJa = resolvedParams.lang === "ja"
  
  return {
    title: isJa 
      ? `@${decodedUsername} のプロフィール | Coffee Community` 
      : `@${decodedUsername}'s Profile | Coffee Community`,
  }
}

export default async function UserPage({ params }: Props) {
  // params の Promise を解決
  const resolvedParams = await params

  return (
    <UserPageClient 
      username={resolvedParams.username} 
      lang={resolvedParams.lang} 
    />
  )
}