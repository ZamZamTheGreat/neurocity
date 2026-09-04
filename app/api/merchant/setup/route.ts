import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchants, storeBranches, storeHours } from "../../../../db/schema";
import { isMerchantCategory } from "../../../../lib/merchant-categories";
import { requirePilotMerchant } from "../auth";

type Hours = { dayOfWeek: number; opensAt: string | null; closesAt: string | null; closed: boolean }[];
type SetupPayload = {
  name?: string; category?: string; contactName?: string; contactEmail?: string; contactPhone?: string; website?: string;
  pickupLocation?: string; deliveryMode?: string; tagline?: string; description?: string; logoUrl?: string; bannerUrl?: string;
  isPublic?: boolean; returnsPolicy?: string; shippingPolicy?: string; privacyPolicy?: string; pickupEnabled?: boolean;
  deliveryEnabled?: boolean; branchName?: string; branchAddress?: string; branchPhone?: string; hours?: Hours;
};

function readiness(merchant: typeof merchants.$inferSelect, branch?: typeof storeBranches.$inferSelect, hours: Hours = []) {
  const checks = [
    ["identity", Boolean(merchant.name && merchant.category && merchant.tagline && merchant.description)],
    ["contact", Boolean(merchant.contactName && merchant.contactEmail && merchant.contactPhone)],
    ["branding", Boolean(merchant.logoUrl && merchant.bannerUrl)],
    ["location", Boolean(branch?.address)],
    ["fulfilment", Boolean(branch?.pickupEnabled || branch?.deliveryEnabled)],
    ["hours", hours.length === 7],
    ["policies", Boolean((merchant.policies as Record<string, string> | null)?.returns)],
  ] as const;
  const complete = checks.filter(([, done]) => done).length;
  return { percent: Math.round(complete / checks.length * 100), checks: checks.map(([key, done]) => ({ key, done })) };
}

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant access required." }, { status: 403 });
  const db = getDb();
  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, access.merchantId)).limit(1);
  const [branch] = await db.select().from(storeBranches).where(and(eq(storeBranches.merchantId, access.merchantId), eq(storeBranches.isPrimary, true))).limit(1);
  const hours = branch ? await db.select().from(storeHours).where(eq(storeHours.branchId, branch.id)) : [];
  return Response.json({ merchant, branch: branch ?? null, hours, readiness: readiness(merchant, branch, hours), role: access.membership.role });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json() as SetupPayload;
  const db = getDb();
  const [currentMerchant] = await db.select().from(merchants).where(eq(merchants.id, access.merchantId)).limit(1);
  if (!currentMerchant) return Response.json({ error: "Merchant account not found." }, { status: 404 });
  const name = payload.name?.trim(), email = payload.contactEmail?.trim(), category = payload.category?.trim();
  const branchAddress = payload.branchAddress?.trim() || payload.pickupLocation?.trim();
  if (!name || !email?.includes("@") || !category || !isMerchantCategory(category) || !branchAddress) return Response.json({ error: "Business name, valid category, contact email and primary branch address are required." }, { status: 400 });
  const logoUrl = payload.logoUrl?.trim(), bannerUrl = payload.bannerUrl?.trim();
  if ([logoUrl, bannerUrl].some((value) => value?.startsWith("r2://") && !value.startsWith(`r2://merchants/${access.merchantId}/`))) return Response.json({ error: "Invalid merchant image." }, { status: 400 });
  const submittedHours = Array.isArray(payload.hours) ? payload.hours.filter((item) => Number.isInteger(item.dayOfWeek) && item.dayOfWeek >= 0 && item.dayOfWeek <= 6).map((item) => ({ dayOfWeek: item.dayOfWeek, opensAt: item.closed ? null : item.opensAt || null, closesAt: item.closed ? null : item.closesAt || null, closed: item.closed === true })) : [];
  const hours = [...new Map(submittedHours.map((item) => [item.dayOfWeek, item])).values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  const fulfillmentMethods = [payload.pickupEnabled ? "pickup" : null, payload.deliveryEnabled ? "merchant_delivery" : null].filter((value): value is string => Boolean(value));
  const invalidOpenHours = hours.some((item) => !item.closed && (!item.opensAt || !item.closesAt));
  if (payload.isPublic && (!payload.tagline?.trim() || !payload.description?.trim() || !logoUrl || !bannerUrl || !payload.contactPhone?.trim() || hours.length !== 7 || invalidOpenHours || !payload.returnsPolicy?.trim() || fulfillmentMethods.length === 0)) return Response.json({ error: "Complete branding, contact details, fulfilment, all seven opening-hour entries and the returns policy before publishing." }, { status: 409 });
  const publishing = payload.isPublic === true;
  const values = { name, category, primaryCategory: category, contactName: payload.contactName?.trim() || null, contactEmail: email, contactPhone: payload.contactPhone?.trim() || null, website: payload.website?.trim() || null, pickupLocation: branchAddress, deliveryMode: payload.deliveryMode === "platform_managed" ? "platform_managed" : "merchant_managed", tagline: payload.tagline?.trim() || null, description: payload.description?.trim() || null, logoUrl: logoUrl || null, bannerUrl: bannerUrl || null, policies: { returns: payload.returnsPolicy?.trim() || "", shipping: payload.shippingPolicy?.trim() || "", privacy: payload.privacyPolicy?.trim() || "" }, contactOptions: { phone: payload.contactPhone?.trim() || "", email, website: payload.website?.trim() || "" }, fulfillmentMethods, isPublic: publishing, status: publishing && currentMerchant.status === "onboarding" ? "active" : currentMerchant.status, setupStep: 3 };
  const result = await db.transaction(async (tx) => {
    const [merchant] = await tx.update(merchants).set(values).where(eq(merchants.id, access.merchantId)).returning();
    let [branch] = await tx.select().from(storeBranches).where(and(eq(storeBranches.merchantId, access.merchantId), eq(storeBranches.isPrimary, true))).limit(1);
    const branchValues = { name: payload.branchName?.trim() || "Primary branch", address: branchAddress, city: "Windhoek", phone: payload.branchPhone?.trim() || payload.contactPhone?.trim() || null, pickupEnabled: payload.pickupEnabled === true, deliveryEnabled: payload.deliveryEnabled === true, isPrimary: true };
    if (branch) [branch] = await tx.update(storeBranches).set(branchValues).where(eq(storeBranches.id, branch.id)).returning();
    else [branch] = await tx.insert(storeBranches).values({ merchantId: access.merchantId, ...branchValues }).returning();
    for (const item of hours) await tx.insert(storeHours).values({ branchId: branch.id, ...item }).onConflictDoUpdate({ target: [storeHours.branchId, storeHours.dayOfWeek], set: { opensAt: item.opensAt, closesAt: item.closesAt, closed: item.closed } });
    await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: publishing ? "merchant.storefront_published" : "merchant.setup_updated", resourceType: "merchant", resourceId: String(access.merchantId), metadata: { isPublic: values.isPublic, category, setupStep: values.setupStep, previousStatus: currentMerchant.status, status: values.status }, createdAt: new Date() });
    return { merchant, branch };
  });
  return Response.json({ ...result, hours, readiness: readiness(result.merchant, result.branch, hours) });
}
