import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

const siteUrl = SITE_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/ja/dashboard",
        "/en/dashboard",
        "/ja/edit-post",
        "/en/edit-post",
        "/ja/bookmarks",
        "/en/bookmarks",
        "/ja/login",
        "/en/login",
        "/ja/forgot-password",
        "/en/forgot-password",
        "/ja/reset-password",
        "/en/reset-password",
        "/ja/members/success",
        "/en/members/success",
        "/ja/search/result",
        "/en/search/result",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
