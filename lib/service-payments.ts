import type { DatabaseTransaction } from "../db";
import { eq } from "drizzle-orm";
import { checkoutGroups, merchantPaymentAllocations, orderItems, orders, serviceBookings } from "../db/schema";
import { calculateMerchantAllocation } from "./commerce-fees";
import { CUSTOMER_PAYMENT_MINUTES, deadlineFrom, ORDER_WORKFLOW } from "./order-workflows";

type Booking = typeof serviceBookings.$inferSelect;
type Product = { id: number; sku: string; name: string };
type Customer = { displayName: string; email: string };

export async function openServicePayment(tx: DatabaseTransaction, booking: Booking, product: Product, customer: Customer, at = new Date()) {
  if (booking.orderId) return { orderId: booking.orderId, paymentExpiresAt: booking.paymentExpiresAt };
  if (booking.priceSnapshot === null || !Number.isFinite(Number(booking.priceSnapshot)) || Number(booking.priceSnapshot) <= 0) throw new Error("Set a valid service price before opening payment.");
  const total = Number(booking.priceSnapshot);
  const paymentExpiresAt = deadlineFrom(at, CUSTOMER_PAYMENT_MINUTES);
  const reference = `NCS-${String(booking.id).padStart(6, "0")}`;
  const [checkout] = await tx.insert(checkoutGroups).values({ reference, customerRef: String(booking.customerId), subtotal: total, total, status: "awaiting_payment", paymentStatus: "not_started", paymentProvider: "paytoday" }).returning();
  const [order] = await tx.insert(orders).values({ checkoutGroupId: checkout.id, merchantId: booking.merchantId, customerRef: String(booking.customerId), customerName: customer.displayName, customerEmail: customer.email, status: "accepted", workflow: ORDER_WORKFLOW, workflowVersion: 1, confirmedAt: at, paymentExpiresAt, paymentStatus: "not_started", paymentMethod: "paytoday", fulfillmentMethod: "service_booking", subtotal: total, total }).returning();
  await tx.insert(orderItems).values({ orderId: order.id, productId: product.id, skuSnapshot: product.sku, nameSnapshot: product.name, variantSnapshot: booking.scheduledStart?.toISOString() ?? booking.requestedStart.toISOString(), unitPrice: total, quantity: 1, lineTotal: total });
  await tx.insert(merchantPaymentAllocations).values({ checkoutGroupId: checkout.id, orderId: order.id, merchantId: booking.merchantId, ...calculateMerchantAllocation(total), settlementStatus: "pending_payment" });
  await tx.update(serviceBookings).set({ orderId: order.id, paymentStatus: "not_started", paymentExpiresAt, updatedAt: at }).where(eq(serviceBookings.id, booking.id));
  return { orderId: order.id, paymentExpiresAt };
}
