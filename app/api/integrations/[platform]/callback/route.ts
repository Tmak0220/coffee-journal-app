import { createHmac, timingSafeEqual } from "crypto"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { appUrl, dashboardRedirect, integrationCredentials, integrationRedirectUri, isEcPlatform, serviceClient, SQUARE_API_VERSION } from "@/lib/ec-integrations"

export async function GET(request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: rawPlatform } = await params
  if (!isEcPlatform(rawPlatform)) return NextResponse.json({ error: "Unsupported platform" }, { status: 404 })
  const baseUrl = appUrl(request)
  const cookieStore = await cookies()
  const cookie = cookieStore.get(`ec_oauth_${rawPlatform}`)?.value
  let context: { state: string; userId: string; lang: string; shop?: string | null }
  try { context = JSON.parse(Buffer.from(cookie || "", "base64url").toString()) } catch { return NextResponse.json({ error: "OAuth session expired" }, { status: 400 }) }
  cookieStore.delete(`ec_oauth_${rawPlatform}`)
  const url = new URL(request.url)
  if (!url.searchParams.get("code") || url.searchParams.get("state") !== context.state || url.searchParams.get("error")) return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "error", rawPlatform))

  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user || user.id !== context.userId) return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "error", rawPlatform))
  const { data: origin } = await auth.from("origins").select("id").eq("user_id", user.id).eq("is_approved", true).eq("is_public", true).limit(1).maybeSingle()
  if (!origin) return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "error", rawPlatform))

  const credentials = integrationCredentials(rawPlatform)
  if (!credentials.clientId || !credentials.clientSecret) return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "error", rawPlatform))
  if (rawPlatform === "shopify") {
    const hmac = url.searchParams.get("hmac") || ""
    const message = Array.from(url.searchParams.entries()).filter(([key]) => key !== "hmac").sort(([a], [b]) => a.localeCompare(b)).map(([key, value]) => `${key}=${value}`).join("&")
    const digest = createHmac("sha256", credentials.clientSecret).update(message).digest("hex")
    if (!hmac || hmac.length !== digest.length || !timingSafeEqual(Buffer.from(hmac), Buffer.from(digest))) return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "error", rawPlatform))
  }

  const code = url.searchParams.get("code")!
  const callback = integrationRedirectUri(request, rawPlatform)
  let tokenResponse: Response
  if (rawPlatform === "base") tokenResponse = await fetch("https://api.thebase.in/1/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "authorization_code", client_id: credentials.clientId, client_secret: credentials.clientSecret, code, redirect_uri: callback }) })
  else if (rawPlatform === "shopify") tokenResponse = await fetch(`https://${context.shop}/admin/oauth/access_token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, code, expiring: "1" }) })
  else tokenResponse = await fetch(process.env.SQUARE_ENVIRONMENT === "sandbox" ? "https://connect.squareupsandbox.com/oauth2/token" : "https://connect.squareup.com/oauth2/token", { method: "POST", headers: { "Content-Type": "application/json", "Square-Version": SQUARE_API_VERSION }, body: JSON.stringify({ client_id: credentials.clientId, client_secret: credentials.clientSecret, code, grant_type: "authorization_code", redirect_uri: callback }) })
  if (!tokenResponse.ok) { console.error(`${rawPlatform} token exchange failed:`, await tokenResponse.text()); return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "error", rawPlatform)) }
  const token: any = await tokenResponse.json()
  const expiresAt = token.expires_at || (token.expires_in ? new Date(Date.now() + Number(token.expires_in) * 1000).toISOString() : null)
  const refreshTokenExpiresAt = token.refresh_token_expires_in
    ? new Date(Date.now() + Number(token.refresh_token_expires_in) * 1000).toISOString()
    : null
  const shopUrl = context.shop ? `https://${context.shop}` : null
  const { error } = await serviceClient().from("shop_api_configs").upsert({
    user_id: context.userId,
    platform_type: rawPlatform,
    shop_url: shopUrl,
    access_token: token.access_token,
    refresh_token: token.refresh_token || null,
    expires_at: expiresAt,
    refresh_token_expires_at: refreshTokenExpiresAt,
    store_domain: context.shop || null,
    external_account_id: token.merchant_id || null,
    scopes: token.scope ? String(token.scope).split(/[ ,]+/).filter(Boolean) : [],
    last_sync_error: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,platform_type" })
  if (error) { console.error("Failed to save EC token:", error); return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "error", rawPlatform)) }
  return NextResponse.redirect(dashboardRedirect(baseUrl, context.lang, "success", rawPlatform))
}
