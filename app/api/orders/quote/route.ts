import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { customerAddresses, customerCartItems, merchantDeliveryZones, merchants, productVariants, products } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

const normalized = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("en") ?? "";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const url = new URL(request.url), requestedMerchantId = Number(url.searchParams.get("merchantId")), addressId = Number(url.searchParams.get("addressId"));
  if (!Number.isInteger(addressId)) return Response.json({ error: "Choose a delivery address." }, { status: 400 });
  const db = getDb();
  const [address] = await db.select().from(customerAddresses).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, Number(user.userId)))).limit(1);
  if (!address) return Response.json({ error: "Delivery address not found." }, { status: 404 });
  const cartMerchants = Number.isInteger(requestedMerchantId) ? [requestedMerchantId] : [...new Set((await db.select({ merchantId: products.merchantId }).from(customerCartItems).innerJoin(productVariants, eq(productVariants.id, customerCartItems.variantId)).innerJoin(products, eq(products.id, productVariants.productId)).where(eq(customerCartItems.userId, Number(user.userId)))).map((item) => item.merchantId))];
  if (!cartMerchants.length) return Response.json({ supported: false, error: "Your bag is empty." });
  const merchantRows = await db.select({ id: merchants.id, name: merchants.name }).from(merchants).where(inArray(merchants.id, cartMerchants));
  const zones = await db.select().from(merchantDeliveryZones).where(and(inArray(merchantDeliveryZones.merchantId, cartMerchants), eq(merchantDeliveryZones.active, true)));
  const target = normalized(address.suburb);
  if (!target) return Response.json({ supported: false, error: "Add a suburb to this address so we can check delivery." });
  const quotes = merchantRows.map((merchant) => ({ merchant, zone: zones.find((item) => item.merchantId === merchant.id && normalized(item.area) === target) }));
  const unavailable = quotes.filter((item) => !item.zone).map((item) => item.merchant.name);
  if (unavailable.length) return Response.json({ supported: false, error: `${unavailable.join(", ")} ${unavailable.length === 1 ? "does" : "do"} not currently deliver to ${address.suburb}. Choose pickup or another address.` });
  return Response.json({ supported: true, deliveryFee: quotes.reduce((sum, item) => sum + Number(item.zone?.fee ?? 0), 0), area: address.suburb, estimatedTime: quotes.map((item) => item.zone?.estimatedTime).filter(Boolean).join(" · "), stores: quotes.map((item) => ({ merchantId: item.merchant.id, name: item.merchant.name, fee: item.zone!.fee, estimatedTime: item.zone!.estimatedTime })) });
}
