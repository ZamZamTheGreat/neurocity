import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, products } from "../../../db/schema";
import { cachedPublicData, publicCacheHeaders } from "../../../lib/server-cache";

export async function GET() {
  try {
    const payload = await cachedPublicData("catalogue:lightwork-clothing", 15, async () => {
    const db = getDb();
    const [merchant] = await db.select().from(merchants).where(eq(merchants.slug, "lightwork-clothing")).limit(1);
    if (!merchant || !merchant.isPublic || !["pilot", "active"].includes(merchant.status)) return null;
    const catalogue = await db.select().from(products).where(and(eq(products.merchantId, merchant.id), eq(products.status, "published"))).orderBy(asc(products.id));
    return { merchant, products: catalogue.map((product) => ({ ...product, imageUrl: product.imageUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(merchant.slug)}/media?type=product&productId=${product.id}` : product.imageUrl })) };
    });
    if (!payload) return Response.json({ error: "This storefront is currently unavailable." }, { status: 404, headers: { "cache-control": "no-store" } });
    return Response.json(payload, { headers: publicCacheHeaders(15, 60) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Catalogue unavailable" }, { status: 500 });
  }
}
