import { and, count, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { merchants, orders, products, storeBranches, storeHours } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Active merchant membership required." }, { status: 403 });
  try {
    const db = getDb();
    const [[productCount], [publishedCount], [orderCount], [merchant], [branch]] = await Promise.all([
      db.select({ value: count() }).from(products).where(eq(products.merchantId, access.merchantId)),
      db.select({ value: count() }).from(products).where(and(eq(products.merchantId, access.merchantId), eq(products.status, "published"))),
      db.select({ value: count() }).from(orders).where(eq(orders.merchantId, access.merchantId)),
      db.select().from(merchants).where(eq(merchants.id, access.merchantId)).limit(1),
      db.select().from(storeBranches).where(and(eq(storeBranches.merchantId, access.merchantId), eq(storeBranches.isPrimary, true))).limit(1),
    ]);
    const hours = branch ? await db.select().from(storeHours).where(eq(storeHours.branchId, branch.id)) : [];
    const policies = (merchant?.policies ?? {}) as Record<string, string>;
    const checks = [
      Boolean(merchant?.name && merchant.category && merchant.tagline && merchant.description),
      Boolean(merchant?.contactName && merchant.contactEmail && merchant.contactPhone),
      Boolean(merchant?.logoUrl && merchant.bannerUrl),
      Boolean(branch?.address),
      Boolean(branch?.pickupEnabled || branch?.deliveryEnabled),
      hours.length === 7,
      Boolean(policies.returns),
    ];
    const readiness = Math.round(checks.filter(Boolean).length / checks.length * 100);
    return Response.json({ products: productCount.value, publishedProducts: publishedCount.value, orders: orderCount.value, readiness });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Overview unavailable" }, { status: 500 });
  }
}
