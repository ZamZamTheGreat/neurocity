import { and, eq, inArray, sql } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { auditEvents, customerAddresses, customerCartItems, merchants, orderItems, orders, orderStatusEvents, productVariants, products, variantInventory } from "../../../db/schema";

const fulfillmentMethods = new Set(["pickup", "merchant_delivery"]);
const paymentMethods = new Set(["pay_on_collection", "eft"]);

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required to place an order." }, { status: 401 });
  try {
    const payload = await request.json() as { merchantId?: number; addressId?: number | null; fulfillmentMethod?: string; paymentMethod?: string; customerNotes?: string };
    const merchantId = Number(payload.merchantId);
    const userId = Number(user.userId);
    if (!Number.isInteger(merchantId)) return Response.json({ error: "Choose a valid store order." }, { status: 400 });
    if (!fulfillmentMethods.has(payload.fulfillmentMethod ?? "")) return Response.json({ error: "Choose pickup or merchant delivery." }, { status: 400 });
    if (!paymentMethods.has(payload.paymentMethod ?? "")) return Response.json({ error: "Choose a valid payment method." }, { status: 400 });
    const db = getDb();
    const [merchant] = await db.select().from(merchants).where(and(eq(merchants.id, merchantId), eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "onboarding", "active"]))).limit(1);
    if (!merchant) return Response.json({ error: "This store is not currently available." }, { status: 409 });
    if (!Array.isArray(merchant.fulfillmentMethods) || !merchant.fulfillmentMethods.includes(payload.fulfillmentMethod!)) return Response.json({ error: "This fulfilment option is not offered by the store." }, { status: 409 });

    const cart = await db.select({ cartId: customerCartItems.id, quantity: customerCartItems.quantity, variantId: productVariants.id, variantSku: productVariants.sku, variantTitle: productVariants.title, size: productVariants.size, color: productVariants.color, variantPrice: productVariants.price, salePrice: productVariants.salePrice, variantStatus: productVariants.status, productId: products.id, productName: products.name, productStatus: products.status, merchantId: products.merchantId }).from(customerCartItems).innerJoin(productVariants, eq(productVariants.id, customerCartItems.variantId)).innerJoin(products, eq(products.id, productVariants.productId)).where(and(eq(customerCartItems.userId, userId), eq(products.merchantId, merchantId)));
    if (!cart.length) return Response.json({ error: `Your bag has no items from ${merchant.name}.` }, { status: 400 });
    if (cart.some((item) => item.productStatus !== "published" || item.variantStatus !== "active" || item.quantity < 1)) return Response.json({ error: "One or more bag items are no longer available." }, { status: 409 });

    let address: typeof customerAddresses.$inferSelect | null = null;
    if (payload.fulfillmentMethod === "merchant_delivery") {
      if (!Number.isInteger(payload.addressId)) return Response.json({ error: "Choose a delivery address." }, { status: 400 });
      [address] = await db.select().from(customerAddresses).where(and(eq(customerAddresses.id, payload.addressId!), eq(customerAddresses.userId, userId))).limit(1);
      if (!address) return Response.json({ error: "Delivery address not found." }, { status: 404 });
    } else if (Number.isInteger(payload.addressId)) {
      [address] = await db.select().from(customerAddresses).where(and(eq(customerAddresses.id, payload.addressId!), eq(customerAddresses.userId, userId))).limit(1);
    }

    const inventoryRows = await db.select().from(variantInventory).where(inArray(variantInventory.variantId, cart.map((item) => item.variantId)));
    for (const item of cart) {
      const rows = inventoryRows.filter((inventory) => inventory.variantId === item.variantId);
      const available = rows.reduce((sum, inventory) => sum + Math.max(0, inventory.onHand - inventory.reserved - inventory.safetyStock), 0);
      if (rows.length && available < item.quantity) return Response.json({ error: `${item.productName} no longer has enough stock for this quantity.` }, { status: 409 });
    }

    const subtotal = cart.reduce((sum, item) => sum + Number(item.salePrice ?? item.variantPrice) * item.quantity, 0);
    const deliveryFee = 0;
    const notes = payload.customerNotes?.trim().slice(0, 1000) || null;
    const order = await db.transaction(async (tx) => {
      const [created] = await tx.insert(orders).values({ merchantId, customerRef: user.userId, customerName: address?.recipientName ?? user.displayName, customerEmail: user.email, customerPhone: address?.phone ?? null, status: "pending_merchant_confirmation", paymentStatus: "pending", paymentMethod: payload.paymentMethod, fulfillmentMethod: payload.fulfillmentMethod, addressSnapshot: address ? { label: address.label, recipientName: address.recipientName, phone: address.phone, addressLine1: address.addressLine1, addressLine2: address.addressLine2, suburb: address.suburb, city: address.city, deliveryNotes: address.deliveryNotes } : null, customerNotes: notes, subtotal, deliveryFee, total: subtotal + deliveryFee, createdAt: new Date(), updatedAt: new Date() }).returning();
      await tx.insert(orderItems).values(cart.map((item) => ({ orderId: created.id, productId: item.productId, variantId: item.variantId, skuSnapshot: item.variantSku, nameSnapshot: item.productName, variantSnapshot: item.variantTitle, sizeSnapshot: item.size, colorSnapshot: item.color, unitPrice: Number(item.salePrice ?? item.variantPrice), quantity: item.quantity, lineTotal: Number(item.salePrice ?? item.variantPrice) * item.quantity })));
      for (const item of cart) {
        const rows = inventoryRows.filter((inventory) => inventory.variantId === item.variantId);
        let remaining = item.quantity;
        for (const inventory of rows) {
          const allocation = Math.min(remaining, Math.max(0, inventory.onHand - inventory.reserved - inventory.safetyStock));
          if (allocation > 0) await tx.update(variantInventory).set({ reserved: sql`${variantInventory.reserved} + ${allocation}`, updatedAt: new Date() }).where(eq(variantInventory.id, inventory.id));
          remaining -= allocation;
          if (remaining === 0) break;
        }
      }
      await tx.insert(orderStatusEvents).values({ orderId: created.id, status: created.status, actorRef: user.userId, note: "Order placed by customer" });
      await tx.delete(customerCartItems).where(and(eq(customerCartItems.userId, userId), inArray(customerCartItems.id, cart.map((item) => item.cartId))));
      await tx.insert(auditEvents).values({ actorRef: user.userId, action: "order.created", resourceType: "order", resourceId: String(created.id), metadata: { merchantId, paymentMethod: created.paymentMethod, fulfillmentMethod: created.fulfillmentMethod, itemCount: cart.length, subtotal }, createdAt: new Date() });
      return created;
    });
    return Response.json({ order: { id: order.id, status: order.status, paymentStatus: order.paymentStatus, total: order.total, reference: `NC-${String(order.id).padStart(6, "0")}` } }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Order creation failed." }, { status: 500 });
  }
}
