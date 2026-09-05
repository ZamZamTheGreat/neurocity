import type { MetadataRoute } from "next";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../db";
import { merchants, platformTenants } from "../db/schema";
import { siteUrl } from "../lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const staticPages: MetadataRoute.Sitemap = [
    ["", "weekly", 1], ["/marketplace", "daily", 0.9], ["/malls", "weekly", 0.8],
    ["/apply", "monthly", 0.5], ["/join", "monthly", 0.5], ["/privacy", "yearly", 0.2], ["/terms", "yearly", 0.2],
  ].map(([path, changeFrequency, priority]) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency, priority })) as MetadataRoute.Sitemap;

  try {
    const db = getDb();
    const [stores, malls] = await Promise.all([
      db.select({ slug: merchants.slug, createdAt: merchants.createdAt }).from(merchants).where(and(eq(merchants.isPublic, true), inArray(merchants.status, ["active", "pilot"]))),
      db.select({ slug: platformTenants.slug, updatedAt: platformTenants.updatedAt }).from(platformTenants).where(and(eq(platformTenants.kind, "mall"), eq(platformTenants.status, "active"))),
    ]);
    return [
      ...staticPages,
      ...stores.map((store) => ({ url: `${base}/stores/${encodeURIComponent(store.slug)}`, lastModified: store.createdAt, changeFrequency: "daily" as const, priority: 0.8 })),
      ...malls.map((mall) => ({ url: `${base}/malls/${encodeURIComponent(mall.slug)}`, lastModified: mall.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
    ];
  } catch (error) {
    console.error("sitemap catalogue lookup failed", error instanceof Error ? error.message : error);
    return staticPages;
  }
}
