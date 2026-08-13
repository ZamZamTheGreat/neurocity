import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchantDeliveryZones } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

const clean = (value: unknown) => String(value ?? "").trim().replace(/\s+/g, " ");

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const zones = await getDb().select().from(merchantDeliveryZones).where(eq(merchantDeliveryZones.merchantId, access.merchantId)).orderBy(asc(merchantDeliveryZones.area));
  return Response.json({ zones }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  try {
    const payload = await request.json() as { area?: string; fee?: number; estimatedTime?: string };
    const area = clean(payload.area), estimatedTime = clean(payload.estimatedTime), fee = Number(payload.fee);
    if (!area) return Response.json({ error: "Enter the suburb or delivery area." }, { status: 400 });
    if (!Number.isFinite(fee) || fee < 0) return Response.json({ error: "Delivery fee must be zero or more." }, { status: 400 });
    if (!estimatedTime) return Response.json({ error: "Enter an estimated delivery time." }, { status: 400 });
    const db = getDb();
    const [zone] = await db.insert(merchantDeliveryZones).values({ merchantId: access.merchantId, area, fee, estimatedTime, active: true }).returning();
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "delivery_zone.created", resourceType: "delivery_zone", resourceId: String(zone.id), metadata: { area, fee, estimatedTime } });
    return Response.json({ zone }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error && error.message.includes("idx_delivery_zones_merchant_area") ? "That delivery area already exists." : error instanceof Error ? error.message : "Delivery area could not be created.";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json() as { id?: number; area?: string; fee?: number; estimatedTime?: string; active?: boolean };
  const area = clean(payload.area), estimatedTime = clean(payload.estimatedTime), fee = Number(payload.fee);
  if (!Number.isInteger(payload.id) || !area || !estimatedTime || !Number.isFinite(fee) || fee < 0) return Response.json({ error: "Complete the area, fee and estimated time." }, { status: 400 });
  try {
    const db = getDb();
    const [zone] = await db.update(merchantDeliveryZones).set({ area, fee, estimatedTime, active: payload.active !== false, updatedAt: new Date() }).where(and(eq(merchantDeliveryZones.id, payload.id!), eq(merchantDeliveryZones.merchantId, access.merchantId))).returning();
    if (!zone) return Response.json({ error: "Delivery area not found." }, { status: 404 });
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "delivery_zone.updated", resourceType: "delivery_zone", resourceId: String(zone.id), metadata: { area, fee, estimatedTime, active: zone.active } });
    return Response.json({ zone });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Delivery area could not be updated." }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const { id } = await request.json() as { id?: number };
  if (!Number.isInteger(id)) return Response.json({ error: "Choose a valid delivery area." }, { status: 400 });
  const [zone] = await getDb().delete(merchantDeliveryZones).where(and(eq(merchantDeliveryZones.id, id!), eq(merchantDeliveryZones.merchantId, access.merchantId))).returning();
  if (!zone) return Response.json({ error: "Delivery area not found." }, { status: 404 });
  return Response.json({ ok: true });
}
