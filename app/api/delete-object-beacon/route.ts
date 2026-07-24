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

    const { urls } = await request.json()

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: "URLs array is required" }, { status: 400 })
    }

    for (const url of urls) {
      try {
        const urlObj = new URL(url)
        const allowedHosts = [
          process.env.R2_PUBLIC_URL,
          process.env.NEXT_PUBLIC_R2_PUBLIC_URL,
        ].filter(Boolean).map((value) => new URL(value!).hostname)
        if (allowedHosts.length === 0 || !allowedHosts.includes(urlObj.hostname)) continue
        let key = decodeURIComponent(urlObj.pathname.slice(1))

        if (key.includes("?")) {
          key = key.split("?")[0]
        }
        if (!key || key.includes("..")) continue

        const deleteCommand = new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: key,
        })

        await r2.send(deleteCommand)
      } catch (err) {
        console.error(`Failed to delete individual file: ${url}`, err)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("R2 Batch Delete Error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
