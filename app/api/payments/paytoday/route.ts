import { getPayTodayAvailability } from "../../../../lib/paytoday";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getDb } from "../../../../db";
import { checkoutGroups, orders, paymentTransactions } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { createPayTodayPayment } from "../../../../lib/paytoday";
import { CUSTOMER_PAYMENT_MINUTES, deadlineFrom, ORDER_WORKFLOW } from "../../../../lib/order-workflows";

export async function GET() {
  const availability = getPayTodayAvailability();
  return Response.json({ provider: "paytoday", available: availability.configured, environment: availability.environment, message: availability.configured ? "PayToday is available." : "PayToday activation is pending." }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required to pay for an order." }, { status: 401 });
  if (!getPayTodayAvailability().configured) return Response.json({ error: "PayToday is not currently available." }, { status: 409 });
  const payload = await request.json().catch(() => null) as { orderId?: number } | null;
  if (!Number.isInteger(payload?.orderId)) return Response.json({ error: "Choose a confirmed order to pay." }, { status: 400 });
  const db = getDb();
  const [selected] = await db.select().from(orders).where(and(eq(orders.id, payload!.orderId!), eq(orders.customerRef, user.userId))).limit(1);
  if (!selected?.checkoutGroupId || selected.workflow !== ORDER_WORKFLOW) return Response.json({ error: "This order does not use merchant-confirmed payment." }, { status: 409 });
  const [checkout] = await db.select().from(checkoutGroups).where(eq(checkoutGroups.id, selected.checkoutGroupId)).limit(1);
  const groupOrders = await db.select().from(orders).where(eq(orders.checkoutGroupId, selected.checkoutGroupId));
  if (!checkout || groupOrders.some((order) => !["accepted", "payment_processing"].includes(order.status) || order.paymentStatus === "paid")) return Response.json({ error: "Every store must confirm the order before payment can begin." }, { status: 409 });
  const paymentDeadline = groupOrders.map((order) => order.paymentExpiresAt).filter((value): value is Date => value instanceof Date).sort((a, b) => a.getTime() - b.getTime())[0] ?? deadlineFrom(new Date(), CUSTOMER_PAYMENT_MINUTES);
  if (paymentDeadline <= new Date()) return Response.json({ error: "The payment window has expired. Reserved stock will be released." }, { status: 409 });
  const prepared = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${checkout.id}, 71)`);
    const [existing] = await tx.select().from(paymentTransactions).where(and(eq(paymentTransactions.checkoutGroupId, checkout.id), eq(paymentTransactions.provider, "paytoday"), inArray(paymentTransactions.status, ["creating", "pending"]))).orderBy(desc(paymentTransactions.createdAt)).limit(1);
    if (existing) return { existing, transaction: null };
    if (groupOrders.some((order) => order.status === "payment_processing")) return { existing: null, transaction: null };
    const transactionKey = randomUUID();
    const [transaction] = await tx.insert(paymentTransactions).values({ checkoutGroupId: checkout.id, provider: "paytoday", amount: checkout.total, status: "creating", expiresAt: paymentDeadline, providerMetadata: { invoiceNumber: checkout.reference, workflow: ORDER_WORKFLOW, orderVersions: groupOrders.map((order) => ({ id: order.id, version: order.orderVersion })), transactionKey } }).returning();
    return { existing: null, transaction };
  });
  if (prepared.existing?.checkoutUrl) return Response.json({ paymentUrl: prepared.existing.checkoutUrl, reference: checkout.reference });
  if (prepared.existing) return Response.json({ error: "PayToday is already preparing this payment. Try again in a moment." }, { status: 409 });
  if (!prepared.transaction) return Response.json({ error: "This payment is being verified. Refresh the order before trying again." }, { status: 409 });
  const transaction = prepared.transaction!;
  try {
    const names = user.displayName.trim().split(/\s+/);
    const publicOrigin = (process.env.PUBLIC_APP_URL ?? new URL(request.url).origin).replace(/\/$/, "");
    const returnUrl = new URL("/api/payments/paytoday/return", publicOrigin); returnUrl.searchParams.set("reference", checkout.reference);
    const result = await createPayTodayPayment({ amount: checkout.total, invoiceNumber: checkout.reference, firstName: names[0] ?? "Customer", lastName: names.slice(1).join(" ") || "NeuroCity", email: selected.customerEmail ?? user.email, phone: selected.customerPhone ?? "", returnUrl: returnUrl.toString() });
    const at = new Date();
    await db.transaction(async (tx) => {
      await tx.update(paymentTransactions).set({ providerPaymentToken: result.paymentToken, providerReference: result.providerReference, checkoutUrl: result.checkoutUrl, status: "pending", updatedAt: at }).where(eq(paymentTransactions.id, transaction.id));
      await tx.update(checkoutGroups).set({ status: "payment_processing", paymentStatus: "pending", updatedAt: at }).where(eq(checkoutGroups.id, checkout.id));
      await tx.update(orders).set({ status: "payment_processing", paymentStatus: "pending", updatedAt: at }).where(and(eq(orders.checkoutGroupId, checkout.id), eq(orders.status, "accepted")));
    });
    return Response.json({ paymentUrl: result.checkoutUrl, reference: checkout.reference });
  } catch (error) {
    const message = error instanceof Error ? error.message : "PayToday payment could not be started.";
    await db.update(paymentTransactions).set({ status: "failed", failureMessage: message, updatedAt: new Date() }).where(eq(paymentTransactions.id, transaction.id));
    return Response.json({ error: message }, { status: 502 });
  }
}
