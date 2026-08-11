import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensurePilotCatalogue } from "../../../db/catalogue";
import { merchants } from "../../../db/schema";

export async function GET() {
  await ensurePilotCatalogue();
  const stores = await getDb().select({ id: merchants.id, name: merchants.name, slug: merchants.slug, category: merchants.category, tagline: merchants.tagline, description: merchants.description, logoUrl: merchants.logoUrl, bannerUrl: merchants.bannerUrl, fulfillmentMethods: merchants.fulfillmentMethods }).from(merchants).where(and(eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "onboarding", "active"]))).orderBy(asc(merchants.name));
  return Response.json({ stores: stores.map((store) => ({ ...store, logoUrl: store.logoUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=logo` : store.logoUrl, bannerUrl: store.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=banner` : store.bannerUrl })) }, { headers: { "cache-control": "no-store" } });
}
