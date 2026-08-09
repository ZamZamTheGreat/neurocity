import { and, eq, inArray } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { auditEvents, orderItems, orders, products } from "../../../db/schema";

const fulfillmentMethods = new Set(["pickup", "merchant_delivery"]);
const paymentMethods = new Set(["online", "pay_on_collection"]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required to place an order." }, { status: 401 });

  try {
    const payload = await request.json() as { productIds?: number[]; fulfillmentMethod?: string; paymentMethod?: string };
    const productIds = [...new Set((payload.productIds ?? []).filter(Number.isInteger))].slice(0, 25);
    if (!productIds.length) return Response.json({ error: "Your basket is empty." }, { status: 400 });
    if (!fulfillmentMethods.has(payload.fulfillmentMethod ?? "")) return Response.json({ error: "Choose a valid fulfillment method." }, { status: 400 });
    if (!paymentMethods.has(payload.paymentMethod ?? "")) return Response.json({ error: "Choose a valid payment method." }, { status: 400 });

    const db = getDb();
    const selected = await db.select().from(products).where(and(eq(products.merchantId, 1), inArray(products.id, productIds)));
    if (selected.length !== productIds.length) return Response.json({ error: "One or more products are unavailable." }, { status: 409 });
    if (selected.some((product) => product.price === null || product.status !== "published")) return Response.json({ error: "Products awaiting merchant confirmation cannot be ordered yet." }, { status: 409 });

    const total = selected.reduce((sum, product) => sum + Number(product.price), 0);
    const [order] = await db.insert(orders).values({
      merchantId: 1,
      customerRef: user.userId,
      status: payload.paymentMethod === "online" ? "awaiting_payment" : "pending_merchant_confirmation",
      paymentMethod: payload.paymentMethod,
      fulfillmentMethod: payload.fulfillmentMethod,
      total,
      createdAt: new Date(),
    }).returning();

    await db.insert(orderItems).values(selected.map((product) => ({ orderId: order.id, productId: product.id, skuSnapshot: product.sku, nameSnapshot: product.name, unitPrice: Number(product.price), quantity: 1 })));
    await db.insert(auditEvents).values({ actorRef: user.userId, action: "order.created", resourceType: "order", resourceId: String(order.id), metadata: JSON.stringify({ paymentMethod: order.paymentMethod, fulfillmentMethod: order.fulfillmentMethod }), createdAt: new Date() });

    return Response.json({ order: { id: order.id, status: order.status, total: order.total, reference: `NC-${String(order.id).padStart(6, "0")}` } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order creation failed" }, { status: 500 });
  }
}
