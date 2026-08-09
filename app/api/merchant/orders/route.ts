import { env } from "cloudflare:workers";
import { desc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderItems, orders } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

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
  return Response.json({ orders: rows.map((order) => ({ ...order, reference: `NC-${String(order.id).padStart(6, "0")}`, items: items.filter((item) => item.orderId === order.id), allowedTransitions: transitions[order.status] ?? [] })) });
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  try {
    const payload = await request.json() as { orderId?: number; status?: string };
    if (!Number.isInteger(payload.orderId) || !payload.status) return Response.json({ error: "Order and target status are required." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(orders).where(eq(orders.id, payload.orderId!)).limit(1);
    if (!current || current.merchantId !== access.merchantId) return Response.json({ error: "Order not found." }, { status: 404 });
    if (!(transitions[current.status] ?? []).includes(payload.status)) return Response.json({ error: `Cannot move an order from ${current.status} to ${payload.status}.` }, { status: 409 });
    await env.DB.batch([
      env.DB.prepare("UPDATE orders SET status = ? WHERE id = ? AND merchant_id = ? AND status = ?").bind(payload.status, current.id, access.merchantId, current.status),
      env.DB.prepare("INSERT INTO audit_events (actor_ref, action, resource_type, resource_id, metadata, created_at) VALUES (?, 'order.status_changed', 'order', ?, ?, unixepoch())").bind(access.user.userId, String(current.id), JSON.stringify({ from: current.status, to: payload.status })),
    ]);
    return Response.json({ order: { ...current, status: payload.status, allowedTransitions: transitions[payload.status] ?? [] } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order update failed" }, { status: 500 });
  }
}
