import { desc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchantPaymentAllocations, merchants, orders } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export type MerchantPaymentSettings = { payOnCollectionEnabled: boolean; eftEnabled: boolean; bankName: string; accountHolder: string; accountType: string; accountNumber: string; branchCode: string; referenceInstructions: string };
const defaults: MerchantPaymentSettings = { payOnCollectionEnabled: false, eftEnabled: false, bankName: "", accountHolder: "", accountType: "", accountNumber: "", branchCode: "", referenceInstructions: "" };
const clean = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);
const settingsFor = (value: unknown): MerchantPaymentSettings => ({ ...defaults, ...((value && typeof value === "object") ? value : {}) });

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const db = getDb();
  const [merchant] = await db.select({ paymentSettings: merchants.paymentSettings }).from(merchants).where(eq(merchants.id, access.merchantId)).limit(1);
  const settlements = await db.select({ id: merchantPaymentAllocations.id, orderId: merchantPaymentAllocations.orderId, grossAmount: merchantPaymentAllocations.grossAmount, platformFee: merchantPaymentAllocations.platformFee, providerFee: merchantPaymentAllocations.providerFee, netAmount: merchantPaymentAllocations.netAmount, status: merchantPaymentAllocations.settlementStatus, dueAt: merchantPaymentAllocations.settlementDueAt, settledAt: merchantPaymentAllocations.settledAt, reference: merchantPaymentAllocations.settlementReference, orderCreatedAt: orders.createdAt }).from(merchantPaymentAllocations).innerJoin(orders, eq(orders.id, merchantPaymentAllocations.orderId)).where(eq(merchantPaymentAllocations.merchantId, access.merchantId)).orderBy(desc(merchantPaymentAllocations.createdAt)).limit(100);
  const now = Date.now();
  const amount = (statuses: string[], predicate?: (item: typeof settlements[number]) => boolean) => settlements.filter((item) => statuses.includes(item.status) && (!predicate || predicate(item))).reduce((sum, item) => sum + Number(item.netAmount), 0);
  return Response.json({ settings: settingsFor(merchant?.paymentSettings), settlements: settlements.map((item) => ({ ...item, effectiveStatus: item.status === "scheduled" && item.dueAt && new Date(item.dueAt).getTime() <= now ? "due" : item.status })), summary: { pendingCustomerPayment: amount(["pending_payment"]), scheduled: amount(["scheduled"], (item) => !item.dueAt || new Date(item.dueAt).getTime() > now), dueNow: amount(["unpaid", "due", "scheduled"], (item) => item.status === "unpaid" || !item.dueAt || new Date(item.dueAt).getTime() <= now), processing: amount(["processing"]), awaitingSettlement: amount(["unpaid", "scheduled", "due", "processing"]), settled: amount(["settled"]), refundAdjustment: amount(["refund_required"]), grossSales: settlements.filter((item) => item.status !== "cancelled").reduce((sum, item) => sum + Number(item.grossAmount), 0) } }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json() as Partial<MerchantPaymentSettings>;
  const settings: MerchantPaymentSettings = { payOnCollectionEnabled: false, eftEnabled: false, bankName: clean(payload.bankName), accountHolder: clean(payload.accountHolder), accountType: clean(payload.accountType), accountNumber: clean(payload.accountNumber, 80), branchCode: clean(payload.branchCode, 40), referenceInstructions: "" };
  if (![settings.bankName, settings.accountHolder, settings.accountType, settings.accountNumber, settings.branchCode].every(Boolean)) return Response.json({ error: "Complete all settlement bank details." }, { status: 400 });
  const db = getDb();
  const [merchant] = await db.update(merchants).set({ paymentSettings: settings }).where(eq(merchants.id, access.merchantId)).returning({ id: merchants.id });
  if (!merchant) return Response.json({ error: "Merchant not found." }, { status: 404 });
  await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "merchant.settlement_account_updated", resourceType: "merchant", resourceId: String(access.merchantId), metadata: { bankName: settings.bankName, accountType: settings.accountType } });
  return Response.json({ settings });
}
