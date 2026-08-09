import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, inventory, products } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const rows = await getDb().select({ id: inventory.id, productId: products.id, productName: products.name, sku: products.sku, branch: inventory.branch, onHand: inventory.onHand, reserved: inventory.reserved, safetyStock: inventory.safetyStock }).from(products).leftJoin(inventory, and(eq(inventory.productId, products.id), eq(inventory.branch, "Baines Centre"))).where(eq(products.merchantId, access.merchantId)).orderBy(asc(products.id));
  return Response.json({ inventory: rows.map((row) => ({ ...row, branch: row.branch ?? "Baines Centre", available: row.onHand === null ? null : Math.max(0, row.onHand - (row.reserved ?? 0) - (row.safetyStock ?? 0)) })) });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  try {
    const payload = await request.json() as { productId?: number; onHand?: number | null; safetyStock?: number };
    if (!Number.isInteger(payload.productId)) return Response.json({ error: "A valid product is required." }, { status: 400 });
    if (payload.onHand !== null && (!Number.isInteger(payload.onHand) || payload.onHand! < 0)) return Response.json({ error: "On-hand stock must be a non-negative whole number or blank." }, { status: 400 });
    if (!Number.isInteger(payload.safetyStock) || payload.safetyStock! < 0) return Response.json({ error: "Safety stock must be a non-negative whole number." }, { status: 400 });
    const db = getDb();
    const [product] = await db.select().from(products).where(and(eq(products.id, payload.productId!), eq(products.merchantId, access.merchantId))).limit(1);
    if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
    const [row] = await db.insert(inventory).values({ productId: product.id, branch: "Baines Centre", onHand: payload.onHand, reserved: 0, safetyStock: payload.safetyStock! }).onConflictDoUpdate({ target: [inventory.productId, inventory.branch], set: { onHand: payload.onHand, safetyStock: payload.safetyStock! } }).returning();
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "inventory.adjusted", resourceType: "product", resourceId: String(product.id), metadata: JSON.stringify({ branch: row.branch, onHand: row.onHand, safetyStock: row.safetyStock }), createdAt: new Date() });
    return Response.json({ inventory: { ...row, available: row.onHand === null ? null : Math.max(0, row.onHand - row.reserved - row.safetyStock) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Inventory update failed" }, { status: 500 });
  }
}
