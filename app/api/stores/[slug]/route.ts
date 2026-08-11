import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { ensurePilotCatalogue } from "../../../../db/catalogue";
import { merchants, productVariants, products, storeBranches, storeHours, storePromotions, variantInventory } from "../../../../db/schema";

export async function GET(_request: Request, context: { params: Promise<{ slug: string }> }) {
  await ensurePilotCatalogue();
  const { slug } = await context.params; const db = getDb();
  const [store] = await db.select().from(merchants).where(and(eq(merchants.slug, slug), inArray(merchants.status, ["pilot", "onboarding", "active"]))).limit(1);
  if (!store || !store.isPublic) return Response.json({ error: "Store not found." }, { status: 404 });
  const catalogue = await db.select().from(products).where(eq(products.merchantId, store.id)).orderBy(asc(products.id));
  const variants = catalogue.length ? await db.select().from(productVariants).where(inArray(productVariants.productId, catalogue.map((product) => product.id))).orderBy(asc(productVariants.id)) : [];
  const branches = await db.select().from(storeBranches).where(eq(storeBranches.merchantId, store.id)).orderBy(asc(storeBranches.id));
  const hours = branches.length ? await db.select().from(storeHours).where(inArray(storeHours.branchId, branches.map((branch) => branch.id))) : [];
  const stock = variants.length ? await db.select().from(variantInventory).where(inArray(variantInventory.variantId, variants.map((variant) => variant.id))) : [];
  const promotions = await db.select().from(storePromotions).where(and(eq(storePromotions.merchantId, store.id), eq(storePromotions.status, "active")));
  const publicStore = { ...store, logoUrl: store.logoUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=logo` : store.logoUrl, bannerUrl: store.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(store.slug)}/media?type=banner` : store.bannerUrl };
  return Response.json({ store: publicStore, branches: branches.map((branch) => ({ ...branch, hours: hours.filter((item) => item.branchId === branch.id) })), promotions, products: catalogue.map((product) => ({ ...product, variants: variants.filter((variant) => variant.productId === product.id).map((variant) => ({ ...variant, stock: stock.filter((item) => item.variantId === variant.id), available: stock.filter((item) => item.variantId === variant.id).reduce((total, item) => total + Math.max(0, item.onHand - item.reserved - item.safetyStock), 0) })) })) }, { headers: { "cache-control": "no-store" } });
}
