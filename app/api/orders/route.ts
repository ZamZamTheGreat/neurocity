import { and, eq, inArray, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { auditEvents, checkoutGroups, customerAddresses, customerCartItems, merchantDeliveryZones, merchantPaymentAllocations, merchants, orderItems, orders, orderStatusEvents, paymentTransactions, productVariants, products, variantInventory } from "../../../db/schema";
import { sendOrderPlacedNotifications } from "../../../lib/order-mail";
import { createPayTodayPayment, getPayTodayAvailability } from "../../../lib/paytoday";
import { cancelCheckoutAllocationsAndReleaseStock } from "../../../lib/settlements";

const fulfillmentMethods = new Set(["pickup", "merchant_delivery"]);
const normalized = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("en") ?? "";
type Choice = { merchantId?: number; fulfillmentMethod?: string; addressId?: number | null };

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required to check out." }, { status: 401 });
  if (!getPayTodayAvailability().configured) return Response.json({ error: "PayToday is not active yet. Checkout will open as soon as the NeuroCity payment account is enabled." }, { status: 409 });
  try {
    const payload = await request.json() as { fulfillment?: Choice[]; customerNotes?: string };
    const userId = Number(user.userId), db = getDb();
    const cart = await db.select({ cartId: customerCartItems.id, quantity: customerCartItems.quantity, variantId: productVariants.id, variantSku: productVariants.sku, variantTitle: productVariants.title, size: productVariants.size, color: productVariants.color, variantPrice: productVariants.price, salePrice: productVariants.salePrice, variantStatus: productVariants.status, productId: products.id, productName: products.name, productStatus: products.status, merchantId: products.merchantId }).from(customerCartItems).innerJoin(productVariants, eq(productVariants.id, customerCartItems.variantId)).innerJoin(products, eq(products.id, productVariants.productId)).where(eq(customerCartItems.userId, userId));
    if (!cart.length) return Response.json({ error: "Your shopping bag is empty." }, { status: 400 });
    if (cart.some((item) => item.productStatus !== "published" || item.variantStatus !== "active" || item.quantity < 1)) return Response.json({ error: "One or more bag items are no longer available." }, { status: 409 });
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
      const stock = inventoryRows.filter((row) => row.variantId === item.variantId);
      const available = stock.reduce((sum, row) => sum + Math.max(0, row.onHand - row.reserved - row.safetyStock), 0);
      if (!stock.length || available < item.quantity) throw new Error(`${item.productName} no longer has enough available stock.`);
    }
    const subtotal = prepared.reduce((sum, group) => sum + group.subtotal, 0), deliveryFee = prepared.reduce((sum, group) => sum + group.deliveryFee, 0), total = subtotal + deliveryFee;
    const reference = `NCP-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`, notes = payload.customerNotes?.trim().slice(0, 1000) || null;
    const created = await db.transaction(async (tx) => {
      const [checkout] = await tx.insert(checkoutGroups).values({ reference, customerRef: user.userId, subtotal, deliveryFee, total, paymentProvider: "paytoday", status: "awaiting_payment" }).returning();
      const createdOrders: Array<{ order: typeof orders.$inferSelect; merchant: typeof merchants.$inferSelect; items: typeof cart }> = [];
      for (const group of prepared) {
        const [order] = await tx.insert(orders).values({ checkoutGroupId: checkout.id, merchantId: group.merchant.id, customerRef: user.userId, customerName: group.address?.recipientName ?? user.displayName, customerEmail: user.email, customerPhone: group.address?.phone ?? null, status: "pending_payment", paymentStatus: "pending", paymentMethod: "paytoday", fulfillmentMethod: group.method, addressSnapshot: group.address ? { label: group.address.label, recipientName: group.address.recipientName, phone: group.address.phone, addressLine1: group.address.addressLine1, addressLine2: group.address.addressLine2, suburb: group.address.suburb, city: group.address.city, deliveryNotes: group.address.deliveryNotes, deliveryZone: group.zone?.area, deliveryEstimate: group.zone?.estimatedTime } : null, customerNotes: notes, subtotal: group.subtotal, deliveryFee: group.deliveryFee, total: group.subtotal + group.deliveryFee }).returning();
        await tx.insert(orderItems).values(group.items.map((item) => ({ orderId: order.id, productId: item.productId, variantId: item.variantId, skuSnapshot: item.variantSku, nameSnapshot: item.productName, variantSnapshot: item.variantTitle, sizeSnapshot: item.size, colorSnapshot: item.color, unitPrice: Number(item.salePrice ?? item.variantPrice), quantity: item.quantity, lineTotal: Number(item.salePrice ?? item.variantPrice) * item.quantity })));
        await tx.insert(merchantPaymentAllocations).values({ checkoutGroupId: checkout.id, orderId: order.id, merchantId: group.merchant.id, grossAmount: order.total, deliveryAmount: group.deliveryFee, netAmount: order.total, settlementStatus: "pending_payment" });
        await tx.insert(orderStatusEvents).values({ orderId: order.id, status: order.status, actorRef: user.userId, note: `Created under combined checkout ${reference}` });
        createdOrders.push({ order, merchant: group.merchant, items: group.items });
      }
      for (const item of cart) { let remaining = item.quantity; for (const stock of inventoryRows.filter((row) => row.variantId === item.variantId)) { const allocation = Math.min(remaining, Math.max(0, stock.onHand - stock.reserved - stock.safetyStock)); if (allocation > 0) await tx.update(variantInventory).set({ reserved: sql`${variantInventory.reserved} + ${allocation}`, updatedAt: new Date() }).where(eq(variantInventory.id, stock.id)); remaining -= allocation; if (!remaining) break; } }
      await tx.delete(customerCartItems).where(and(eq(customerCartItems.userId, userId), inArray(customerCartItems.id, cart.map((item) => item.cartId))));
      await tx.insert(auditEvents).values({ actorRef: user.userId, action: "checkout.created", resourceType: "checkout_group", resourceId: String(checkout.id), metadata: { reference, merchantCount: createdOrders.length, itemCount: cart.length, subtotal, deliveryFee, total } });
      return { checkout, orders: createdOrders };
    });
    const [transaction] = await db.insert(paymentTransactions).values({ checkoutGroupId: created.checkout.id, provider: "paytoday", amount: total, status: "creating", providerMetadata: { invoiceNumber: reference, merchantCount: created.orders.length } }).returning();
    try {
      const names = user.displayName.trim().split(/\s+/), primaryPhone = prepared.map((item) => item.address?.phone).find(Boolean) ?? "";
      const result = await createPayTodayPayment({ amount: total, invoiceNumber: reference, firstName: names[0] ?? "Customer", lastName: names.slice(1).join(" ") || "NeuroCity", email: user.email, phone: primaryPhone, returnUrl: new URL("/api/payments/paytoday/return", request.url).toString() });
      await db.update(paymentTransactions).set({ providerPaymentToken: result.paymentToken, providerReference: result.providerReference, checkoutUrl: result.checkoutUrl, status: "pending", updatedAt: new Date() }).where(eq(paymentTransactions.id, transaction.id));
      await Promise.allSettled(created.orders.map(({ order, merchant, items }) => sendOrderPlacedNotifications({ reference: `NC-${String(order.id).padStart(6, "0")}`, storeName: merchant.name, customerName: order.customerName ?? user.displayName, customerEmail: user.email, merchantEmail: merchant.contactEmail, status: order.status, total: order.total, fulfillmentMethod: order.fulfillmentMethod ?? "pickup", paymentInstructions: null, lines: items.map((item) => ({ name: item.productName, option: [item.size, item.color].filter(Boolean).join(" / ") || item.variantTitle, quantity: item.quantity, lineTotal: Number(item.salePrice ?? item.variantPrice) * item.quantity })) })));
      return Response.json({ checkout: { reference, total, merchantCount: created.orders.length, orderReferences: created.orders.map(({ order }) => `NC-${String(order.id).padStart(6, "0")}`), paymentUrl: result.checkoutUrl } }, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "PayToday payment could not be started.";
      await db.transaction(async (tx) => { const at = new Date(); await tx.update(paymentTransactions).set({ status: "failed", failureMessage: message, updatedAt: at }).where(eq(paymentTransactions.id, transaction.id)); await tx.update(checkoutGroups).set({ paymentStatus: "failed", status: "payment_failed", updatedAt: at }).where(eq(checkoutGroups.id, created.checkout.id)); await tx.update(orders).set({ paymentStatus: "failed", status: "payment_failed", updatedAt: at }).where(eq(orders.checkoutGroupId, created.checkout.id)); await cancelCheckoutAllocationsAndReleaseStock(tx, created.checkout.id, userId, at); });
      return Response.json({ error: message, checkoutReference: reference }, { status: 502 });
    }
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Checkout could not be created." }, { status: 400 }); }
}

export async function PATCH(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const payload = await request.json() as { orderId?: number; reason?: string }, reason = payload.reason?.trim().slice(0, 500);
  if (!Number.isInteger(payload.orderId) || !reason) return Response.json({ error: "Order and cancellation reason are required." }, { status: 400 });
  const db = getDb(); const [order] = await db.select().from(orders).where(and(eq(orders.id, payload.orderId!), eq(orders.customerRef, user.userId))).limit(1);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "pending_payment" || order.paymentStatus === "paid") return Response.json({ error: "Paid or active orders require a support issue so refunds and merchant allocations stay reconciled." }, { status: 409 });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  await db.transaction(async (tx) => {
    await tx.update(orders).set({ status: "cancelled", updatedAt: new Date() }).where(eq(orders.id, order.id));
    await tx.update(merchantPaymentAllocations).set({ settlementStatus: "cancelled", updatedAt: new Date() }).where(eq(merchantPaymentAllocations.orderId, order.id));
    for (const item of items.filter((row) => row.variantId)) { const inventory = await tx.select().from(variantInventory).where(eq(variantInventory.variantId, item.variantId!)); let remaining = item.quantity; for (const row of inventory) { const released = Math.min(remaining, row.reserved); if (released > 0) await tx.update(variantInventory).set({ reserved: sql`greatest(0, ${variantInventory.reserved} - ${released})`, updatedAt: new Date() }).where(eq(variantInventory.id, row.id)); remaining -= released; if (!remaining) break; } }
    await tx.insert(orderStatusEvents).values({ orderId: order.id, status: "cancelled", actorRef: user.userId, note: `Customer cancellation: ${reason}` });
    await tx.insert(auditEvents).values({ actorRef: user.userId, action: "order.cancelled_by_customer", resourceType: "order", resourceId: String(order.id), metadata: { reason } });
  });
  return Response.json({ ok: true });
}
