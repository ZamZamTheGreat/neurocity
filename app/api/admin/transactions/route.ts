import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, checkoutGroups, merchantPaymentAllocations, merchants, orders, paymentTransactions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

export async function GET() {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const db = getDb();
  const gatewayRows = await db.select({ id: paymentTransactions.id, checkoutGroupId: paymentTransactions.checkoutGroupId, checkoutReference: checkoutGroups.reference, provider: paymentTransactions.provider, providerReference: paymentTransactions.providerReference, amount: paymentTransactions.amount, currency: paymentTransactions.currency, status: paymentTransactions.status, failureMessage: paymentTransactions.failureMessage, lastCheckedAt: paymentTransactions.lastCheckedAt, createdAt: paymentTransactions.createdAt, updatedAt: paymentTransactions.updatedAt }).from(paymentTransactions).innerJoin(checkoutGroups, eq(checkoutGroups.id, paymentTransactions.checkoutGroupId)).orderBy(desc(paymentTransactions.createdAt)).limit(500);
  const checkoutIds = [...new Set(gatewayRows.map((row) => row.checkoutGroupId))];
  const allocations = checkoutIds.length ? await db.select({ id: merchantPaymentAllocations.id, checkoutGroupId: merchantPaymentAllocations.checkoutGroupId, orderId: merchantPaymentAllocations.orderId, merchantId: merchantPaymentAllocations.merchantId, merchantName: merchants.name, grossAmount: merchantPaymentAllocations.grossAmount, deliveryAmount: merchantPaymentAllocations.deliveryAmount, platformFee: merchantPaymentAllocations.platformFee, providerFee: merchantPaymentAllocations.providerFee, netAmount: merchantPaymentAllocations.netAmount, settlementStatus: merchantPaymentAllocations.settlementStatus, settlementDueAt: merchantPaymentAllocations.settlementDueAt, settlementReference: merchantPaymentAllocations.settlementReference, settledAt: merchantPaymentAllocations.settledAt }).from(merchantPaymentAllocations).innerJoin(merchants, eq(merchants.id, merchantPaymentAllocations.merchantId)).where(inArray(merchantPaymentAllocations.checkoutGroupId, checkoutIds)) : [];
  const orderRows = await db.select({ id: orders.id, checkoutGroupId: orders.checkoutGroupId, merchantId: orders.merchantId, merchantName: merchants.name, customerName: orders.customerName, customerEmail: orders.customerEmail, paymentMethod: orders.paymentMethod, paymentStatus: orders.paymentStatus, total: orders.total, createdAt: orders.createdAt }).from(orders).innerJoin(merchants, eq(merchants.id, orders.merchantId)).orderBy(desc(orders.createdAt)).limit(500);
  const gatewayCheckoutIds = new Set(gatewayRows.map((row) => row.checkoutGroupId));
  const gatewayTransactions = gatewayRows.map((row) => {
    const relatedOrders = orderRows.filter((order) => order.checkoutGroupId === row.checkoutGroupId);
    return { ...row, recordId: `gateway-${row.id}`, source: "gateway", paymentMethod: row.provider, customerName: relatedOrders[0]?.customerName ?? null, customerEmail: relatedOrders[0]?.customerEmail ?? null, orderReferences: relatedOrders.map((order) => `NC-${String(order.id).padStart(6, "0")}`), allocations: allocations.filter((allocation) => allocation.checkoutGroupId === row.checkoutGroupId) };
  });
  const manualTransactions = orderRows.filter((order) => !order.checkoutGroupId || !gatewayCheckoutIds.has(order.checkoutGroupId)).map((order) => ({ id: null, checkoutGroupId: order.checkoutGroupId, checkoutReference: order.checkoutGroupId ? `Checkout ${order.checkoutGroupId}` : null, provider: order.paymentMethod ?? "manual", providerReference: null, amount: order.total, currency: "NAD", status: order.paymentStatus, failureMessage: null, lastCheckedAt: null, createdAt: order.createdAt, updatedAt: order.createdAt, recordId: `order-${order.id}`, source: "order", paymentMethod: order.paymentMethod ?? "manual", customerName: order.customerName, customerEmail: order.customerEmail, orderReferences: [`NC-${String(order.id).padStart(6, "0")}`], allocations: [{ id: 0, checkoutGroupId: order.checkoutGroupId, orderId: order.id, merchantId: order.merchantId, merchantName: order.merchantName, grossAmount: order.total, deliveryAmount: 0, platformFee: 0, providerFee: 0, netAmount: order.total, settlementStatus: "not_applicable", settlementDueAt: null, settlementReference: null, settledAt: null }] }));
  const transactions = [...gatewayTransactions, ...manualTransactions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const successful = transactions.filter((row) => row.status === "paid");
  const unsettled = transactions.flatMap((row): Array<(typeof gatewayTransactions)[number]["allocations"][number] | (typeof manualTransactions)[number]["allocations"][number]> => row.allocations).filter((allocation) => ["unpaid", "scheduled", "due", "processing"].includes(allocation.settlementStatus));
  const now = Date.now();
  return Response.json({ transactions, summary: { totalRecords: transactions.length, successfulValue: successful.reduce((sum, row) => sum + Number(row.amount), 0), pendingCount: transactions.filter((row) => ["created", "creating", "pending"].includes(row.status)).length, failedCount: transactions.filter((row) => ["failed", "cancelled", "expired"].includes(row.status)).length, unsettledValue: unsettled.reduce((sum, allocation) => sum + Number(allocation.netAmount), 0), dueNowValue: unsettled.filter((item) => item.settlementDueAt && new Date(item.settlementDueAt).getTime() <= now).reduce((sum, item) => sum + Number(item.netAmount), 0), refundRequiredValue: transactions.flatMap((row): Array<(typeof gatewayTransactions)[number]["allocations"][number] | (typeof manualTransactions)[number]["allocations"][number]> => row.allocations).filter((item) => item.settlementStatus === "refund_required").reduce((sum, item) => sum + Number(item.netAmount), 0) } }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (user?.platformRole !== "administrator") return Response.json({ error: "Administrator access required." }, { status: 403 });
  const payload = await request.json() as { allocationId?: number; action?: string; reference?: string };
  if (!Number.isInteger(payload.allocationId) || payload.action !== "mark_settled" || !payload.reference?.trim()) return Response.json({ error: "Allocation, settlement action and bank reference are required." }, { status: 400 });
  const db = getDb();
  const [current] = await db.select().from(merchantPaymentAllocations).where(eq(merchantPaymentAllocations.id, payload.allocationId!)).limit(1);
  if (!current || !["unpaid", "scheduled", "due", "processing"].includes(current.settlementStatus)) return Response.json({ error: "This merchant allocation is not awaiting settlement." }, { status: 409 });
  const settledAt = new Date();
  const [allocation] = await db.update(merchantPaymentAllocations).set({ settlementStatus: "settled", settlementReference: payload.reference.trim().slice(0, 160), settledAt, settledBy: user.userId, updatedAt: settledAt }).where(eq(merchantPaymentAllocations.id, current.id)).returning();
  await db.insert(auditEvents).values({ actorRef: user.userId, action: "merchant_allocation.settled", resourceType: "merchant_payment_allocation", resourceId: String(current.id), metadata: { checkoutGroupId: current.checkoutGroupId, merchantId: current.merchantId, amount: current.netAmount, reference: allocation.settlementReference } });
  return Response.json({ allocation });
}
