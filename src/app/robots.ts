import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

// Private HTML pages (login, my page, admin, review form, search results) are kept out of search
// results with a noindex meta tag. They must stay crawlable here: a crawler that is blocked by
// robots.txt never sees the noindex tag. Only non-HTML endpoints are disallowed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
