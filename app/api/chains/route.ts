import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, storeBranches } from "../../../db/schema";
import { cachedPublicData, publicCacheHeaders } from "../../../lib/server-cache";

export async function GET() {
  try {
    const payload = await cachedPublicData("chains:directory", 60, async () => { const db = getDb();
    const chains = await db.select({
      id: merchants.id, name: merchants.name, slug: merchants.slug, category: merchants.category,
      tagline: merchants.tagline, description: merchants.description, logoUrl: merchants.logoUrl,
      bannerUrl: merchants.bannerUrl, branchCount: sql<number>`count(${storeBranches.id})::int`,
    }).from(merchants).innerJoin(storeBranches, eq(storeBranches.merchantId, merchants.id)).where(and(
      eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "active"]),
    )).groupBy(merchants.id).having(sql`count(${storeBranches.id}) > 1`).orderBy(asc(merchants.name));
    const branchRows = chains.length ? await db.select({ merchantId: storeBranches.merchantId, id: storeBranches.id, name: storeBranches.name, address: storeBranches.address, city: storeBranches.city, pickupEnabled: storeBranches.pickupEnabled, deliveryEnabled: storeBranches.deliveryEnabled }).from(storeBranches).where(inArray(storeBranches.merchantId, chains.map((chain) => chain.id))).orderBy(asc(storeBranches.city), asc(storeBranches.name)) : [];
    return { chains: chains.map((chain) => ({ ...chain,
      logoUrl: chain.logoUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(chain.slug)}/media?type=logo` : chain.logoUrl,
      bannerUrl: chain.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(chain.slug)}/media?type=banner` : chain.bannerUrl,
      branches: branchRows.filter((branch) => branch.merchantId === chain.id),
    })) }; }); return Response.json(payload, { headers: publicCacheHeaders(60, 300) });
  } catch (error) {
    console.error("public chain directory failed", error);
    return Response.json({ error: "Chain stores are temporarily unavailable." }, { status: 500 });
  }
}
