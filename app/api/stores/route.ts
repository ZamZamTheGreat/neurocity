import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensurePilotCatalogue } from "../../../db/catalogue";
import { merchants, storeBranches } from "../../../db/schema";

export async function GET() {
  await ensurePilotCatalogue();
  const db = getDb();
  const stores = await db.select({ id: merchants.id, name: merchants.name, slug: merchants.slug, category: merchants.category, status: merchants.status, tagline: merchants.tagline, description: merchants.description, logoUrl: merchants.logoUrl, bannerUrl: merchants.bannerUrl, fulfillmentMethods: merchants.fulfillmentMethods, policies: merchants.policies, contactEmail: merchants.contactEmail }).from(merchants).where(and(eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "onboarding", "active"]))).orderBy(asc(merchants.name));
  const branches = stores.length ? await db.select().from(storeBranches).where(and(inArray(storeBranches.merchantId, stores.map((store) => store.id)), eq(storeBranches.isPrimary, true))) : [];
  const ready = stores.filter((store) => store.name && store.category && store.tagline && store.description && store.logoUrl && store.bannerUrl && store.contactEmail && Array.isArray(store.fulfillmentMethods) && store.fulfillmentMethods.length > 0 && Boolean((store.policies as Record<string, string> | null)?.returns));
  return Response.json({ stores: ready.map((store) => { const branch = branches.find((item) => item.merchantId === store.id); return { ...store, status: "open", branchName: branch?.name ?? null, branchAddress: branch?.address ?? null, logoUrl: store.logoUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=logo` : store.logoUrl, bannerUrl: store.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=banner` : store.bannerUrl }; }) }, { headers: { "cache-control": "no-store" } });
}
