import { and, eq, gt, gte, inArray, lt, lte, sql } from "drizzle-orm";
import { getDb } from "../db";
import { merchants, orders, orderWorkflowNotifications } from "../db/schema";
import { expireDueOrderRequests } from "./order-expiry";
import { sendOrderDeadlineNotification } from "./order-mail";
import { ORDER_WORKFLOW } from "./order-workflows";

type NoticeKind = "merchant_confirmation_reminder" | "customer_payment_reminder" | "confirmation_expired" | "payment_expired";
type Notice = { key: string; orderId: number; checkoutGroupId: number | null; audience: "merchant" | "customer"; to: string; reference: string; storeName: string; kind: NoticeKind; minutesRemaining?: number };

async function claimNotice(notice: Notice, at: Date) {
  const db = getDb();
  const [created] = await db.insert(orderWorkflowNotifications).values({ notificationKey: notice.key, checkoutGroupId: notice.checkoutGroupId, orderId: notice.orderId, audience: notice.audience, status: "processing", attempts: 1, updatedAt: at }).onConflictDoNothing({ target: orderWorkflowNotifications.notificationKey }).returning({ id: orderWorkflowNotifications.id, attempts: orderWorkflowNotifications.attempts });
  if (created) return created;
  const [retry] = await db.update(orderWorkflowNotifications).set({ status: "processing", attempts: sql`${orderWorkflowNotifications.attempts} + 1`, updatedAt: at }).where(and(eq(orderWorkflowNotifications.notificationKey, notice.key), eq(orderWorkflowNotifications.status, "failed"), lt(orderWorkflowNotifications.attempts, 3))).returning({ id: orderWorkflowNotifications.id, attempts: orderWorkflowNotifications.attempts });
  if (!retry) return null;
  return retry;
}

async function deliver(notice: Notice, at: Date) {
  const claim = await claimNotice(notice, at);
  if (!claim) return "skipped" as const;
  try {
    const result = await sendOrderDeadlineNotification(notice);
    if (!result.delivered) throw new Error(`Email ${result.reason}`);
    await getDb().update(orderWorkflowNotifications).set({ status: "delivered", sentAt: new Date(), lastError: null, updatedAt: new Date() }).where(eq(orderWorkflowNotifications.id, claim.id));
    return "delivered" as const;
  } catch (error) {
    await getDb().update(orderWorkflowNotifications).set({ status: "failed", lastError: error instanceof Error ? error.message.slice(0, 1000) : "Notification delivery failed", updatedAt: new Date() }).where(eq(orderWorkflowNotifications.id, claim.id));
    return "failed" as const;
  }
}

export async function runOrderOperations(at = new Date()) {
  const db = getDb();
  const reminderCutoff = new Date(at.getTime() + 10 * 60_000);
  const confirmationRows = await db.select({ id: orders.id, checkoutGroupId: orders.checkoutGroupId, expiresAt: orders.confirmationExpiresAt, merchantName: merchants.name, email: merchants.contactEmail }).from(orders).innerJoin(merchants, eq(merchants.id, orders.merchantId)).where(and(eq(orders.workflow, ORDER_WORKFLOW), eq(orders.status, "pending_merchant_confirmation"), gt(orders.confirmationExpiresAt, at), lte(orders.confirmationExpiresAt, reminderCutoff)));
  const paymentRows = await db.select({ id: orders.id, checkoutGroupId: orders.checkoutGroupId, expiresAt: orders.paymentExpiresAt, storeName: merchants.name, email: orders.customerEmail }).from(orders).innerJoin(merchants, eq(merchants.id, orders.merchantId)).where(and(eq(orders.workflow, ORDER_WORKFLOW), eq(orders.status, "accepted"), gt(orders.paymentExpiresAt, at), lte(orders.paymentExpiresAt, reminderCutoff)));
  const expiry = await expireDueOrderRequests(100, at);
  const expiredRows = await db.select({ id: orders.id, checkoutGroupId: orders.checkoutGroupId, status: orders.status, storeName: merchants.name, email: orders.customerEmail }).from(orders).innerJoin(merchants, eq(merchants.id, orders.merchantId)).where(and(eq(orders.workflow, ORDER_WORKFLOW), inArray(orders.status, ["confirmation_expired", "payment_expired"]), gte(orders.updatedAt, new Date(at.getTime() - 24 * 60 * 60_000))));

  const notices: Notice[] = confirmationRows.filter((row) => row.email).map((row) => ({ key: `confirmation-reminder:${row.id}`, orderId: row.id, checkoutGroupId: row.checkoutGroupId, audience: "merchant", to: row.email!, reference: `NC-${String(row.id).padStart(6, "0")}`, storeName: row.merchantName, kind: "merchant_confirmation_reminder", minutesRemaining: Math.max(1, Math.ceil((row.expiresAt!.getTime() - at.getTime()) / 60_000)) }));
  const seenPaymentGroups = new Set<number>();
  for (const row of paymentRows) if (row.checkoutGroupId && row.email && !seenPaymentGroups.has(row.checkoutGroupId)) { seenPaymentGroups.add(row.checkoutGroupId); notices.push({ key: `payment-reminder:${row.checkoutGroupId}`, orderId: row.id, checkoutGroupId: row.checkoutGroupId, audience: "customer", to: row.email, reference: `NC-CHECKOUT-${row.checkoutGroupId}`, storeName: "Confirmed NeuroCity checkout", kind: "customer_payment_reminder", minutesRemaining: Math.max(1, Math.ceil((row.expiresAt!.getTime() - at.getTime()) / 60_000)) }); }
  const seenExpiredGroups = new Set<string>();
  for (const row of expiredRows) {
    if (!row.email) continue;
    const scope = row.checkoutGroupId ? `${row.status}:${row.checkoutGroupId}` : `${row.status}:order:${row.id}`;
    if (seenExpiredGroups.has(scope)) continue;
    seenExpiredGroups.add(scope);
    notices.push({ key: `expiry:${scope}`, orderId: row.id, checkoutGroupId: row.checkoutGroupId, audience: "customer", to: row.email, reference: row.checkoutGroupId ? `NC-CHECKOUT-${row.checkoutGroupId}` : `NC-${String(row.id).padStart(6, "0")}`, storeName: row.status === "confirmation_expired" ? "One or more stores" : "Confirmed NeuroCity checkout", kind: row.status as "confirmation_expired" | "payment_expired" });
  }
  const results = await Promise.all(notices.map((notice) => deliver(notice, at)));
  return { expiry, remindersDue: confirmationRows.length + seenPaymentGroups.size, notifications: { delivered: results.filter((result) => result === "delivered").length, failed: results.filter((result) => result === "failed").length, skipped: results.filter((result) => result === "skipped").length } };
}
