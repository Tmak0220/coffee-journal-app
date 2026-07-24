import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { r2 } from "@/lib/r2"
import { createClient } from "@/lib/supabase-server"

// App Routerのルートセグメント設定（必要に応じて動的処理を保証）
export const dynamic = 'force-dynamic'

// MIMEタイプから拡張子を逆引きするマッピング
const MIME_TO_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get("file") as File
    const requestedFolder = String(formData.get("folder") || "uploads")
    const folder = requestedFolder === "avatars" || requestedFolder === "covers"
      ? requestedFolder
      : "uploads"

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const MAX_FILE_SIZE = 5 * 1024 * 1024
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "ファイルサイズが大きすぎます（5MB以下にしてください）" },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // --- 拡張子取得ロジック ---
    let fileExtension = "jpg" // デフォルトのフォールバック

    if (file.name && file.name.includes(".")) {
      const extractedExt = file.name.split(".").pop()?.toLowerCase()
      // 抽出した拡張子が "blob" の場合は無視して、下のMIMEタイプ判定に流す
      if (extractedExt && extractedExt !== "blob") {
        fileExtension = extractedExt
      } else if (file.type && MIME_TO_EXTENSION[file.type]) {
        fileExtension = MIME_TO_EXTENSION[file.type]
      }
    } else if (file.type && MIME_TO_EXTENSION[file.type]) {
      // ファイル名に拡張子がない(blobなど)、またはMIMEタイプが存在する場合
      fileExtension = MIME_TO_EXTENSION[file.type]
    }
    // ---------------------------------

    // 💡 現在の西暦と月(2桁)を取得する
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0") // 1月なら "01", 10月なら "10"

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`
    
    // 💡 構造を WordPress 形式の `YYYY/MM/ファイル名` に変更
    // R2の仕様により、月が変わって新しいパスで送られるとフォルダーは自動生成されます
    // 通常投稿は確定前なのでtmpへ保存する。プロフィール画像だけは専用領域へ置き、
    // 保存を中断した場合にクライアントのBeaconで削除する。
    const storageKey = folder === "uploads"
      ? `tmp/${user.id}/${fileName}`
      : `${folder}/${user.id}/${year}/${month}/${fileName}`

    await r2.send(
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storageKey,
        Body: buffer,
        ContentType: file.type || "image/jpeg",
      })
    )

    const baseUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, "")
    const imageUrl = `${baseUrl}/${storageKey}`

    return NextResponse.json({
      success: true,
      url: imageUrl,
    })
  } catch (error: any) {
    console.error("R2 Upload Error:", error)
    return NextResponse.json(
      { error: error?.message || "Upload failed" }, 
      { status: 500 }
    )
  }
}
