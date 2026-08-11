import { and, asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, productVariants, products } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

const statuses = new Set(["needs_confirmation", "draft", "published", "archived"]);
const availabilityValues = new Set(["available", "preorder", "out_of_stock", "unavailable"]);
const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : fallback;
const optionalText = (value: unknown, fallback: string | null = null) => value === null ? null : typeof value === "string" ? value.trim() || null : fallback;

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const rows = await getDb().select().from(products).where(eq(products.merchantId, access.merchantId)).orderBy(asc(products.id));
  return Response.json({ products: rows.map((product) => ({ ...product, storageImageUrl: product.imageUrl, imageUrl: product.imageUrl?.startsWith("r2://") ? `/api/merchant/products/media?productId=${product.id}` : product.imageUrl })) });
}

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const name = text(payload.name);
    const sku = text(payload.sku).toUpperCase();
    const category = optionalText(payload.category);
    const brand = optionalText(payload.brand);
    const collection = optionalText(payload.collection);
    const description = text(payload.description);
    const badge = optionalText(payload.badge);
    const price = payload.price === null || payload.price === undefined ? null : Number(payload.price);
    const salePrice = payload.salePrice === null || payload.salePrice === undefined || payload.salePrice === "" ? null : Number(payload.salePrice);
    if (!name || !sku || !category || !description || price === null) return Response.json({ error: "Name, SKU, category, description and regular price are required." }, { status: 400 });
    if (!Number.isFinite(price) || price < 0) return Response.json({ error: "Price must be a valid non-negative amount." }, { status: 400 });
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) return Response.json({ error: "Sale price must be lower than the regular price." }, { status: 400 });
    const db = getDb();
    const [duplicate] = await db.select({ id: products.id }).from(products).where(and(eq(products.merchantId, access.merchantId), eq(products.sku, sku))).limit(1);
    if (duplicate) return Response.json({ error: "That SKU is already used in your catalogue." }, { status: 409 });
    const [created] = await db.insert(products).values({ merchantId: access.merchantId, name, sku, category, brand, collection, description, price, salePrice, badge, status: "draft", availability: "available" }).returning();
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.created", resourceType: "product", resourceId: String(created.id), metadata: JSON.stringify({ name, sku }), createdAt: new Date() });
    return Response.json({ product: created }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Product creation failed." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  try {
    const payload = await request.json() as Record<string, unknown> & { id?: number; merchantConfirmed?: boolean };
    if (!Number.isInteger(payload.id)) return Response.json({ error: "A valid product is required." }, { status: 400 });
    const db = getDb();
    const [current] = await db.select().from(products).where(and(eq(products.id, payload.id!), eq(products.merchantId, access.merchantId))).limit(1);
    if (!current) return Response.json({ error: "Product not found." }, { status: 404 });

    const name = text(payload.name, current.name);
    const sku = text(payload.sku, current.sku).toUpperCase();
    const price = payload.price === undefined ? current.price : payload.price === null ? null : Number(payload.price);
    const salePrice = payload.salePrice === undefined ? current.salePrice : payload.salePrice === null || payload.salePrice === "" ? null : Number(payload.salePrice);
    const status = text(payload.status, current.status);
    const availability = text(payload.availability, current.availability);
    const description = text(payload.description, current.description);
    const category = optionalText(payload.category, current.category);
    const brand = optionalText(payload.brand, current.brand);
    const collection = optionalText(payload.collection, current.collection);
    const badge = optionalText(payload.badge, current.badge);
    const imageUrl = optionalText(payload.imageUrl, current.imageUrl);
    if (!name || !sku) return Response.json({ error: "Product name and SKU are required." }, { status: 400 });
    if (!statuses.has(status) || !availabilityValues.has(availability)) return Response.json({ error: "Invalid product status or availability." }, { status: 400 });
    if (price !== null && (!Number.isFinite(price) || price < 0)) return Response.json({ error: "Price must be a valid non-negative amount." }, { status: 400 });
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || price === null || salePrice >= price)) return Response.json({ error: "Sale price must be lower than the regular price." }, { status: 400 });
    const [duplicate] = await db.select({ id: products.id }).from(products).where(and(eq(products.merchantId, access.merchantId), eq(products.sku, sku))).limit(1);
    if (duplicate && duplicate.id !== current.id) return Response.json({ error: "That SKU is already used in your catalogue." }, { status: 409 });
    if (status === "published" && (!payload.merchantConfirmed || price === null || !description || !category || !imageUrl)) return Response.json({ error: "Publishing requires confirmation, a price, category, description and product image." }, { status: 409 });
    if (imageUrl?.startsWith("r2://") && !imageUrl.slice(5).startsWith(`merchants/${access.merchantId}/products/${current.id}/`)) return Response.json({ error: "Invalid product image." }, { status: 403 });

    const [updated] = await db.update(products).set({ name, sku, collection, category, brand, description, price, salePrice, status, availability, imageUrl, badge }).where(and(eq(products.id, current.id), eq(products.merchantId, access.merchantId))).returning();
    const existingVariants = await db.select().from(productVariants).where(eq(productVariants.productId, current.id));
    if (price !== null && existingVariants.length === 0) {
      await db.insert(productVariants).values({ productId: current.id, sku: `M${access.merchantId}-${sku}-DEFAULT`, title: "Standard", attributes: { inventoryMode: "merchant_confirmed" }, price, salePrice, status: status === "published" ? "active" : "draft", imageUrl });
    } else if (existingVariants.length === 1 && existingVariants[0].attributes && (existingVariants[0].attributes as Record<string, unknown>).inventoryMode === "merchant_confirmed") {
      await db.update(productVariants).set({ sku: `M${access.merchantId}-${sku}-DEFAULT`, price: price ?? existingVariants[0].price, salePrice, status: status === "published" ? "active" : status === "archived" ? "archived" : "draft", imageUrl }).where(eq(productVariants.id, existingVariants[0].id));
    }
    await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.updated", resourceType: "product", resourceId: String(current.id), metadata: JSON.stringify({ before: current, after: updated }), createdAt: new Date() });
    return Response.json({ product: updated });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Product update failed." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id)) return Response.json({ error: "A valid product is required." }, { status: 400 });
  const db = getDb();
  const [current] = await db.select().from(products).where(and(eq(products.id, id), eq(products.merchantId, access.merchantId))).limit(1);
  if (!current) return Response.json({ error: "Product not found." }, { status: 404 });
  const [product] = await db.update(products).set({ status: "archived", availability: "unavailable" }).where(and(eq(products.id, id), eq(products.merchantId, access.merchantId))).returning();
  await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.archived", resourceType: "product", resourceId: String(id), metadata: JSON.stringify({ name: current.name, sku: current.sku }), createdAt: new Date() });
  return Response.json({ product });
}
