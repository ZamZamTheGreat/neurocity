import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensurePilotCatalogue } from "../../../../db/catalogue";
import { merchants, productVariants, products, storeBranches, storeHours, storePromotions, variantInventory } from "../../../../db/schema";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  await ensurePilotCatalogue();
  const { slug } = await context.params; const db = getDb();
  const [store] = await db.select().from(merchants).where(and(eq(merchants.slug, slug), inArray(merchants.status, ["pilot", "onboarding", "active"]))).limit(1);
  const setupComplete = store && store.name && store.category && store.tagline && store.description && store.logoUrl && store.bannerUrl && store.contactEmail && Array.isArray(store.fulfillmentMethods) && store.fulfillmentMethods.length > 0 && Boolean((store.policies as Record<string, string> | null)?.returns);
  if (!store || !store.isPublic || !setupComplete) return Response.json({ error: "Store not found." }, { status: 404 });
  const catalogue = await db.select().from(products).where(and(eq(products.merchantId, store.id), eq(products.status, "published"))).orderBy(asc(products.id));
  const variants = catalogue.length ? await db.select().from(productVariants).where(and(inArray(productVariants.productId, catalogue.map((product) => product.id)), eq(productVariants.status, "active"))).orderBy(asc(productVariants.id)) : [];
  const branches = await db.select().from(storeBranches).where(eq(storeBranches.merchantId, store.id)).orderBy(asc(storeBranches.id));
  const hours = branches.length ? await db.select().from(storeHours).where(inArray(storeHours.branchId, branches.map((branch) => branch.id))) : [];
  const stock = variants.length ? await db.select().from(variantInventory).where(inArray(variantInventory.variantId, variants.map((variant) => variant.id))) : [];
  const promotions = await db.select().from(storePromotions).where(and(eq(storePromotions.merchantId, store.id), eq(storePromotions.status, "active")));
  const publicStore = { ...store, logoUrl: store.logoUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=logo` : store.logoUrl, bannerUrl: store.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=banner` : store.bannerUrl };
  return Response.json({ store: publicStore, branches: branches.map((branch) => ({ ...branch, hours: hours.filter((item) => item.branchId === branch.id) })), promotions, products: catalogue.map((product) => ({ ...product, imageUrl: product.imageUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=product&productId=${product.id}` : product.imageUrl, variants: variants.filter((variant) => variant.productId === product.id).map((variant) => { const variantStock = stock.filter((item) => item.variantId === variant.id); return { ...variant, stock: variantStock, available: variantStock.length ? variantStock.reduce((total, item) => total + Math.max(0, item.onHand - item.reserved - item.safetyStock), 0) : null }; }) })) }, { headers: { "cache-control": "no-store" } });
}
