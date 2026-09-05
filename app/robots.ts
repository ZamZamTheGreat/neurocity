import type { MetadataRoute } from "next";
import { siteUrl } from "../lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/account", "/access", "/admin", "/login", "/mall-manager", "/application-documents", "/application-status"],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
