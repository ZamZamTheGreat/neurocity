import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db";
import { auditEvents, checkoutGroups, merchantPaymentAllocations, orders, paymentTransactions } from "../db/schema";
import { lookupPayTodayPayment, normalizePayTodayStatus } from "./paytoday";
import { cancelCheckoutAllocationsAndReleaseStock, makeCheckoutAllocationsPayable } from "./settlements";

export async function reconcilePayTodayTransaction(transactionId: number, actorRef = "system:paytoday-reconciliation") {
  const db = getDb();
  const [transaction] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.id, transactionId), eq(paymentTransactions.provider, "paytoday"))).limit(1);
  if (!transaction?.providerPaymentToken) throw new Error("PayToday transaction is not ready for reconciliation.");
  const [checkout] = await db.select().from(checkoutGroups).where(eq(checkoutGroups.id, transaction.checkoutGroupId)).limit(1);
  if (!checkout) throw new Error("Checkout could not be found.");

  const provider = await lookupPayTodayPayment(transaction.providerPaymentToken);
  const intentToken = provider.intent?.payment_token ?? provider.payment_intent_token ?? provider.payment_token;
  const intentReference = provider.intent?.invoice_number ?? provider.invoice_number;
  const intentAmount = Number(provider.intent?.amount ?? provider.amount);
  if (intentToken && intentToken !== transaction.providerPaymentToken) throw new Error("PayToday returned a different payment token.");
  if (intentReference && intentReference !== checkout.reference) throw new Error("PayToday returned a different invoice reference.");
  if (Number.isFinite(intentAmount) && Math.abs(intentAmount - transaction.amount) > 0.005) throw new Error("PayToday returned a different payment amount.");

  const providerStatus = provider.intent?.transaction_status ?? provider.status;
  const status = normalizePayTodayStatus(providerStatus);
  const paidAfterCancellation = status === "paid" && checkout.paymentStatus === "cancelled";
  const at = new Date();
  await db.transaction(async (tx) => {
    const providerReference = provider.intent?.transaction_data?.payment_reference ?? provider.intent?.reference ?? provider.reference ?? null;
    await tx.update(paymentTransactions).set({ status, providerReference, lastCheckedAt: at, providerMetadata: { status: providerStatus ?? null, reference: providerReference, reason: provider.intent?.transaction_data?.reason ?? null, finalizedAt: provider.intent?.transaction_data?.time_stamp ?? null }, updatedAt: at }).where(eq(paymentTransactions.id, transaction.id));
    const checkoutStatus = paidAfterCancellation ? "refund_required" : status === "paid" ? "paid" : status === "failed" ? "payment_failed" : status;
    await tx.update(checkoutGroups).set({ paymentStatus: status, status: checkoutStatus, updatedAt: at }).where(eq(checkoutGroups.id, checkout.id));
    if (["paid", "failed", "cancelled", "expired"].includes(status)) await tx.update(orders).set({ paymentStatus: status, status: paidAfterCancellation ? "cancelled" : status === "paid" ? "pending_merchant_confirmation" : checkoutStatus, updatedAt: at }).where(eq(orders.checkoutGroupId, checkout.id));
    if (paidAfterCancellation) await tx.update(merchantPaymentAllocations).set({ settlementStatus: "refund_required", updatedAt: at }).where(eq(merchantPaymentAllocations.checkoutGroupId, checkout.id));
    else if (status === "paid" && checkout.paymentStatus !== "paid") await makeCheckoutAllocationsPayable(tx, checkout.id, at);
    if (["failed", "cancelled", "expired"].includes(status) && !["failed", "cancelled", "expired"].includes(checkout.paymentStatus)) await cancelCheckoutAllocationsAndReleaseStock(tx, checkout.id, Number(checkout.customerRef), at);
    if (status !== transaction.status || paidAfterCancellation) await tx.insert(auditEvents).values({ actorRef, action: paidAfterCancellation ? "payment.paytoday.paid_after_cancellation" : `payment.paytoday.${status}`, resourceType: "checkout_group", resourceId: String(checkout.id), metadata: { reference: checkout.reference, transactionId: transaction.id, previousStatus: transaction.status } });
  });
  return { status: paidAfterCancellation ? "refund_required" : status, reference: checkout.reference };
}

export async function reconcilePendingPayTodayTransactions(limit = 10, actorRef?: string) {
  const db = getDb();
  const current = await db.select({ id: paymentTransactions.id, status: paymentTransactions.status }).from(paymentTransactions).where(eq(paymentTransactions.provider, "paytoday")).orderBy(desc(paymentTransactions.createdAt)).limit(100);
  const pendingIds = current.filter((row) => ["created", "creating", "pending"].includes(row.status)).slice(0, limit).map((row) => row.id);
  const results = await Promise.allSettled(pendingIds.map((id) => reconcilePayTodayTransaction(id, actorRef)));
  return { checked: pendingIds.length, updated: results.filter((result) => result.status === "fulfilled" && result.value.status !== "pending").length, failures: results.filter((result) => result.status === "rejected").length, candidates: current.length };
}
