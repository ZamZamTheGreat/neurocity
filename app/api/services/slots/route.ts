import { and, eq, gte, inArray, lte } from "drizzle-orm";
import { getDb } from "../../../../db";
import { merchants, products, serviceBookings, storeBranches, storeHours } from "../../../../db/schema";

const pad = (value: number) => String(value).padStart(2, "0");
export async function GET(request: Request) {
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  if (!Number.isInteger(productId)) return Response.json({ error: "Valid service required." }, { status: 400 });
  const db = getDb(); const [service] = await db.select({ product: products, merchant: merchants }).from(products).innerJoin(merchants, eq(merchants.id, products.merchantId)).where(and(eq(products.id, productId), eq(products.itemType, "service"), eq(products.status, "published"), eq(products.availability, "available"), eq(merchants.isPublic, true), inArray(merchants.status, ["active", "pilot"]))).limit(1);
  if (!service) return Response.json({ error: "Service unavailable." }, { status: 404 });
  const [branch] = await db.select().from(storeBranches).where(and(eq(storeBranches.merchantId, service.merchant.id), eq(storeBranches.isPrimary, true))).limit(1);
  if (!branch) return Response.json({ slots: [] });
  const hours = await db.select().from(storeHours).where(eq(storeHours.branchId, branch.id));
  const start = new Date(Date.now() + 30 * 60_000), end = new Date(Date.now() + 30 * 86400_000);
  const existing = await db.select({ scheduledStart: serviceBookings.scheduledStart }).from(serviceBookings).where(and(eq(serviceBookings.merchantId, service.merchant.id), gte(serviceBookings.scheduledStart, start), lte(serviceBookings.scheduledStart, end), inArray(serviceBookings.status, ["confirmed", "in_progress"])));
  const occupied = new Set(existing.flatMap((item) => item.scheduledStart ? [item.scheduledStart.toISOString()] : []));
  const duration = service.product.durationMinutes ?? 60, interval = Math.max(15, Math.min(120, duration)); const slots: { start: string; label: string }[] = [];
  for (let offset = 0; offset < 30 && slots.length < 80; offset++) { const day = new Date(); day.setUTCDate(day.getUTCDate() + offset); const date = `${day.getUTCFullYear()}-${pad(day.getUTCMonth() + 1)}-${pad(day.getUTCDate())}`; const weekday = new Date(`${date}T12:00:00+02:00`).getDay(); const schedule = hours.find((item) => item.dayOfWeek === weekday); if (!schedule || schedule.closed || !schedule.opensAt || !schedule.closesAt) continue; const [openHour, openMinute] = schedule.opensAt.split(":").map(Number), [closeHour, closeMinute] = schedule.closesAt.split(":").map(Number); for (let minute = openHour * 60 + openMinute; minute + duration <= closeHour * 60 + closeMinute; minute += interval) { const local = `${date}T${pad(Math.floor(minute / 60))}:${pad(minute % 60)}:00+02:00`; const slot = new Date(local); if (slot <= start || occupied.has(slot.toISOString())) continue; slots.push({ start: slot.toISOString(), label: slot.toLocaleString("en-NA", { timeZone: "Africa/Windhoek", weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) }); } }
  return Response.json({ slots, durationMinutes: duration, timezone: "Africa/Windhoek" }, { headers: { "cache-control": "no-store" } });
}
