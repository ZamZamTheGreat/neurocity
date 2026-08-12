import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, products, productVariants, storeBranches, variantInventory } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const rows = await getDb().select({ inventoryId: variantInventory.id, variantId: productVariants.id, productId: products.id, productName: products.name, variantTitle: productVariants.title, size: productVariants.size, color: productVariants.color, sku: productVariants.sku, variantStatus: productVariants.status, branchId: storeBranches.id, branch: storeBranches.name, onHand: variantInventory.onHand, reserved: variantInventory.reserved, safetyStock: variantInventory.safetyStock }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).leftJoin(variantInventory, eq(variantInventory.variantId, productVariants.id)).leftJoin(storeBranches, eq(storeBranches.id, variantInventory.branchId)).where(eq(products.merchantId, access.merchantId)).orderBy(asc(products.id), asc(productVariants.id));
  return Response.json({ inventory: rows.map((row) => ({ ...row, branch: row.branch ?? "Primary branch", onHand: row.onHand ?? 0, reserved: row.reserved ?? 0, safetyStock: row.safetyStock ?? 0, available: Math.max(0, (row.onHand ?? 0) - (row.reserved ?? 0) - (row.safetyStock ?? 0)) })) }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  try {
    const payload = await request.json() as { variantId?: number; onHand?: number; safetyStock?: number };
    if (!Number.isInteger(payload.variantId)) return Response.json({ error: "A valid product option is required." }, { status: 400 });
    if (!Number.isInteger(payload.onHand) || payload.onHand! < 0) return Response.json({ error: "On-hand stock must be a non-negative whole number." }, { status: 400 });
    if (!Number.isInteger(payload.safetyStock) || payload.safetyStock! < 0) return Response.json({ error: "Safety stock must be a non-negative whole number." }, { status: 400 });
    const db = getDb();
    const [variant] = await db.select({ id: productVariants.id, productId: products.id, productName: products.name, sku: productVariants.sku }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(and(eq(productVariants.id, payload.variantId!), eq(products.merchantId, access.merchantId))).limit(1);
    if (!variant) return Response.json({ error: "Product option not found." }, { status: 404 });
    const [branch] = await db.select().from(storeBranches).where(eq(storeBranches.merchantId, access.merchantId)).orderBy(asc(storeBranches.id)).limit(1);
    if (!branch) return Response.json({ error: "Complete your primary branch setup before managing inventory." }, { status: 409 });
    const [row] = await db.insert(variantInventory).values({ variantId: variant.id, branchId: branch.id, onHand: payload.onHand!, reserved: 0, safetyStock: payload.safetyStock! }).onConflictDoUpdate({ target: [variantInventory.variantId, variantInventory.branchId], set: { onHand: payload.onHand!, safetyStock: payload.safetyStock!, updatedAt: new Date() } }).returning();
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "variant_inventory.adjusted", resourceType: "product_variant", resourceId: String(variant.id), metadata: { productId: variant.productId, sku: variant.sku, branchId: branch.id, onHand: row.onHand, reserved: row.reserved, safetyStock: row.safetyStock }, createdAt: new Date() });
    return Response.json({ inventory: { ...row, productName: variant.productName, sku: variant.sku, branch: branch.name, available: Math.max(0, row.onHand - row.reserved - row.safetyStock) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Inventory update failed" }, { status: 500 });
  }
}
