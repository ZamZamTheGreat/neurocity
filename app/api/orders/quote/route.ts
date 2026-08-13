import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { customerAddresses, merchantDeliveryZones, merchants } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

const normalized = (value: string | null | undefined) => value?.trim().replace(/\s+/g, " ").toLocaleLowerCase("en") ?? "";

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  const url = new URL(request.url), merchantId = Number(url.searchParams.get("merchantId")), addressId = Number(url.searchParams.get("addressId"));
  if (!Number.isInteger(merchantId) || !Number.isInteger(addressId)) return Response.json({ error: "Choose a delivery address." }, { status: 400 });
  const db = getDb();
  const [address] = await db.select().from(customerAddresses).where(and(eq(customerAddresses.id, addressId), eq(customerAddresses.userId, Number(user.userId)))).limit(1);
  if (!address) return Response.json({ error: "Delivery address not found." }, { status: 404 });
  const [merchant] = await db.select({ name: merchants.name }).from(merchants).where(eq(merchants.id, merchantId)).limit(1);
  if (!merchant) return Response.json({ error: "Store not found." }, { status: 404 });
  const zones = await db.select().from(merchantDeliveryZones).where(and(eq(merchantDeliveryZones.merchantId, merchantId), eq(merchantDeliveryZones.active, true)));
  const target = normalized(address.suburb);
  const zone = zones.find((item) => normalized(item.area) === target);
  if (!target) return Response.json({ supported: false, error: "Add a suburb to this address so we can check delivery." });
  if (!zone) return Response.json({ supported: false, error: `${merchant.name} does not currently deliver to ${address.suburb}. Choose pickup or another address.` });
  return Response.json({ supported: true, deliveryFee: zone.fee, area: zone.area, estimatedTime: zone.estimatedTime });
}
