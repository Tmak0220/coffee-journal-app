import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase-server"
import { integrationCredentials, isEcPlatform, serviceClient, SQUARE_API_VERSION } from "@/lib/ec-integrations"

type ProductRow = { external_product_id: string; title: string; description: string | null; product_url: string | null; image_url: string | null; is_active: boolean }

async function refreshIfNeeded(platform: "base" | "shopify" | "square", config: any) {
  if (!config.expires_at || new Date(config.expires_at).getTime() - Date.now() > 5 * 60 * 1000) return config.access_token
  if (!config.refresh_token) throw new Error("Reconnect required")
  const credentials = integrationCredentials(platform)
  const endpoint = platform === "base"
    ? "https://api.thebase.in/1/oauth/token"
    : platform === "shopify"
      ? `https://${config.store_domain}/admin/oauth/access_token`
      : (process.env.SQUARE_ENVIRONMENT === "sandbox" ? "https://connect.squareupsandbox.com/oauth2/token" : "https://connect.squareup.com/oauth2/token")
  const response = await fetch(
    endpoint,
    platform === "base" || platform === "shopify"
      ? {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: credentials.clientId!,
            client_secret: credentials.clientSecret!,
            refresh_token: config.refresh_token,
          }),
        }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json", "Square-Version": SQUARE_API_VERSION },
          body: JSON.stringify({ grant_type: "refresh_token", client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: config.refresh_token }),
        },
  )
  if (!response.ok) throw new Error("Token refresh failed")
  const token: any = await response.json()
  const expiresAt = token.expires_at || new Date(Date.now() + Number(token.expires_in || 2592000) * 1000).toISOString()
  const refreshTokenExpiresAt = token.refresh_token_expires_in
    ? new Date(Date.now() + Number(token.refresh_token_expires_in) * 1000).toISOString()
    : config.refresh_token_expires_at
  const { error } = await serviceClient().from("shop_api_configs").update({
    access_token: token.access_token,
    refresh_token: token.refresh_token || config.refresh_token,
    expires_at: expiresAt,
    refresh_token_expires_at: refreshTokenExpiresAt,
    last_sync_error: null,
    updated_at: new Date().toISOString(),
  }).eq("id", config.id)
  if (error) throw error
  return token.access_token as string
}

async function fetchProducts(platform: "base" | "shopify" | "square", token: string, config: any): Promise<ProductRow[]> {
  if (platform === "base") {
    const response = await fetch("https://api.thebase.in/1/items?limit=100&max_image_no=1&image_size=origin", { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error("BASE product request failed")
    const json: any = await response.json()
    return (json.items || []).map((item: any) => ({ external_product_id: String(item.item_id), title: item.title, description: item.detail || null, product_url: item.item_url || null, image_url: item.img1_origin || null, is_active: Number(item.visible) !== 0 }))
  }
  if (platform === "shopify") {
    const response = await fetch(`https://${config.store_domain}/admin/api/2026-07/graphql.json`, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token }, body: JSON.stringify({ query: `query { products(first: 100) { nodes { id title descriptionHtml handle status featuredImage { url } } } }` }) })
    if (!response.ok) throw new Error("Shopify product request failed")
    const json: any = await response.json()
    if (json.errors) throw new Error("Shopify GraphQL request failed")
    return (json.data?.products?.nodes || []).map((item: any) => ({ external_product_id: item.id, title: item.title, description: item.descriptionHtml || null, product_url: `https://${config.store_domain}/products/${item.handle}`, image_url: item.featuredImage?.url || null, is_active: item.status === "ACTIVE" }))
  }
  const host = process.env.SQUARE_ENVIRONMENT === "sandbox" ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com"
  const response = await fetch(`${host}/v2/catalog/list?types=ITEM,IMAGE`, { headers: { Authorization: `Bearer ${token}`, "Square-Version": SQUARE_API_VERSION, "Content-Type": "application/json" } })
  if (!response.ok) throw new Error("Square catalog request failed")
  const json: any = await response.json()
  const images = new Map((json.objects || []).filter((item: any) => item.type === "IMAGE").map((item: any) => [item.id, item.image_data?.url]))
  return (json.objects || []).filter((item: any) => item.type === "ITEM").map((item: any) => ({ external_product_id: item.id, title: item.item_data?.name || "Untitled", description: item.item_data?.description || null, product_url: item.item_data?.ecom_uri || null, image_url: images.get(item.item_data?.image_ids?.[0]) || null, is_active: !item.is_deleted }))
}

export async function POST(_request: Request, { params }: { params: Promise<{ platform: string }> }) {
  const { platform: rawPlatform } = await params
  if (!isEcPlatform(rawPlatform)) return NextResponse.json({ error: "Unsupported platform" }, { status: 404 })
  const auth = await createClient()
  const { data: { user } } = await auth.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const { data: origin } = await auth.from("origins").select("id").eq("user_id", user.id).eq("is_approved", true).eq("is_public", true).limit(1).maybeSingle()
  if (!origin) return NextResponse.json({ error: "Approved owner profile required" }, { status: 403 })
  const service = serviceClient()
  const { data: config, error } = await service.from("shop_api_configs").select("*").eq("user_id", user.id).eq("platform_type", rawPlatform).maybeSingle()
  if (error || !config) return NextResponse.json({ error: "Connect this platform first" }, { status: 409 })
  try {
    const token = await refreshIfNeeded(rawPlatform, config)
    const products = await fetchProducts(rawPlatform, token, config)
    const { error: deactivateError } = await service.from("shop_products").update({ is_active: false }).eq("user_id", user.id).eq("platform_type", rawPlatform)
    if (deactivateError) throw deactivateError
    if (products.length) {
      const { error: upsertError } = await service.from("shop_products").upsert(products.map((product) => ({ ...product, user_id: user.id, platform_type: rawPlatform, updated_at: new Date().toISOString() })), { onConflict: "user_id,platform_type,external_product_id" })
      if (upsertError) throw upsertError
    }
    const { error: statusError } = await service.from("shop_api_configs").update({
      last_synced_at: new Date().toISOString(),
      last_sync_error: null,
      updated_at: new Date().toISOString(),
    }).eq("id", config.id)
    if (statusError) throw statusError
    return NextResponse.json({ count: products.length })
  } catch (syncError) {
    console.error(`${rawPlatform} sync failed:`, syncError)
    await service.from("shop_api_configs").update({
      last_sync_error: syncError instanceof Error ? syncError.message.slice(0, 500) : "Unknown sync error",
      updated_at: new Date().toISOString(),
    }).eq("id", config.id)
    return NextResponse.json({ error: "Product sync failed. Reconnect the platform if the problem continues." }, { status: 502 })
  }
}
