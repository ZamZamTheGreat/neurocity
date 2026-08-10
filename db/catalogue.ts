import { eq } from "drizzle-orm";
import { getDb } from ".";
import { merchants, productVariants, products, storeBranches, variantInventory } from "./schema";

const productSeeds = [
  { sku: "LW-CROWN-V1", name: "Crown V1 Cuffed Tracksuit", collection: "Crown V1", description: "Black tracksuit. Product description and current sale status require merchant confirmation.", price: 1249.99, status: "needs_confirmation", imageUrl: "/lightwork-crown-v1.png", badge: "Price to confirm" },
  { sku: "LW-MET23-LS", name: "Metallic 23 Longsleeve", collection: "Metallic 23", description: "Maroon long-sleeve. Material, sizes, current price and stock require merchant confirmation.", price: null, status: "needs_confirmation", imageUrl: "/lightwork-metallic-23.jpeg", badge: "Coming to the pilot" },
  { sku: "LW-MAJ-EDIT", name: "Majesteric Zip Hoodie", collection: "Majesteric Edition", description: "Black zip hoodie shown in four colourways. Official variants require merchant confirmation.", price: null, status: "needs_confirmation", imageUrl: "/lightwork-majesteric.jpeg", badge: "4 colourways" },
  { sku: "LW-ESO-SET", name: "Esoteric Tee & Shorts", collection: "Esoteric", description: "T-shirt and shorts shown in several colours. Set structure, sizes, prices and stock require confirmation.", price: null, status: "needs_confirmation", imageUrl: "/lightwork-esoteric.jpeg", badge: "Details to confirm" },
];

export async function ensurePilotCatalogue() {
  const db = getDb();
  let [merchant] = await db.select().from(merchants).where(eq(merchants.slug, "lightwork-clothing")).limit(1);
  const identity = { name: "LightWork Clothing", category: "Fashion / streetwear", contactName: "Zephan Stadhauer", contactEmail: "lightworkclothing.na@gmail.com", contactPhone: "0814953446", website: "https://lightworkclothing.com", pickupLocation: "Baines Centre, Pioneerspark, Windhoek", deliveryMode: "merchant_managed", setupStep: 2, tagline: "Global established movement.", description: "Independent Windhoek streetwear from Baines Centre, Pioneerspark.", logoUrl: "/lightwork-logo.png", bannerUrl: "/lightwork-crown-v1.png", primaryCategory: "Fashion", policies: { returns: "Returns and exchanges are confirmed directly with LightWork during the pilot." }, contactOptions: { phone: "0814953446", email: "lightworkclothing.na@gmail.com", website: "https://lightworkclothing.com" }, fulfillmentMethods: ["pickup", "merchant_delivery"] };
  if (!merchant) [merchant] = await db.insert(merchants).values({ slug: "lightwork-clothing", status: "pilot", isPublic: true, ...identity }).returning(); else [merchant] = await db.update(merchants).set(identity).where(eq(merchants.id, merchant.id)).returning();
  for (const product of productSeeds) await db.insert(products).values({ ...product, merchantId: merchant.id }).onConflictDoNothing();
  let [branch] = await db.select().from(storeBranches).where(eq(storeBranches.merchantId, merchant.id)).limit(1);
  if (!branch) [branch] = await db.insert(storeBranches).values({ merchantId: merchant.id, name: "Baines Centre", address: "Baines Centre, Pioneerspark, Windhoek", city: "Windhoek", phone: merchant.contactPhone, pickupEnabled: true, deliveryEnabled: true, isPrimary: true }).returning();
  const seededProducts = await db.select().from(products).where(eq(products.merchantId, merchant.id));
  for (const product of seededProducts) {
    const variantPrice = Number(product.price ?? 0);
    const [variant] = await db.insert(productVariants).values({ productId: product.id, sku: `${product.sku}-DEFAULT`, title: "Default", attributes: {}, price: variantPrice, status: product.price === null ? "needs_confirmation" : "active", imageUrl: product.imageUrl }).onConflictDoUpdate({ target: productVariants.sku, set: { title: "Default", price: variantPrice, imageUrl: product.imageUrl } }).returning();
    await db.insert(variantInventory).values({ variantId: variant.id, branchId: branch.id, onHand: 0, reserved: 0, safetyStock: 0 }).onConflictDoNothing();
  }
  return merchant;
}
