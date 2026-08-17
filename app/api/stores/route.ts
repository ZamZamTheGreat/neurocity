import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { ensurePilotCatalogue } from "../../../db/catalogue";
import { merchants, platformTenantMerchants, storeBranches } from "../../../db/schema";
import { resolvePlatformTenant } from "../../../lib/platform-tenant";

export async function GET(request: Request) {
  await ensurePilotCatalogue();
  const db = getDb();
  const platform = await resolvePlatformTenant(request);
  const stores = await db.select({ id: merchants.id, name: merchants.name, slug: merchants.slug, category: merchants.category, status: merchants.status, tagline: merchants.tagline, description: merchants.description, logoUrl: merchants.logoUrl, bannerUrl: merchants.bannerUrl, fulfillmentMethods: merchants.fulfillmentMethods, policies: merchants.policies, contactEmail: merchants.contactEmail }).from(platformTenantMerchants).innerJoin(merchants, eq(platformTenantMerchants.merchantId, merchants.id)).where(and(eq(platformTenantMerchants.tenantId, platform.id), eq(platformTenantMerchants.status, "active"), eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "onboarding", "active"]))).orderBy(asc(platformTenantMerchants.sortOrder), asc(merchants.name));
  const branches = stores.length ? await db.select().from(storeBranches).where(and(inArray(storeBranches.merchantId, stores.map((store) => store.id)), eq(storeBranches.isPrimary, true))) : [];
  const ready = stores.filter((store) => store.name && store.category && store.tagline && store.description && store.logoUrl && store.bannerUrl && store.contactEmail && Array.isArray(store.fulfillmentMethods) && store.fulfillmentMethods.length > 0 && Boolean((store.policies as Record<string, string> | null)?.returns));
  return Response.json({ platform, stores: ready.map((store) => { const branch = branches.find((item) => item.merchantId === store.id); return { ...store, status: "open", branchName: branch?.name ?? null, branchAddress: branch?.address ?? null, logoUrl: store.logoUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=logo` : store.logoUrl, bannerUrl: store.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=banner` : store.bannerUrl }; }) }, { headers: { "cache-control": "no-store" } });
}
