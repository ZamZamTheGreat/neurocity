import type { Metadata } from "next";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { platformTenants } from "../../../db/schema";
import { siteUrl } from "../../../lib/site-url";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const [mall] = await getDb().select().from(platformTenants).where(and(eq(platformTenants.slug, slug), eq(platformTenants.kind, "mall"), eq(platformTenants.status, "active"))).limit(1);
  if (!mall) return { title: "Digital mall unavailable | NeuroCity", robots: { index: false, follow: false } };
  const title = `${mall.name} digital mall | NeuroCity`;
  const description = (mall.tagline || `Explore ${mall.name}'s stores, products and services through its digital mall on NeuroCity.`).slice(0, 160);
  const canonical = `${siteUrl()}/malls/${encodeURIComponent(mall.slug)}`;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website" } };
}

export default function MallLayout({ children }: { children: React.ReactNode }) { return children; }
