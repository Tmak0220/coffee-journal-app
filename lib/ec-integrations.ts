import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export type EcPlatform = "base" | "shopify" | "square"
export const isEcPlatform = (value: string): value is EcPlatform => ["base", "shopify", "square"].includes(value)

export function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Supabase service credentials are not configured")
  return createSupabaseClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

export function appUrl(request: Request) {
  return (process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin).replace(/\/$/, "")
}

export function normalizeShopifyDomain(input: string) {
  const value = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "")
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(value) ? value : null
}

export function integrationCredentials(platform: EcPlatform) {
  if (platform === "base") return { clientId: process.env.BASE_CLIENT_ID, clientSecret: process.env.BASE_CLIENT_SECRET }
  if (platform === "shopify") return { clientId: process.env.SHOPIFY_CLIENT_ID, clientSecret: process.env.SHOPIFY_CLIENT_SECRET }
  return { clientId: process.env.SQUARE_APPLICATION_ID, clientSecret: process.env.SQUARE_APPLICATION_SECRET }
}

export function dashboardRedirect(baseUrl: string, lang: string, status: "success" | "error", platform: EcPlatform) {
  return `${baseUrl}/${lang === "en" ? "en" : "ja"}/dashboard?tab=shop_manage&integration=${status}&platform=${platform}`
}
