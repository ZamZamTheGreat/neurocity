import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchants } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export type MerchantPaymentSettings = { payOnCollectionEnabled: boolean; eftEnabled: boolean; bankName: string; accountHolder: string; accountType: string; accountNumber: string; branchCode: string; referenceInstructions: string };
const defaults: MerchantPaymentSettings = { payOnCollectionEnabled: true, eftEnabled: false, bankName: "", accountHolder: "", accountType: "", accountNumber: "", branchCode: "", referenceInstructions: "Use your NeuroCity order reference as the payment reference." };
const clean = (value: unknown, max = 180) => String(value ?? "").trim().slice(0, max);
const settingsFor = (value: unknown): MerchantPaymentSettings => ({ ...defaults, ...((value && typeof value === "object") ? value : {}) });

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const [merchant] = await getDb().select({ paymentSettings: merchants.paymentSettings }).from(merchants).where(eq(merchants.id, access.merchantId)).limit(1);
  return Response.json({ settings: settingsFor(merchant?.paymentSettings) }, { headers: { "cache-control": "no-store" } });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json() as Partial<MerchantPaymentSettings>;
  const settings: MerchantPaymentSettings = { payOnCollectionEnabled: payload.payOnCollectionEnabled !== false, eftEnabled: payload.eftEnabled === true, bankName: clean(payload.bankName), accountHolder: clean(payload.accountHolder), accountType: clean(payload.accountType), accountNumber: clean(payload.accountNumber, 80), branchCode: clean(payload.branchCode, 40), referenceInstructions: clean(payload.referenceInstructions, 500) };
  if (!settings.payOnCollectionEnabled && !settings.eftEnabled) return Response.json({ error: "Enable at least one payment method." }, { status: 400 });
  if (settings.eftEnabled && (!settings.bankName || !settings.accountHolder || !settings.accountType || !settings.accountNumber || !settings.branchCode)) return Response.json({ error: "Complete all banking fields before enabling EFT." }, { status: 400 });
  const db = getDb();
  const [merchant] = await db.update(merchants).set({ paymentSettings: settings }).where(eq(merchants.id, access.merchantId)).returning({ id: merchants.id });
  if (!merchant) return Response.json({ error: "Merchant not found." }, { status: 404 });
  await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "merchant.payment_settings_updated", resourceType: "merchant", resourceId: String(access.merchantId), metadata: { payOnCollectionEnabled: settings.payOnCollectionEnabled, eftEnabled: settings.eftEnabled } });
  return Response.json({ settings });
}
