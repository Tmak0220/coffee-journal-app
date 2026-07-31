import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export type EcPlatform = "base" | "shopify" | "square"
export const isEcPlatform = (value: string): value is EcPlatform => ["base", "shopify", "square"].includes(value)
export const SQUARE_API_VERSION = "2026-07-15"

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
  const trim = (value: string | undefined) => value?.trim()
  if (platform === "base") return { clientId: trim(process.env.BASE_CLIENT_ID), clientSecret: trim(process.env.BASE_CLIENT_SECRET) }
  if (platform === "shopify") return { clientId: trim(process.env.SHOPIFY_CLIENT_ID), clientSecret: trim(process.env.SHOPIFY_CLIENT_SECRET) }
  return { clientId: trim(process.env.SQUARE_APPLICATION_ID), clientSecret: trim(process.env.SQUARE_APPLICATION_SECRET) }
}

export function integrationRedirectUri(request: Request, platform: EcPlatform) {
  if (platform === "base" && process.env.BASE_REDIRECT_URI?.trim()) {
    return process.env.BASE_REDIRECT_URI.trim()
  }
  return `${appUrl(request)}/api/integrations/${platform}/callback`
}

export function dashboardRedirect(baseUrl: string, lang: string, status: "success" | "error", platform: EcPlatform) {
  return `${baseUrl}/${lang === "en" ? "en" : "ja"}/dashboard?tab=shop_manage&integration=${status}&platform=${platform}`
}
