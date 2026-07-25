import { NextResponse } from "next/server"
import { PutObjectCommand } from "@aws-sdk/client-s3"
import { r2 } from "@/lib/r2"
import { createClient } from "@/lib/supabase-server"

export const dynamic = 'force-dynamic'

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

    let fileExtension = "jpg"

    if (file.name && file.name.includes(".")) {
      const extractedExt = file.name.split(".").pop()?.toLowerCase()
      if (extractedExt && extractedExt !== "blob") {
        fileExtension = extractedExt
      } else if (file.type && MIME_TO_EXTENSION[file.type]) {
        fileExtension = MIME_TO_EXTENSION[file.type]
      }
    } else if (file.type && MIME_TO_EXTENSION[file.type]) {
      fileExtension = MIME_TO_EXTENSION[file.type]
    }

    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, "0")

    const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExtension}`
    
    const storageKey = folder === "uploads"
      ? `${folder}/${user.id}/${year}/${month}/${fileName}`
      : `${folder}/${user.id}/${fileName}`

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