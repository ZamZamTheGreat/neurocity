import type { Metadata } from "next";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, storeBranches } from "../../../db/schema";
import { siteUrl } from "../../../lib/site-url";

async function publicStore(slug: string) {
  const [store] = await getDb().select().from(merchants).where(and(eq(merchants.slug, slug), eq(merchants.isPublic, true), inArray(merchants.status, ["active", "pilot"]))).limit(1);
  return store ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const store = await publicStore(slug);
  if (!store) return { title: "Store unavailable | NeuroCity", robots: { index: false, follow: false } };
  const title = `${store.name} | Shop on NeuroCity`;
  const description = (store.description || store.tagline || `Shop ${store.name}, a local Namibian ${store.category} business on NeuroCity.`).slice(0, 160);
  const canonical = `${siteUrl()}/stores/${encodeURIComponent(store.slug)}`;
  const image = store.bannerUrl && !store.bannerUrl.startsWith("r2://") ? store.bannerUrl : undefined;
  return { title, description, alternates: { canonical }, openGraph: { title, description, url: canonical, type: "website", images: image ? [image] : undefined }, twitter: { card: "summary_large_image", title, description, images: image ? [image] : undefined } };
}

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await publicStore(slug);
  let structuredData: Record<string, unknown> | null = null;
  if (store) {
    const [branch] = await getDb().select().from(storeBranches).where(and(eq(storeBranches.merchantId, store.id), eq(storeBranches.isPrimary, true))).limit(1);
    structuredData = {
      "@context": "https://schema.org", "@type": "LocalBusiness", name: store.name,
      description: store.description || store.tagline || undefined, url: `${siteUrl()}/stores/${encodeURIComponent(store.slug)}`,
      image: store.bannerUrl && !store.bannerUrl.startsWith("r2://") ? store.bannerUrl : undefined,
      email: store.contactEmail || undefined, telephone: store.contactPhone || undefined,
      address: branch ? { "@type": "PostalAddress", streetAddress: branch.address, addressLocality: branch.city, addressCountry: "NA" } : undefined,
    };
  }
  return <>{structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />}{children}</>;
}
