import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, orderIssues, orders } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

const categories = new Set(["payment", "order_change", "delivery", "product", "refund", "other"]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const payload = await request.json() as { orderId?: number; category?: string; description?: string };
  const description = payload.description?.trim().slice(0, 1500), category = payload.category?.trim() ?? "";
  if (!Number.isInteger(payload.orderId) || !categories.has(category) || !description) return Response.json({ error: "Choose an issue type and describe what happened." }, { status: 400 });
  const db = getDb();
  const [order] = await db.select().from(orders).where(and(eq(orders.id, payload.orderId!), eq(orders.customerRef, user.userId))).limit(1);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  const [existing] = await db.select().from(orderIssues).where(and(eq(orderIssues.orderId, order.id), eq(orderIssues.status, "open"))).limit(1);
  if (existing) return Response.json({ error: "This order already has an open issue." }, { status: 409 });
  const [issue] = await db.insert(orderIssues).values({ orderId: order.id, customerRef: user.userId, category, description }).returning();
  await db.insert(auditEvents).values({ actorRef: user.userId, action: "order.issue_opened", resourceType: "order", resourceId: String(order.id), metadata: { issueId: issue.id, category } });
  return Response.json({ issue }, { status: 201 });
}
