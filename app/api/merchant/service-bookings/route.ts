import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchants, products, serviceBookings, users } from "../../../../db/schema";
import { sendBookingStatusNotification } from "../../../../lib/booking-mail";
import { requirePilotMerchant } from "../auth";

const transitions: Record<string, string[]> = { requested: ["confirmed", "declined", "reschedule_proposed"], reschedule_proposed: ["confirmed", "declined"], confirmed: ["in_progress", "cancelled", "reschedule_proposed"], in_progress: ["completed", "cancelled"], completed: [], declined: [], cancelled: [] };
export async function GET() {
  const access = await requirePilotMerchant(); if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const rows = await getDb().select({ id: serviceBookings.id, status: serviceBookings.status, requestedStart: serviceBookings.requestedStart, scheduledStart: serviceBookings.scheduledStart, durationMinutes: serviceBookings.durationMinutes, serviceMode: serviceBookings.serviceMode, priceSnapshot: serviceBookings.priceSnapshot, pricingModel: serviceBookings.pricingModel, customerNotes: serviceBookings.customerNotes, merchantNote: serviceBookings.merchantNote, createdAt: serviceBookings.createdAt, serviceName: products.name, customerName: users.displayName, customerEmail: users.email }).from(serviceBookings).innerJoin(products, eq(products.id, serviceBookings.productId)).innerJoin(users, eq(users.id, serviceBookings.customerId)).where(eq(serviceBookings.merchantId, access.merchantId)).orderBy(asc(serviceBookings.requestedStart));
  return Response.json({ bookings: rows.map((row) => ({ ...row, reference: `NCB-${String(row.id).padStart(6, "0")}`, allowedTransitions: transitions[row.status] ?? [] })) }, { headers: { "cache-control": "no-store" } });
}
export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]); if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json() as { id?: number; status?: string; scheduledStart?: string; note?: string };
  if (!Number.isInteger(payload.id) || !payload.status) return Response.json({ error: "Valid booking and status required." }, { status: 400 });
  const db = getDb(); const [current] = await db.select().from(serviceBookings).where(and(eq(serviceBookings.id, payload.id!), eq(serviceBookings.merchantId, access.merchantId))).limit(1);
  if (!current) return Response.json({ error: "Booking not found." }, { status: 404 });
  if (!(transitions[current.status] ?? []).includes(payload.status)) return Response.json({ error: `Cannot move this booking from ${current.status} to ${payload.status}.` }, { status: 409 });
  const scheduledStart = payload.scheduledStart ? new Date(payload.scheduledStart) : payload.status === "confirmed" ? current.requestedStart : current.scheduledStart;
  if (["confirmed", "reschedule_proposed"].includes(payload.status) && (!scheduledStart || Number.isNaN(scheduledStart.getTime()) || scheduledStart.getTime() < Date.now())) return Response.json({ error: "Choose a future appointment time." }, { status: 400 });
  if (payload.status === "confirmed" && scheduledStart) { const [conflict] = await db.select({ id: serviceBookings.id }).from(serviceBookings).where(and(eq(serviceBookings.merchantId, access.merchantId), eq(serviceBookings.scheduledStart, scheduledStart), inArray(serviceBookings.status, ["confirmed", "in_progress"]), ne(serviceBookings.id, current.id))).limit(1); if (conflict) return Response.json({ error: "That appointment time has already been confirmed for another customer." }, { status: 409 }); }
  const [updated] = await db.transaction(async (tx) => { const [row] = await tx.update(serviceBookings).set({ status: payload.status!, scheduledStart, merchantNote: payload.note?.trim().slice(0, 1000) || null, updatedAt: new Date() }).where(and(eq(serviceBookings.id, current.id), eq(serviceBookings.status, current.status))).returning(); await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: `service_booking.${payload.status}`, resourceType: "service_booking", resourceId: String(current.id), metadata: { previousStatus: current.status, scheduledStart: scheduledStart?.toISOString() ?? null } }); return [row]; });
  const [notice] = await db.select({ serviceName: products.name, storeName: merchants.name, customerName: users.displayName, customerEmail: users.email }).from(products).innerJoin(merchants, eq(merchants.id, products.merchantId)).innerJoin(users, eq(users.id, current.customerId)).where(eq(products.id, current.productId)).limit(1);
  if (notice) await sendBookingStatusNotification({ reference: `NCB-${String(current.id).padStart(6, "0")}`, ...notice, status: updated.status, requestedStart: updated.requestedStart, scheduledStart: updated.scheduledStart, durationMinutes: updated.durationMinutes, serviceMode: updated.serviceMode, price: updated.priceSnapshot, pricingModel: updated.pricingModel, note: updated.merchantNote }).catch((error) => console.error("booking status email failed", error));
  return Response.json({ booking: updated });
}
