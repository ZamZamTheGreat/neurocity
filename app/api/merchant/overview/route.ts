import { merchantReadiness } from "../../../../lib/merchant-readiness";
import { and, count, eq, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { merchants, orders, products, storeBranches, storeHours } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Active merchant membership required." }, { status: 403 });
  try {
    const db = getDb();
    const [[productCount], [orderCount], [merchant], [branch]] = await Promise.all([
      db.select({ value: count(), published: sql<number>`count(*) filter (where ${products.status} = 'published')`.mapWith(Number) }).from(products).where(eq(products.merchantId, access.merchantId)),
      db.select({ value: count() }).from(orders).where(eq(orders.merchantId, access.merchantId)),
      db.select().from(merchants).where(eq(merchants.id, access.merchantId)).limit(1),
      db.select().from(storeBranches).where(and(eq(storeBranches.merchantId, access.merchantId), eq(storeBranches.isPrimary, true))).limit(1),
    ]);
    const hours = branch ? await db.select().from(storeHours).where(eq(storeHours.branchId, branch.id)) : [];
    if (!merchant) return Response.json({ error: "Merchant not found." }, { status: 404 });
    const readiness = merchantReadiness(merchant, branch, hours).percent;
    return Response.json({ products: productCount.value, publishedProducts: productCount.published, orders: orderCount.value, readiness });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Overview unavailable" }, { status: 500 });
  }
}
