import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditEvents, checkoutGroups, orders, paymentTransactions } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { lookupPayTodayPayment, normalizePayTodayStatus } from "../../../../../lib/paytoday";
import { cancelCheckoutAllocationsAndReleaseStock, makeCheckoutAllocationsPayable } from "../../../../../lib/settlements";

function accountRedirect(request: Request, result: string) {
  const url = new URL("/account", request.url);
  url.searchParams.set("tab", "Orders");
  url.searchParams.set("payment", result);
  return Response.redirect(url, 303);
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return accountRedirect(request, "signin_required");
  const incoming = new URL(request.url).searchParams;
  const reference = incoming.get("invoice_number") ?? incoming.get("reference");
  if (!reference) return accountRedirect(request, "reference_missing");

  const db = getDb();
  const [checkout] = await db.select().from(checkoutGroups).where(and(eq(checkoutGroups.reference, reference), eq(checkoutGroups.customerRef, user.userId))).limit(1);
  if (!checkout) return accountRedirect(request, "not_found");
  const [transaction] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.checkoutGroupId, checkout.id), eq(paymentTransactions.provider, "paytoday"))).orderBy(desc(paymentTransactions.createdAt)).limit(1);
  if (!transaction?.providerPaymentToken) return accountRedirect(request, "not_ready");

  try {
    const provider = await lookupPayTodayPayment(transaction.providerPaymentToken);
    const providerStatus = provider.intent?.transaction_status ?? provider.status;
    const status = normalizePayTodayStatus(providerStatus);
    await db.transaction(async (tx) => {
      await tx.update(paymentTransactions).set({ status, lastCheckedAt: new Date(), providerMetadata: { status: providerStatus ?? null, reference: provider.intent?.reference ?? provider.reference ?? null }, updatedAt: new Date() }).where(eq(paymentTransactions.id, transaction.id));
      const checkoutStatus = status === "paid" ? "paid" : status === "failed" ? "payment_failed" : status;
      await tx.update(checkoutGroups).set({ paymentStatus: status, status: checkoutStatus, updatedAt: new Date() }).where(eq(checkoutGroups.id, checkout.id));
      if (["paid", "failed", "cancelled", "expired"].includes(status)) await tx.update(orders).set({ paymentStatus: status, status: status === "paid" ? "pending_merchant_confirmation" : checkoutStatus, updatedAt: new Date() }).where(eq(orders.checkoutGroupId, checkout.id));
      if (status === "paid" && checkout.paymentStatus !== "paid") await makeCheckoutAllocationsPayable(tx, checkout.id, new Date());
      if (["failed", "cancelled", "expired"].includes(status) && !["failed", "cancelled", "expired"].includes(checkout.paymentStatus)) await cancelCheckoutAllocationsAndReleaseStock(tx, checkout.id, Number(user.userId), new Date());
      await tx.insert(auditEvents).values({ actorRef: user.userId, action: `payment.paytoday.${status}`, resourceType: "checkout_group", resourceId: String(checkout.id), metadata: { reference: checkout.reference, transactionId: transaction.id } });
    });
    return accountRedirect(request, status);
  } catch {
    await db.update(paymentTransactions).set({ lastCheckedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, transaction.id));
    return accountRedirect(request, "verification_pending");
  }
}
