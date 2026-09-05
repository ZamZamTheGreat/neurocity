import { isPreorderLine } from "../../../../lib/preorders";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchantPaymentAllocations, merchants, orderItems, orders, orderStatusEvents, paymentProofs, variantInventory } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";
import { sendOrderStatusNotification } from "../../../../lib/order-mail";
import { sendWhatsAppOrderUpdate } from "../../../../lib/whatsapp-orders";

const transitions: Record<string, string[]> = {
  pending_merchant_confirmation: ["accepted", "rejected"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "dispatched", "cancelled"],
  ready_for_pickup: ["collected"],
  dispatched: ["delivered", "delivery_failed"],
  delivery_failed: ["dispatched", "cancelled"],
  collected: ["completed"],
  delivered: ["completed"],
};

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const db = getDb();
  const rows = await db.select().from(orders).where(eq(orders.merchantId, access.merchantId)).orderBy(desc(orders.createdAt), desc(orders.id)).limit(100);
  const items = rows.length ? await db.select().from(orderItems).where(inArray(orderItems.orderId, rows.map((order) => order.id))) : [];
  const events = rows.length ? await db.select().from(orderStatusEvents).where(inArray(orderStatusEvents.orderId, rows.map((order) => order.id))).orderBy(desc(orderStatusEvents.createdAt)) : [];
  const proofs = rows.length ? await db.select().from(paymentProofs).where(inArray(paymentProofs.orderId, rows.map((order) => order.id))) : [];
  return Response.json({ orders: rows.map((order) => ({ ...order, reference: `NC-${String(order.id).padStart(6, "0")}`, items: items.filter((item) => item.orderId === order.id), events: events.filter((event) => event.orderId === order.id), paymentProof: proofs.find((proof) => proof.orderId === order.id) ?? null, allowedTransitions: transitions[order.status] ?? [] })) });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  try {
    const payload = await request.json() as { orderId?: number; status?: string; note?: string };
    if (!Number.isInteger(payload.orderId) || !payload.status) return Response.json({ error: "Order and target status are required." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(orders).where(eq(orders.id, payload.orderId!)).limit(1);
    if (!current || current.merchantId !== access.merchantId) return Response.json({ error: "Order not found." }, { status: 404 });
    if (!(transitions[current.status] ?? []).includes(payload.status)) return Response.json({ error: `Cannot move an order from ${current.status} to ${payload.status}.` }, { status: 409 });
    if (["rejected", "cancelled", "delivery_failed"].includes(payload.status) && !payload.note?.trim()) return Response.json({ error: "A reason is required for this order decision." }, { status: 400 });
    if (current.paymentMethod === "eft" && current.paymentStatus !== "paid" && ["preparing", "ready_for_pickup", "dispatched", "collected", "delivered", "completed"].includes(payload.status)) return Response.json({ error: "Verify EFT payment before progressing fulfilment." }, { status: 409 });
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, current.id));
    await db.transaction(async (tx) => {
      await tx.update(orders).set({ status: payload.status!, updatedAt: new Date() }).where(eq(orders.id, current.id));
      if (["rejected", "cancelled"].includes(payload.status!)) {
        await tx.update(merchantPaymentAllocations).set({ settlementStatus: current.paymentStatus === "paid" ? "refund_required" : "cancelled", updatedAt: new Date() }).where(eq(merchantPaymentAllocations.orderId, current.id));
        for (const item of items.filter((row) => row.variantId && !isPreorderLine(row))) {
          const inventory = await tx.select().from(variantInventory).where(eq(variantInventory.variantId, item.variantId!)); let remaining = item.quantity;
          for (const row of inventory) { const released = Math.min(remaining, row.reserved); if (released > 0) await tx.update(variantInventory).set({ reserved: sql`greatest(0, ${variantInventory.reserved} - ${released})`, updatedAt: new Date() }).where(eq(variantInventory.id, row.id)); remaining -= released; if (!remaining) break; }
        }
      }
      if (payload.status === "completed") {
        for (const item of items.filter((row) => row.variantId && !isPreorderLine(row))) {
          const inventory = await tx.select().from(variantInventory).where(eq(variantInventory.variantId, item.variantId!)); let remaining = item.quantity;
          for (const row of inventory) { const fulfilled = Math.min(remaining, row.reserved); if (fulfilled > 0) await tx.update(variantInventory).set({ reserved: sql`greatest(0, ${variantInventory.reserved} - ${fulfilled})`, onHand: sql`greatest(0, ${variantInventory.onHand} - ${fulfilled})`, updatedAt: new Date() }).where(eq(variantInventory.id, row.id)); remaining -= fulfilled; if (!remaining) break; }
        }
      }
      await tx.insert(orderStatusEvents).values({ orderId: current.id, status: payload.status!, actorRef: access.user.userId, note: payload.note?.trim().slice(0, 500) || null });
      await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: "order.status_changed", resourceType: "order", resourceId: String(current.id), metadata: { from: current.status, to: payload.status }, createdAt: new Date() });
    });
    const [merchant] = await db.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, current.merchantId)).limit(1);
    const reference = `NC-${String(current.id).padStart(6, "0")}`;
    const [, whatsappResult] = await Promise.allSettled([
      current.customerEmail ? sendOrderStatusNotification({ reference, storeName: merchant?.name ?? "The store", customerName: current.customerName ?? "Customer", customerEmail: current.customerEmail, status: payload.status, total: current.total, fulfillmentMethod: current.fulfillmentMethod ?? "pickup", note: payload.note }) : Promise.resolve(),
      sendWhatsAppOrderUpdate({ phone: current.customerPhone ?? "", reference, storeName: merchant?.name ?? "The store", status: payload.status, note: payload.note }),
    ]);
    const whatsapp = whatsappResult.status === "fulfilled" ? whatsappResult.value : { delivered: false as const, reason: whatsappResult.reason instanceof Error ? whatsappResult.reason.message : "delivery_failed" };
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: whatsapp.delivered ? "order.whatsapp_sent" : "order.whatsapp_skipped", resourceType: "order", resourceId: String(current.id), metadata: { status: payload.status, reason: "reason" in whatsapp ? whatsapp.reason : null } }).catch((error) => console.error("order notification audit failed", error));
    return Response.json({ order: { ...current, status: payload.status, allowedTransitions: transitions[payload.status] ?? [] }, whatsapp });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order update failed" }, { status: 500 });
  }
}

export async function PUT(request: Request) { const access = await requirePilotMerchant(["owner", "manager"]); if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 }); const payload = await request.json() as { orderId?: number; paymentStatus?: string; note?: string }; if (!Number.isInteger(payload.orderId) || !["paid", "failed"].includes(payload.paymentStatus ?? "")) return Response.json({ error: "Valid order and payment decision required." }, { status: 400 }); const db = getDb(); const [order] = await db.select().from(orders).where(and(eq(orders.id, payload.orderId!), eq(orders.merchantId, access.merchantId))).limit(1); if (!order) return Response.json({ error: "Order not found." }, { status: 404 }); const [proof] = await db.select().from(paymentProofs).where(eq(paymentProofs.orderId, order.id)).limit(1); if (order.paymentMethod === "eft" && !proof) return Response.json({ error: "No payment proof has been submitted." }, { status: 409 }); await db.transaction(async (tx) => { await tx.update(orders).set({ paymentStatus: payload.paymentStatus!, updatedAt: new Date() }).where(eq(orders.id, order.id)); if (proof) await tx.update(paymentProofs).set({ status: payload.paymentStatus === "paid" ? "verified" : "rejected", reviewNote: payload.note?.trim().slice(0, 500) || null, reviewedBy: access.user.userId, reviewedAt: new Date() }).where(eq(paymentProofs.id, proof.id)); await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: `payment.${payload.paymentStatus}`, resourceType: "order", resourceId: String(order.id), metadata: { previousStatus: order.paymentStatus, note: payload.note?.trim() || null } }); }); return Response.json({ ok: true, paymentStatus: payload.paymentStatus }); }
