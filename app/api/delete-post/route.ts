import { NextRequest, NextResponse } from "next/server"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { createClient } from "@supabase/supabase-js"

const rawEndpoint = process.env.R2_ENDPOINT || ""
const cleanEndpoint = rawEndpoint.replace(/^https?:\/\//, "")

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${cleanEndpoint}`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { postId } = await req.json()

    const { data: post, error: postFetchError } = await supabase
      .from("posts")
      .select("*")
      .eq("id", postId)
      .single()

    if (postFetchError || !post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    const imageUrls = post.image_urls ?? []

    // 2. R2ストレージからの画像削除
    for (const imageUrl of imageUrls) {
      try {
        const cleanUrl = imageUrl.trim()
        if (!cleanUrl) continue

        // URLの検証: httpから始まっているか確認
        if (!cleanUrl.startsWith("http")) continue

        const urlObj = new URL(cleanUrl)
        let key = urlObj.pathname.startsWith("/") ? urlObj.pathname.slice(1) : urlObj.pathname
        
        // WordPress移行データ対策
        if (key.includes("wp-content/uploads/")) {
            key = key.split("wp-content/uploads/")[1]
        }

        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: decodeURIComponent(key),
          })
        )
        console.log(`✅ 削除成功: ${key}`)
      } catch (err) {
        console.error(`❌ 削除失敗: ${imageUrl}`, err)
      }
    }

    // 3. 【順序最優先】posts に紐づくすべての子テーブルデータを先に削除（外部キー制約対策）
    
    // ① likes の削除
    await supabase.from("likes").delete().eq("post_id", postId)

    // ② bookmarks の削除
    await supabase.from("bookmarks").delete().eq("post_id", postId)

    // ③ post_views の削除
    await supabase.from("post_views").delete().eq("post_id", postId)

    // ④ post_tastes（味覚タグ関係）の削除
    const { error: tasteError } = await supabase
      .from("post_tastes")
      .delete()
      .eq("post_id", postId)

    if (tasteError) throw tasteError

    const { error: gearError } = await supabase
      .from("post_gears")
      .delete()
      .eq("post_id", postId)

    if (gearError) throw gearError

    // 4. 最後に親である「posts」本体を削除
    const { error: deletePostError } = await supabase
      .from("posts")
      .delete()
      .eq("id", postId)

    if (deletePostError) throw deletePostError

    return NextResponse.json({ success: true })

  } catch (err: any) {
    console.error("Delete post error:", err)
    return NextResponse.json(
      { error: err.message || "Delete failed" },
      { status: 500 }
    )
  }
}
