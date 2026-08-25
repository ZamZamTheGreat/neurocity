import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { auditEvents, merchants, products, serviceBookings } from "../../../db/schema";
import { sendBookingCancelledToMerchant, sendBookingRequestedNotifications } from "../../../lib/booking-mail";
import { getChatGPTUser } from "../../chatgpt-auth";

const customerCancellable = new Set(["requested", "confirmed", "reschedule_proposed"]);
export async function GET() {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const rows = await getDb().select({ id: serviceBookings.id, status: serviceBookings.status, requestedStart: serviceBookings.requestedStart, scheduledStart: serviceBookings.scheduledStart, durationMinutes: serviceBookings.durationMinutes, serviceMode: serviceBookings.serviceMode, priceSnapshot: serviceBookings.priceSnapshot, pricingModel: serviceBookings.pricingModel, customerNotes: serviceBookings.customerNotes, merchantNote: serviceBookings.merchantNote, createdAt: serviceBookings.createdAt, serviceName: products.name, storeName: merchants.name, storeSlug: merchants.slug }).from(serviceBookings).innerJoin(products, eq(products.id, serviceBookings.productId)).innerJoin(merchants, eq(merchants.id, serviceBookings.merchantId)).where(eq(serviceBookings.customerId, Number(user.userId))).orderBy(desc(serviceBookings.createdAt));
  return Response.json({ bookings: rows.map((row) => ({ ...row, reference: `NCB-${String(row.id).padStart(6, "0")}` })) }, { headers: { "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const payload = await request.json() as { productId?: number; requestedStart?: string; serviceMode?: string; notes?: string };
  if (!Number.isInteger(payload.productId) || !payload.requestedStart) return Response.json({ error: "Choose a service and preferred appointment time." }, { status: 400 });
  const requestedStart = new Date(payload.requestedStart); const now = Date.now();
  if (Number.isNaN(requestedStart.getTime()) || requestedStart.getTime() < now + 30 * 60_000 || requestedStart.getTime() > now + 180 * 86400_000) return Response.json({ error: "Choose a time between 30 minutes and 180 days from now." }, { status: 400 });
  const db = getDb(); const [service] = await db.select({ product: products, merchant: merchants }).from(products).innerJoin(merchants, eq(merchants.id, products.merchantId)).where(and(eq(products.id, payload.productId!), eq(products.itemType, "service"), eq(products.status, "published"), eq(products.availability, "available"), eq(merchants.isPublic, true), inArray(merchants.status, ["active", "pilot"]))).limit(1);
  if (!service) return Response.json({ error: "This service is not currently available." }, { status: 404 });
  const allowedModes = service.product.serviceMode ? [service.product.serviceMode] : ["at_business"];
  if (payload.serviceMode && !allowedModes.includes(payload.serviceMode)) return Response.json({ error: "Choose an available service location." }, { status: 400 });
  const notes = payload.notes?.trim().slice(0, 1500) || null;
  const [booking] = await db.transaction(async (tx) => { const [created] = await tx.insert(serviceBookings).values({ merchantId: service.merchant.id, productId: service.product.id, customerId: Number(user.userId), requestedStart, durationMinutes: service.product.durationMinutes, serviceMode: payload.serviceMode || service.product.serviceMode || "at_business", priceSnapshot: service.product.salePrice ?? service.product.price, pricingModel: service.product.pricingModel, customerNotes: notes }).returning(); await tx.insert(auditEvents).values({ actorRef: user.userId, action: "service_booking.requested", resourceType: "service_booking", resourceId: String(created.id), metadata: { merchantId: service.merchant.id, productId: service.product.id } }); return [created]; });
  await sendBookingRequestedNotifications({ reference: `NCB-${String(booking.id).padStart(6, "0")}`, serviceName: service.product.name, storeName: service.merchant.name, customerName: user.displayName, customerEmail: user.email, merchantEmail: service.merchant.contactEmail, status: booking.status, requestedStart: booking.requestedStart, durationMinutes: booking.durationMinutes, serviceMode: booking.serviceMode, price: booking.priceSnapshot, pricingModel: booking.pricingModel, note: booking.customerNotes }).catch((error) => console.error("booking request email failed", error));
  return Response.json({ booking: { ...booking, reference: `NCB-${String(booking.id).padStart(6, "0")}` } }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser(); if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const { id, action } = await request.json() as { id?: number; action?: string };
  if (!Number.isInteger(id) || action !== "cancel") return Response.json({ error: "Valid booking cancellation required." }, { status: 400 });
  const db = getDb(); const [current] = await db.select().from(serviceBookings).where(and(eq(serviceBookings.id, id!), eq(serviceBookings.customerId, Number(user.userId)))).limit(1);
  if (!current) return Response.json({ error: "Booking not found." }, { status: 404 });
  if (!customerCancellable.has(current.status)) return Response.json({ error: "This booking can no longer be cancelled online." }, { status: 409 });
  await db.transaction(async (tx) => { await tx.update(serviceBookings).set({ status: "cancelled", updatedAt: new Date() }).where(and(eq(serviceBookings.id, current.id), eq(serviceBookings.status, current.status))); await tx.insert(auditEvents).values({ actorRef: user.userId, action: "service_booking.cancelled", resourceType: "service_booking", resourceId: String(current.id) }); });
  const [detail] = await db.select({ serviceName: products.name, storeName: merchants.name, merchantEmail: merchants.contactEmail }).from(products).innerJoin(merchants, eq(merchants.id, products.merchantId)).where(eq(products.id, current.productId)).limit(1);
  if (detail) await sendBookingCancelledToMerchant({ reference: `NCB-${String(current.id).padStart(6, "0")}`, serviceName: detail.serviceName, storeName: detail.storeName, customerName: user.displayName, customerEmail: user.email, merchantEmail: detail.merchantEmail, status: "cancelled", requestedStart: current.requestedStart, scheduledStart: current.scheduledStart, durationMinutes: current.durationMinutes, serviceMode: current.serviceMode, price: current.priceSnapshot, pricingModel: current.pricingModel }).catch((error) => console.error("booking cancellation email failed", error));
  return Response.json({ ok: true });
}
