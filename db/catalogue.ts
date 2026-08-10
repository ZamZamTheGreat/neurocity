import { eq } from "drizzle-orm";
import { getDb } from ".";
import { merchants, products } from "./schema";

const productSeeds = [
  { sku: "LW-CROWN-V1", name: "Crown V1 Cuffed Tracksuit", collection: "Crown V1", description: "Black tracksuit. Product description and current sale status require merchant confirmation.", price: 1249.99, status: "needs_confirmation", imageUrl: "/lightwork-crown-v1.png", badge: "Price to confirm" },
  { sku: "LW-MET23-LS", name: "Metallic 23 Longsleeve", collection: "Metallic 23", description: "Maroon long-sleeve. Material, sizes, current price and stock require merchant confirmation.", price: null, status: "needs_confirmation", imageUrl: "/lightwork-metallic-23.jpeg", badge: "Coming to the pilot" },
  { sku: "LW-MAJ-EDIT", name: "Majesteric Zip Hoodie", collection: "Majesteric Edition", description: "Black zip hoodie shown in four colourways. Official variants require merchant confirmation.", price: null, status: "needs_confirmation", imageUrl: "/lightwork-majesteric.jpeg", badge: "4 colourways" },
  { sku: "LW-ESO-SET", name: "Esoteric Tee & Shorts", collection: "Esoteric", description: "T-shirt and shorts shown in several colours. Set structure, sizes, prices and stock require confirmation.", price: null, status: "needs_confirmation", imageUrl: "/lightwork-esoteric.jpeg", badge: "Details to confirm" },
];

export async function ensurePilotCatalogue() {
  const db = getDb();
  let [merchant] = await db.select().from(merchants).where(eq(merchants.slug, "lightwork-clothing")).limit(1);
  if (!merchant) [merchant] = await db.insert(merchants).values({ name: "LightWork Clothing", slug: "lightwork-clothing", category: "Fashion / streetwear", status: "pilot", contactName: "Zephan Stadhauer", contactEmail: "lightworkclothing.na@gmail.com", contactPhone: "0814953446", website: "https://lightworkclothing.com", pickupLocation: "Baines Centre, Pioneerspark, Windhoek", deliveryMode: "merchant_managed", setupStep: 2 }).returning();
  for (const product of productSeeds) await db.insert(products).values({ ...product, merchantId: merchant.id }).onConflictDoNothing();
  return merchant;
}
