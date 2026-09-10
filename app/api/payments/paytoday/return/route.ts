import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { checkoutGroups, paymentTransactions } from "../../../../../db/schema";
import { getChatGPTUser } from "../../../../chatgpt-auth";
import { reconcilePayTodayTransaction } from "../../../../../lib/payment-reconciliation";

function resultRedirect(request: Request, result: string, reference?: string) {
  const url = new URL("/payment-return", request.url);
  url.searchParams.set("payment", result);
  if (reference) url.searchParams.set("reference", reference);
  return Response.redirect(url, 303);
}

export async function GET(request: Request) {
  const incoming = new URL(request.url).searchParams;
  const reference = incoming.get("invoice_number") ?? incoming.get("reference");
  if (!reference || reference.length > 80) return resultRedirect(request, "reference_missing");
  const db = getDb();
  const [checkout] = await db.select().from(checkoutGroups).where(eq(checkoutGroups.reference, reference)).limit(1);
  if (!checkout) return resultRedirect(request, "not_found");
  const user = await getChatGPTUser();
  if (user && checkout.customerRef !== user.userId) return resultRedirect(request, "not_found");
  const [transaction] = await db.select().from(paymentTransactions).where(and(eq(paymentTransactions.checkoutGroupId, checkout.id), eq(paymentTransactions.provider, "paytoday"))).orderBy(desc(paymentTransactions.createdAt)).limit(1);
  if (!transaction?.providerPaymentToken) return resultRedirect(request, "not_ready", reference);
  try {
    const result = await reconcilePayTodayTransaction(transaction.id, user?.userId ?? "system:paytoday-return");
    return resultRedirect(request, result.status, result.reference);
  } catch {
    await db.update(paymentTransactions).set({ lastCheckedAt: new Date(), updatedAt: new Date() }).where(eq(paymentTransactions.id, transaction.id));
    return resultRedirect(request, "verification_pending", reference);
  }
}
