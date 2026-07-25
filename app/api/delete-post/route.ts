import { NextRequest } from "next/server"
import { POST as deleteContent } from "../delete-content/route"

// Backward-compatible, authenticated entry point for older clients.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const forwarded = new NextRequest(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify({ id: body.postId, type: "tasting" }),
  })
  return deleteContent(forwarded)
}
