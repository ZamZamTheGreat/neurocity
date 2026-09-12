import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, products } from "../../../db/schema";
import { cachedPublicData, publicCacheHeaders } from "../../../lib/server-cache";

export async function GET() {
  try {
    const payload = await cachedPublicData("catalogue:marketplace", 15, async () => {
    const db = getDb();
    const catalogue = await db.select({ product: products, merchantName: merchants.name, merchantSlug: merchants.slug }).from(products).innerJoin(merchants, eq(products.merchantId, merchants.id)).where(and(eq(products.status, "published"), eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "active"]))).orderBy(asc(products.id));
    return { products: catalogue.map(({ product, merchantName, merchantSlug }) => ({ ...product, merchantName, merchantSlug, imageUrl: product.imageUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(merchantSlug)}/media?type=product&productId=${product.id}` : product.imageUrl })) };
    });
    return Response.json(payload, { headers: publicCacheHeaders(15, 60) });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Catalogue unavailable" }, { status: 500 });
  }
}
