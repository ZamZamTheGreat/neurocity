import type { DatabaseTransaction } from "../db";
import { eq, inArray } from "drizzle-orm";
import { customerCartItems, merchantPaymentAllocations, orderItems, orders } from "../db/schema";
import { releaseOrderInventory } from "./order-inventory";

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

export async function makeCheckoutAllocationsPayable(tx: DatabaseTransaction, checkoutGroupId: number, paidAt = new Date()) {
  const dueAt = addBusinessDays(paidAt, 2);
  await tx.update(merchantPaymentAllocations).set({ settlementStatus: "scheduled", settlementDueAt: dueAt, updatedAt: paidAt }).where(eq(merchantPaymentAllocations.checkoutGroupId, checkoutGroupId));
  return dueAt;
}

export async function makeOrderAllocationPayable(tx: DatabaseTransaction, orderId: number, paidAt = new Date()) {
  const dueAt = addBusinessDays(paidAt, 2);
  await tx.update(merchantPaymentAllocations).set({ settlementStatus: "scheduled", settlementDueAt: dueAt, updatedAt: paidAt }).where(eq(merchantPaymentAllocations.orderId, orderId));
  return dueAt;
}

export async function cancelCheckoutAllocationsAndReleaseStock(tx: DatabaseTransaction, checkoutGroupId: number, customerId: number, at = new Date()) {
  const checkoutOrders = await tx.select({ id: orders.id }).from(orders).where(eq(orders.checkoutGroupId, checkoutGroupId));
  const ids = checkoutOrders.map((item: { id: number }) => item.id);
  const items = ids.length ? await tx.select().from(orderItems).where(inArray(orderItems.orderId, ids)) : [];
  for (const order of checkoutOrders) await releaseOrderInventory(tx, order.id, at);
  for (const item of items) {
    if (item.variantId) await tx.insert(customerCartItems).values({ userId: customerId, variantId: item.variantId, quantity: item.quantity }).onConflictDoNothing();
  }
  await tx.update(merchantPaymentAllocations).set({ settlementStatus: "cancelled", updatedAt: at }).where(eq(merchantPaymentAllocations.checkoutGroupId, checkoutGroupId));
}
