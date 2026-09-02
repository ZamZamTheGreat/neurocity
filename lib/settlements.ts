import { eq, inArray, sql } from "drizzle-orm";
import { customerCartItems, merchantPaymentAllocations, orderItems, orders, variantInventory } from "../db/schema";

export function addBusinessDays(from: Date, days: number) {
  const result = new Date(from);
  let remaining = days;
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + 1);
    const weekday = result.getUTCDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return result;
}

export async function makeCheckoutAllocationsPayable(tx: any, checkoutGroupId: number, paidAt = new Date()) {
  const dueAt = addBusinessDays(paidAt, 2);
  await tx.update(merchantPaymentAllocations).set({ settlementStatus: "scheduled", settlementDueAt: dueAt, updatedAt: paidAt }).where(eq(merchantPaymentAllocations.checkoutGroupId, checkoutGroupId));
  return dueAt;
}

export async function cancelCheckoutAllocationsAndReleaseStock(tx: any, checkoutGroupId: number, customerId: number, at = new Date()) {
  const checkoutOrders = await tx.select({ id: orders.id }).from(orders).where(eq(orders.checkoutGroupId, checkoutGroupId));
  const ids = checkoutOrders.map((item: { id: number }) => item.id);
  const items = ids.length ? await tx.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  for (const item of items) {
    if (item.variantId) {
      const stockRows = await tx.select().from(variantInventory).where(eq(variantInventory.variantId, item.variantId));
      let remaining = item.quantity;
      for (const stock of stockRows) {
        const released = Math.min(remaining, stock.reserved);
        if (released > 0) await tx.update(variantInventory).set({ reserved: sql`greatest(0, ${variantInventory.reserved} - ${released})`, updatedAt: at }).where(eq(variantInventory.id, stock.id));
        remaining -= released;
        if (!remaining) break;
      }
    }
    if (item.variantId) await tx.insert(customerCartItems).values({ userId: customerId, variantId: item.variantId, quantity: item.quantity }).onConflictDoNothing();
  }
  await tx.update(merchantPaymentAllocations).set({ settlementStatus: "cancelled", updatedAt: at }).where(eq(merchantPaymentAllocations.checkoutGroupId, checkoutGroupId));
}
