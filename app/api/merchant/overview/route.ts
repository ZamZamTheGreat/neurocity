import { and, count, eq } from "drizzle-orm";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { getDb } from "../../../../db";
import { orders, products } from "../../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  // The current deployment is owner-only. Replace this pilot gate with
  // merchant_memberships before the site is shared with external users.
  if (!user) return Response.json({ error: "Merchant access requires authentication." }, { status: 403 });
  try {
    const db = getDb();
    const [[productCount], [publishedCount], [orderCount]] = await Promise.all([
      db.select({ value: count() }).from(products).where(eq(products.merchantId, 1)),
      db.select({ value: count() }).from(products).where(and(eq(products.merchantId, 1), eq(products.status, "published"))),
      db.select({ value: count() }).from(orders).where(eq(orders.merchantId, 1)),
    ]);
    return Response.json({ products: productCount.value, publishedProducts: publishedCount.value, orders: orderCount.value, readiness: 42 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Overview unavailable" }, { status: 500 });
  }
}
