import type { DatabaseTransaction } from "../db";
import { and, eq, sql } from "drizzle-orm";
import { orderItemInventoryAllocations, orderItems, orders, variantInventory } from "../db/schema";
import { isPreorderLine } from "./preorders";

type InventoryTarget = "released" | "committed";

async function applyInventoryTransition(tx: DatabaseTransaction, orderId: number, target: InventoryTarget, at = new Date()) {
  const [claimed] = await tx.update(orders)
    .set({ inventoryState: target, updatedAt: at })
    .where(and(eq(orders.id, orderId), eq(orders.inventoryState, "reserved")))
    .returning({ id: orders.id });
  if (!claimed) return false;

  const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  const allocations = items.length ? await tx.select().from(orderItemInventoryAllocations).where(and(eq(orderItemInventoryAllocations.state, "reserved"), sql`${orderItemInventoryAllocations.orderItemId} in (${sql.join(items.map((item) => sql`${item.id}`), sql`, `)})`)) : [];
  if (allocations.length) {
    for (const allocation of allocations) {
      const [changed] = await tx.update(orderItemInventoryAllocations).set({ state: target, updatedAt: at }).where(and(eq(orderItemInventoryAllocations.id, allocation.id), eq(orderItemInventoryAllocations.state, "reserved"))).returning({ id: orderItemInventoryAllocations.id });
      if (!changed) continue;
      await tx.update(variantInventory).set({ reserved: sql`greatest(0, ${variantInventory.reserved} - ${allocation.quantity})`, ...(target === "committed" ? { onHand: sql`greatest(0, ${variantInventory.onHand} - ${allocation.quantity})` } : {}), updatedAt: at }).where(eq(variantInventory.id, allocation.inventoryId));
    }
    return true;
  }

  // Orders created before allocation tracking use the aggregate reservation as a safe migration fallback.
  for (const item of items.filter((row) => row.variantId && !isPreorderLine(row))) {
    const inventory = await tx.select().from(variantInventory).where(eq(variantInventory.variantId, item.variantId!));
    let remaining = item.quantity;
    for (const row of inventory) {
      const quantity = Math.min(remaining, row.reserved);
      if (quantity > 0) {
        await tx.update(variantInventory).set({
          reserved: sql`greatest(0, ${variantInventory.reserved} - ${quantity})`,
          ...(target === "committed" ? { onHand: sql`greatest(0, ${variantInventory.onHand} - ${quantity})` } : {}),
          updatedAt: at,
        }).where(eq(variantInventory.id, row.id));
      }
      remaining -= quantity;
      if (!remaining) break;
    }
    if (remaining > 0) throw new Error(`Inventory reservation is short by ${remaining} unit(s) for order ${orderId}, item ${item.id}.`);
  }
  return true;
}

export const releaseOrderInventory = (tx: DatabaseTransaction, orderId: number, at = new Date()) => applyInventoryTransition(tx, orderId, "released", at);
export const commitOrderInventory = (tx: DatabaseTransaction, orderId: number, at = new Date()) => applyInventoryTransition(tx, orderId, "committed", at);
