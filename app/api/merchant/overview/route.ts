import { and, count, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orders, products } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Active merchant membership required." }, { status: 403 });
  try {
    const db = getDb();
    const [[productCount], [publishedCount], [orderCount]] = await Promise.all([
      db.select({ value: count() }).from(products).where(eq(products.merchantId, access.merchantId)),
      db.select({ value: count() }).from(products).where(and(eq(products.merchantId, access.merchantId), eq(products.status, "published"))),
      db.select({ value: count() }).from(orders).where(eq(orders.merchantId, access.merchantId)),
    ]);
    return Response.json({ products: productCount.value, publishedProducts: publishedCount.value, orders: orderCount.value, readiness: 42 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Overview unavailable" }, { status: 500 });
  }
}
