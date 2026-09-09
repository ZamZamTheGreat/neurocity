import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, productVariants, products, storeBranches, variantInventory } from "../../../../db/schema";
import { requirePilotMerchant } from "../auth";

export async function GET() {
  const access = await requirePilotMerchant(); if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const db = getDb(); const rows = await db.select({ id: productVariants.id, productId: productVariants.productId, productName: products.name, sku: productVariants.sku, title: productVariants.title, size: productVariants.size, color: productVariants.color, price: productVariants.price, salePrice: productVariants.salePrice, status: productVariants.status, imageUrl: productVariants.imageUrl, attributes: productVariants.attributes, productPrice: products.price, productSalePrice: products.salePrice }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(eq(products.merchantId, access.merchantId)).orderBy(asc(products.id), asc(productVariants.id));
  const stock = rows.length ? await db.select({ variantId: variantInventory.variantId, onHand: variantInventory.onHand, reserved: variantInventory.reserved, safetyStock: variantInventory.safetyStock, branchId: variantInventory.branchId, branchName: storeBranches.name }).from(variantInventory).innerJoin(storeBranches, eq(storeBranches.id, variantInventory.branchId)).where(inArray(variantInventory.variantId, rows.map((row) => row.id))) : [];
  return Response.json({ variants: rows.map((row) => { const attributes = (row.attributes as Record<string, unknown> | null) ?? {}; return { ...row, usesProductPrice: attributes.priceMode === "product" || (attributes.priceMode === undefined && row.price === row.productPrice), usesProductSalePrice: attributes.salePriceMode === "product" || (attributes.salePriceMode === undefined && row.salePrice === row.productSalePrice), storageImageUrl: row.imageUrl, imageUrl: row.imageUrl?.startsWith("r2://") ? `/api/merchant/variants/media?variantId=${row.id}` : row.imageUrl, stock: stock.filter((item) => item.variantId === row.id) }; }) });
}

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]); if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json() as { productId?: number; sizes?: unknown; color?: string; price?: number; salePrice?: number | null; onHand?: number };
  const sizes = Array.isArray(payload.sizes) ? [...new Set(payload.sizes.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean))].slice(0, 30) : [];
  const color = payload.color?.trim();
  if (!Number.isInteger(payload.productId) || !color || sizes.length < 1) return Response.json({ error: "Product, colourway and at least one size are required." }, { status: 400 });
  const db = getDb(); const [product] = await db.select().from(products).where(and(eq(products.id, payload.productId!), eq(products.merchantId, access.merchantId))).limit(1); if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
  const price = payload.price === undefined ? product.price : Number(payload.price);
  const salePrice = payload.salePrice === undefined ? product.salePrice : payload.salePrice;
  if (!Number.isFinite(price) || price! < 0) return Response.json({ error: "A valid colourway price is required." }, { status: 400 });
  if (salePrice != null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price!)) return Response.json({ error: "Sale price must be lower than the regular price." }, { status: 400 });
  const skuPart = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "STD";
  const existing = await db.select({ size: productVariants.size, color: productVariants.color }).from(productVariants).where(eq(productVariants.productId, product.id));
  const duplicates = sizes.filter((size) => existing.some((row) => row.size?.toLocaleLowerCase() === size.toLocaleLowerCase() && row.color?.toLocaleLowerCase() === color.toLocaleLowerCase()));
  if (duplicates.length) return Response.json({ error: `${color} already has these sizes: ${duplicates.join(", ")}.` }, { status: 409 });
  try {
    const variants = await db.transaction(async (tx) => {
      const rows = sizes.map((size, index) => ({ productId: product.id, sku: `M${access.merchantId}-P${product.id}-${skuPart(color)}-${skuPart(size)}-${index + 1}`, title: `${size} / ${color}`, size, color, attributes: { inventoryMode: "generated_size_range", priceMode: price === product.price ? "product" : "custom", salePriceMode: salePrice === product.salePrice ? "product" : "custom" }, price: price!, salePrice: salePrice ?? null, status: "active", imageUrl: product.imageUrl }));
      const created = await tx.insert(productVariants).values(rows).returning();
      const [branch] = await tx.select().from(storeBranches).where(eq(storeBranches.merchantId, access.merchantId)).limit(1);
      if (branch) await tx.insert(variantInventory).values(created.map((variant) => ({ variantId: variant.id, branchId: branch.id, onHand: Math.max(0, Math.floor(payload.onHand ?? 0)), reserved: 0, safetyStock: 0 })));
      await tx.insert(auditEvents).values(created.map((variant) => ({ actorRef: access.user.userId, action: "product_variant.created", resourceType: "product_variant", resourceId: String(variant.id), metadata: { productId: product.id, sku: variant.sku, generated: true } })));
      return created;
    });
    return Response.json({ variants }, { status: 201 });
  } catch { return Response.json({ error: "The size options could not be created. Refresh and try again." }, { status: 409 }); }
}

export async function PATCH(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]); if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json() as { id?: number; title?: string; size?: string; color?: string; price?: number; salePrice?: number | null; status?: string; onHand?: number; safetyStock?: number; imageUrl?: string | null; usesProductPrice?: boolean; usesProductSalePrice?: boolean };
  if (!Number.isInteger(payload.id) || !payload.title?.trim() || !Number.isFinite(payload.price) || payload.price! < 0 || !["active", "draft", "archived", "needs_confirmation"].includes(payload.status ?? "")) return Response.json({ error: "Valid variant details are required." }, { status: 400 });
  if (payload.salePrice != null && (!Number.isFinite(payload.salePrice) || payload.salePrice < 0 || payload.salePrice >= payload.price!)) return Response.json({ error: "Sale price must be lower than the regular price." }, { status: 400 });
  const db = getDb(); const [current] = await db.select({ id: productVariants.id, productId: products.id, imageUrl: productVariants.imageUrl, attributes: productVariants.attributes, productPrice: products.price, productSalePrice: products.salePrice }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(and(eq(productVariants.id, payload.id!), eq(products.merchantId, access.merchantId))).limit(1); if (!current) return Response.json({ error: "Variant not found." }, { status: 404 });
  const imageUrl = payload.imageUrl === undefined ? current.imageUrl : payload.imageUrl?.trim() || null;
  if (imageUrl?.startsWith("r2://") && !imageUrl.slice(5).startsWith(`merchants/${access.merchantId}/products/${current.productId}/variants/`)) return Response.json({ error: "Invalid variant image." }, { status: 403 });
  const attributes = { ...((current.attributes as Record<string, unknown> | null) ?? {}), priceMode: payload.usesProductPrice === true || (payload.usesProductPrice === undefined && payload.price === current.productPrice) ? "product" : "custom", salePriceMode: payload.usesProductSalePrice === true || (payload.usesProductSalePrice === undefined && (payload.salePrice ?? null) === current.productSalePrice) ? "product" : "custom" };
  const [variant] = await db.update(productVariants).set({ title: payload.title.trim(), size: payload.size?.trim() || null, color: payload.color?.trim() || null, price: payload.price!, salePrice: payload.salePrice ?? null, status: payload.status!, imageUrl, attributes }).where(eq(productVariants.id, current.id)).returning();
  const [branch] = await db.select().from(storeBranches).where(eq(storeBranches.merchantId, access.merchantId)).limit(1); if (branch && Number.isInteger(payload.onHand) && Number.isInteger(payload.safetyStock)) await db.insert(variantInventory).values({ variantId: variant.id, branchId: branch.id, onHand: Math.max(0, payload.onHand!), reserved: 0, safetyStock: Math.max(0, payload.safetyStock!) }).onConflictDoUpdate({ target: [variantInventory.variantId, variantInventory.branchId], set: { onHand: Math.max(0, payload.onHand!), safetyStock: Math.max(0, payload.safetyStock!), updatedAt: new Date() } });
  await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "product_variant.updated", resourceType: "product_variant", resourceId: String(variant.id), metadata: { status: variant.status } }); return Response.json({ variant });
}
