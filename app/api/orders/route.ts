import { PREORDER_PREFIX } from "../../../lib/preorders";
import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { auditEvents, checkoutGroups, customerAddresses, customerCartItems, merchantDeliveryZones, merchantPaymentAllocations, merchants, orderItemInventoryAllocations, orderItems, orders, orderStatusEvents, paymentTransactions, productVariants, products, variantInventory } from "../../../db/schema";
import { sendOrderPlacedNotifications } from "../../../lib/order-mail";
import { cancelCheckoutAllocationsAndReleaseStock } from "../../../lib/settlements";
import { releaseOrderInventory } from "../../../lib/order-inventory";
import { calculateMerchantAllocations } from "../../../lib/commerce-fees";
import { deadlineFrom, MERCHANT_CONFIRMATION_MINUTES, ORDER_WORKFLOW } from "../../../lib/order-workflows";

const fulfillmentMethods = new Set(["pickup", "merchant_delivery"]);
const normalized = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("en") ?? "";
type Choice = { merchantId?: number; fulfillmentMethod?: string; addressId?: number | null };

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required to check out." }, { status: 401 });
  try {
    const payload = await request.json() as { fulfillment?: Choice[]; customerNotes?: string; paymentContact?: { email?: string; phone?: string } };
    const userId = Number(user.userId), db = getDb();
    const paymentEmail = payload.paymentContact?.email?.trim().toLowerCase() ?? "";
    const paymentPhone = payload.paymentContact?.phone?.trim().replace(/[\s()-]/g, "") ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(paymentEmail)) return Response.json({ error: "Enter a valid payment email address." }, { status: 400 });
    if (!/^\+?\d{7,15}$/.test(paymentPhone)) return Response.json({ error: "Enter a valid mobile number for PayToday verification." }, { status: 400 });
    const cart = await db.select({ cartId: customerCartItems.id, quantity: customerCartItems.quantity, variantId: productVariants.id, variantSku: productVariants.sku, variantTitle: productVariants.title, size: productVariants.size, color: productVariants.color, variantPrice: productVariants.price, salePrice: productVariants.salePrice, variantStatus: productVariants.status, productId: products.id, productName: products.name, productStatus: products.status, availability: products.availability, merchantId: products.merchantId }).from(customerCartItems).innerJoin(productVariants, eq(productVariants.id, customerCartItems.variantId)).innerJoin(products, eq(products.id, productVariants.productId)).where(eq(customerCartItems.userId, userId));
    if (!cart.length) return Response.json({ error: "Your shopping bag is empty." }, { status: 400 });
    if (cart.some((item) => !["available", "preorder"].includes(item.availability) || item.productStatus !== "published" || item.variantStatus !== "active" || item.quantity < 1)) return Response.json({ error: "One or more bag items are no longer available." }, { status: 409 });
    const merchantIds = [...new Set(cart.map((item) => item.merchantId))];
    const merchantRows = await db.select().from(merchants).where(and(inArray(merchants.id, merchantIds), eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "active"])));
    if (merchantRows.length !== merchantIds.length) return Response.json({ error: "One or more stores are no longer available." }, { status: 409 });
    const choices = new Map((payload.fulfillment ?? []).map((item) => [Number(item.merchantId), item]));
    const addresses = await db.select().from(customerAddresses).where(eq(customerAddresses.userId, userId));
    const deliveryZones = await db.select().from(merchantDeliveryZones).where(and(inArray(merchantDeliveryZones.merchantId, merchantIds), eq(merchantDeliveryZones.active, true)));
    const prepared = merchantRows.map((merchant) => {
      const choice = choices.get(merchant.id), method = choice?.fulfillmentMethod ?? "";
      if (!fulfillmentMethods.has(method) || !Array.isArray(merchant.fulfillmentMethods) || !merchant.fulfillmentMethods.includes(method)) throw new Error(`Choose an available fulfilment method for ${merchant.name}.`);
      const address = method === "merchant_delivery" ? addresses.find((item) => item.id === Number(choice?.addressId)) : null;
      if (method === "merchant_delivery" && !address) throw new Error(`Choose a delivery address for ${merchant.name}.`);
      const zone = address ? deliveryZones.find((item) => item.merchantId === merchant.id && normalized(item.area) === normalized(address.suburb)) : null;
      if (method === "merchant_delivery" && !zone) throw new Error(`${merchant.name} does not currently deliver to ${address?.suburb || "that area"}.`);
      const items = cart.filter((item) => item.merchantId === merchant.id);
      const subtotal = items.reduce((sum, item) => sum + Number(item.salePrice ?? item.variantPrice) * item.quantity, 0);
      return { merchant, method, address, zone, items, subtotal, deliveryFee: Number(zone?.fee ?? 0) };
    });
    const inventoryRows = await db.select().from(variantInventory).where(inArray(variantInventory.variantId, cart.map((item) => item.variantId)));
    for (const item of cart) {
      if (item.availability === "preorder") continue;
      const stock = inventoryRows.filter((row) => row.variantId === item.variantId);
      const available = stock.reduce((sum, row) => sum + Math.max(0, row.onHand - row.reserved - row.safetyStock), 0);
      if (!stock.length || available < item.quantity) throw new Error(`${item.productName} no longer has enough available stock.`);
    }
    const subtotal = prepared.reduce((sum, group) => sum + group.subtotal, 0), deliveryFee = prepared.reduce((sum, group) => sum + group.deliveryFee, 0), total = subtotal + deliveryFee;
    const reference = `NCP-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, notes = payload.customerNotes?.trim().slice(0, 1000) || null;
    const created = await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(${userId})`);
      const currentCart = await tx.select({ id: customerCartItems.id }).from(customerCartItems).where(and(eq(customerCartItems.userId, userId), inArray(customerCartItems.id, cart.map((item) => item.cartId))));
      if (currentCart.length !== cart.length) throw new Error("Your shopping bag changed during checkout. Review it and try again.");
      const confirmationExpiresAt = deadlineFrom(new Date(), MERCHANT_CONFIRMATION_MINUTES);
      const [checkout] = await tx.insert(checkoutGroups).values({ reference, customerRef: user.userId, subtotal, deliveryFee, total, paymentProvider: "paytoday", status: "pending_merchant_confirmation" }).returning();
      const createdOrders: Array<{ order: typeof orders.$inferSelect; merchant: typeof merchants.$inferSelect; items: typeof cart; orderItemRows: Array<typeof orderItems.$inferSelect> }> = [];
      const allocations = calculateMerchantAllocations(prepared.map((group) => group.subtotal + group.deliveryFee));
      for (const [groupIndex, group] of prepared.entries()) {
        const [order] = await tx.insert(orders).values({ checkoutGroupId: checkout.id, merchantId: group.merchant.id, customerRef: user.userId, customerName: group.address?.recipientName ?? user.displayName, customerEmail: paymentEmail || user.email, customerPhone: paymentPhone || group.address?.phone || null, status: "pending_merchant_confirmation", workflow: ORDER_WORKFLOW, workflowVersion: 1, confirmationExpiresAt, paymentStatus: "not_started", paymentMethod: "paytoday", fulfillmentMethod: group.method, addressSnapshot: group.address ? { label: group.address.label, recipientName: group.address.recipientName, phone: group.address.phone, addressLine1: group.address.addressLine1, addressLine2: group.address.addressLine2, suburb: group.address.suburb, city: group.address.city, deliveryNotes: group.address.deliveryNotes, deliveryZone: group.zone?.area, deliveryEstimate: group.zone?.estimatedTime } : null, customerNotes: notes, subtotal: group.subtotal, deliveryFee: group.deliveryFee, total: group.subtotal + group.deliveryFee }).returning();
        const orderItemRows = await tx.insert(orderItems).values(group.items.map((item) => ({ orderId: order.id, productId: item.productId, variantId: item.variantId, skuSnapshot: item.variantSku, nameSnapshot: item.productName, variantSnapshot: item.availability === "preorder" ? PREORDER_PREFIX + item.variantTitle : item.variantTitle, sizeSnapshot: item.size, colorSnapshot: item.color, unitPrice: Number(item.salePrice ?? item.variantPrice), quantity: item.quantity, lineTotal: Number(item.salePrice ?? item.variantPrice) * item.quantity }))).returning();
        const allocation = allocations[groupIndex];
        await tx.insert(merchantPaymentAllocations).values({ checkoutGroupId: checkout.id, orderId: order.id, merchantId: group.merchant.id, ...allocation, deliveryAmount: group.deliveryFee, settlementStatus: "pending_payment" });
        await tx.insert(orderStatusEvents).values({ orderId: order.id, status: order.status, actorRef: user.userId, note: `Created under combined checkout ${reference}` });
        createdOrders.push({ order, merchant: group.merchant, items: group.items, orderItemRows });
      }
      for (const item of cart) { if (item.availability === "preorder") continue; const createdOrder = createdOrders.find((entry) => entry.order.merchantId === item.merchantId)!; const orderItem = createdOrder.orderItemRows.find((entry) => entry.variantId === item.variantId)!; let remaining = item.quantity; for (const stock of inventoryRows.filter((row) => row.variantId === item.variantId)) { const allocation = Math.min(remaining, Math.max(0, stock.onHand - stock.reserved - stock.safetyStock)); if (allocation > 0) { const [reserved] = await tx.update(variantInventory).set({ reserved: sql`${variantInventory.reserved} + ${allocation}`, updatedAt: new Date() }).where(and(eq(variantInventory.id, stock.id), sql`${variantInventory.onHand} - ${variantInventory.reserved} - ${variantInventory.safetyStock} >= ${allocation}`)).returning({ id: variantInventory.id }); if (!reserved) throw new Error(`${item.productName} stock changed during checkout. Review your bag and try again.`); await tx.insert(orderItemInventoryAllocations).values({ orderItemId: orderItem.id, inventoryId: stock.id, quantity: allocation }); } remaining -= allocation; if (!remaining) break; } if (remaining) throw new Error(`${item.productName} no longer has enough available stock.`); }
      await tx.delete(customerCartItems).where(and(eq(customerCartItems.userId, userId), inArray(customerCartItems.id, cart.map((item) => item.cartId))));
      await tx.insert(auditEvents).values({ actorRef: user.userId, action: "checkout.created", resourceType: "checkout_group", resourceId: String(checkout.id), metadata: { reference, merchantCount: createdOrders.length, itemCount: cart.length, subtotal, deliveryFee, total } });
      return { checkout, orders: createdOrders };
    });
    await Promise.allSettled(created.orders.map(({ order, merchant, items }) => sendOrderPlacedNotifications({ reference: `NC-${String(order.id).padStart(6, "0")}`, storeName: merchant.name, customerName: order.customerName ?? user.displayName, customerEmail: order.customerEmail ?? user.email, merchantEmail: merchant.contactEmail, status: order.status, total: order.total, fulfillmentMethod: order.fulfillmentMethod ?? "pickup", paymentInstructions: null, lines: items.map((item) => ({ name: item.productName, option: [item.size, item.color].filter(Boolean).join(" / ") || item.variantTitle, quantity: item.quantity, lineTotal: Number(item.salePrice ?? item.variantPrice) * item.quantity })) })));
    return Response.json({ checkout: { reference, total, merchantCount: created.orders.length, orderReferences: created.orders.map(({ order }) => `NC-${String(order.id).padStart(6, "0")}`), confirmationExpiresAt: created.orders[0]?.order.confirmationExpiresAt, status: "pending_merchant_confirmation", paymentUrl: null } }, { status: 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Checkout could not be created." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const payload = await request.json() as { orderId?: number; reason?: string }, reason = payload.reason?.trim().slice(0, 500);
  if (!Number.isInteger(payload.orderId) || !reason) return Response.json({ error: "Order and cancellation reason are required." }, { status: 400 });
  const db = getDb(); const [order] = await db.select().from(orders).where(and(eq(orders.id, payload.orderId!), eq(orders.customerRef, user.userId))).limit(1);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  if (!["pending_payment", "pending_merchant_confirmation", "accepted"].includes(order.status) || order.paymentStatus === "paid") return Response.json({ error: "Paid or active orders require a support issue so refunds and merchant allocations stay reconciled." }, { status: 409 });
  await db.transaction(async (tx) => {
    const changedAt = new Date();
    if (order.checkoutGroupId) {
      await tx.update(orders).set({ status: "cancelled", paymentStatus: "cancelled", updatedAt: changedAt }).where(and(eq(orders.checkoutGroupId, order.checkoutGroupId), inArray(orders.paymentStatus, ["not_started", "pending", "failed"])));
      await tx.update(checkoutGroups).set({ status: "cancelled", paymentStatus: "cancelled", updatedAt: changedAt }).where(and(eq(checkoutGroups.id, order.checkoutGroupId), inArray(checkoutGroups.paymentStatus, ["pending", "failed"])));
      await tx.update(paymentTransactions).set({ status: "cancelled", failureMessage: `Customer cancelled before payment: ${reason}`, updatedAt: changedAt }).where(and(eq(paymentTransactions.checkoutGroupId, order.checkoutGroupId), inArray(paymentTransactions.status, ["created", "creating", "pending"])));
      await cancelCheckoutAllocationsAndReleaseStock(tx, order.checkoutGroupId, Number(user.userId), changedAt);
    } else {
      await tx.update(orders).set({ status: "cancelled", updatedAt: changedAt }).where(and(eq(orders.id, order.id), eq(orders.status, "pending_payment")));
      await tx.update(merchantPaymentAllocations).set({ settlementStatus: "cancelled", updatedAt: changedAt }).where(eq(merchantPaymentAllocations.orderId, order.id));
      await releaseOrderInventory(tx, order.id, changedAt);
    }
    await tx.insert(orderStatusEvents).values({ orderId: order.id, status: "cancelled", actorRef: user.userId, note: `Customer cancellation: ${reason}` });
    await tx.insert(auditEvents).values({ actorRef: user.userId, action: "order.cancelled_by_customer", resourceType: "order", resourceId: String(order.id), metadata: { reason } });
  });
  return Response.json({ ok: true });
}
