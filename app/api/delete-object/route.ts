import { NextResponse } from "next/server"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { createClient } from "@/lib/supabase-server"

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    const urlObj = new URL(url)
    const allowedHosts = [
      process.env.R2_PUBLIC_URL,
      process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
    ].filter(Boolean).map((value) => new URL(value!).hostname)
    if (allowedHosts.length === 0 || !allowedHosts.includes(urlObj.hostname)) {
      return NextResponse.json({ error: "Invalid storage URL" }, { status: 400 })
    }
    
    let key = decodeURIComponent(urlObj.pathname.slice(1))

    if (key.includes("?")) {
      key = key.split("?")[0]
    }
    if (!key || key.includes("..")) {
      return NextResponse.json({ error: "Invalid object key" }, { status: 400 })
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: key,
    })

    await r2.send(deleteCommand)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("R2 Delete Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
