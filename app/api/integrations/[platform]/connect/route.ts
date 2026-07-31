import { randomUUID } from "crypto"
import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createClient } from "@/lib/supabase-server"
import { integrationCredentials, integrationRedirectUri, isEcPlatform, normalizeShopifyDomain } from "@/lib/ec-integrations"

export async function GET(request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: rawPlatform } = await params
  if (!isEcPlatform(rawPlatform)) return NextResponse.json({ error: "Unsupported platform" }, { status: 404 })
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.redirect(new URL("/ja/login", request.url))
  const { data: account } = await supabase.from("users").select("membership_tier").eq("id", user.id).maybeSingle()
  if (account?.membership_tier !== "business") return NextResponse.json({ error: "Business membership required" }, { status: 403 })

  const credentials = integrationCredentials(rawPlatform)
  if (!credentials.clientId || !credentials.clientSecret) return NextResponse.json({ error: `${rawPlatform} credentials are not configured` }, { status: 503 })
  const url = new URL(request.url)
  const lang = url.searchParams.get("lang") === "en" ? "en" : "ja"
  const shop = rawPlatform === "shopify" ? normalizeShopifyDomain(url.searchParams.get("shop") || "") : null
  if (rawPlatform === "shopify" && !shop) return NextResponse.json({ error: "Valid myshopify.com domain required" }, { status: 400 })

  const state = randomUUID()
  const callback = integrationRedirectUri(request, rawPlatform)
  const cookieStore = await cookies()
  cookieStore.set(`ec_oauth_${rawPlatform}`, Buffer.from(JSON.stringify({ state, userId: user.id, lang, shop })).toString("base64url"), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" })

  let authorizationUrl: URL
  if (rawPlatform === "base") {
    authorizationUrl = new URL("https://api.thebase.in/1/oauth/authorize")
    authorizationUrl.search = new URLSearchParams({ response_type: "code", client_id: credentials.clientId, redirect_uri: callback, scope: "read_items", state }).toString()
  } else if (rawPlatform === "shopify") {
    authorizationUrl = new URL(`https://${shop}/admin/oauth/authorize`)
    authorizationUrl.search = new URLSearchParams({ client_id: credentials.clientId, scope: "read_products", redirect_uri: callback, state }).toString()
  } else {
    const sandbox = process.env.SQUARE_ENVIRONMENT === "sandbox"
    authorizationUrl = new URL(sandbox ? "https://connect.squareupsandbox.com/oauth2/authorize" : "https://connect.squareup.com/oauth2/authorize")
    authorizationUrl.search = new URLSearchParams({ client_id: credentials.clientId, scope: "ITEMS_READ MERCHANT_PROFILE_READ", session: "false", state }).toString()
  }
  return NextResponse.redirect(authorizationUrl)
}
