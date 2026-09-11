import { and, eq, inArray, isNotNull, lte, or } from "drizzle-orm";
import { getDb } from "../db";
import { auditEvents, checkoutGroups, orders, orderStatusEvents } from "../db/schema";
import { cancelCheckoutAllocationsAndReleaseStock } from "./settlements";
import { ORDER_WORKFLOW } from "./order-workflows";

export async function expireDueOrderRequests(limit = 40, at = new Date()) {
  const db = getDb();
  const due = await db.select({ id: orders.id, checkoutGroupId: orders.checkoutGroupId, customerRef: orders.customerRef, status: orders.status }).from(orders).where(and(eq(orders.workflow, ORDER_WORKFLOW), or(and(eq(orders.status, "pending_merchant_confirmation"), isNotNull(orders.confirmationExpiresAt), lte(orders.confirmationExpiresAt, at)), and(eq(orders.status, "accepted"), isNotNull(orders.paymentExpiresAt), lte(orders.paymentExpiresAt, at))))).limit(limit);
  const groups = [...new Map(due.filter((order) => order.checkoutGroupId).map((order) => [order.checkoutGroupId!, order])).values()];
  let expired = 0;
  for (const candidate of groups) {
    await db.transaction(async (tx) => {
      const target = candidate.status === "pending_merchant_confirmation" ? "confirmation_expired" : "payment_expired";
      const eligibleCheckoutStatuses = candidate.status === "pending_merchant_confirmation" ? ["pending_merchant_confirmation"] : ["awaiting_payment"];
      const [claimed] = await tx.update(checkoutGroups).set({ status: target, paymentStatus: "cancelled", updatedAt: at }).where(and(eq(checkoutGroups.id, candidate.checkoutGroupId!), inArray(checkoutGroups.status, eligibleCheckoutStatuses))).returning({ id: checkoutGroups.id });
      if (!claimed) return;
      const affected = await tx.update(orders).set({ status: target, paymentStatus: "cancelled", updatedAt: at }).where(and(eq(orders.checkoutGroupId, candidate.checkoutGroupId!), inArray(orders.status, candidate.status === "pending_merchant_confirmation" ? ["pending_merchant_confirmation", "accepted"] : ["accepted"]))).returning({ id: orders.id });
      await cancelCheckoutAllocationsAndReleaseStock(tx, candidate.checkoutGroupId!, Number(candidate.customerRef), at);
      if (affected.length) await tx.insert(orderStatusEvents).values(affected.map((order) => ({ orderId: order.id, status: target, actorRef: "system:order-expiry", note: candidate.status === "pending_merchant_confirmation" ? "Merchant confirmation window expired after 30 minutes." : "Customer payment window expired after 30 minutes." })));
      await tx.insert(auditEvents).values({ actorRef: "system:order-expiry", action: `order.${target}`, resourceType: "checkout_group", resourceId: String(candidate.checkoutGroupId), metadata: { affectedOrders: affected.map((order) => order.id) } });
      expired += affected.length;
    });
  }
  return { checked: due.length, expired };
}
