import type { Metadata } from "next"
import { createClient } from "@/lib/supabase-server"
import { canViewContent } from "@/lib/permissions"
import { notFound } from "next/navigation"
import BlogPageClient from "./BlogPageClient"

type Props = {
  params: Promise<{
    lang: string
    id: string
  }>
}

// サーバーサイドで記事データを取得する関数
async function getBlogDetail(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: blog, error } = await supabase
    .from("blogs")
    .select("*")
    .eq("id", id)
    .maybeSingle()

  if (error || !blog) {
    console.error("Server-side Blog Fetch Error:", error?.message)
    return null
  }

  const isOwner = Boolean(user && blog.user_id === user.id)
  const visibility = blog.visibility || "public"

  if (!canViewContent({ visibility, viewerId: user?.id, ownerId: blog.user_id })) return null

  return blog
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, lang } = await params
  const blog = await getBlogDetail(id)

  const isEn = lang === "en"
  const title = blog?.title ? `${blog.title} | MEMBER` : (isEn ? "Blog Detail | MEMBER" : "ブログ詳細 | MEMBER")
  
  return {
    title,
    description: blog?.content ? blog.content.slice(0, 120) : "Blog post details.",
  }
}

export default async function BlogPage({ params }: Props) {
  const { lang, id } = await params
  
  // 1. 記事データを取得
  const blog = await getBlogDetail(id)
  if (!blog) notFound()

  // 2. 現在のユーザーセッションを取得
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 3. クライアントコンポーネントへ渡す
  return (
    <BlogPageClient 
      articleId={id} 
      lang={lang === "en" ? "en" : "ja"} 
      currentUserId={user?.id || null} 
      initialArticle={blog}
    />
  )
}
