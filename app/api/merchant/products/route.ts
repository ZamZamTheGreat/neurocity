import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, orderItems, productVariants, products, serviceBookings, storeBranches, variantInventory } from "../../../../db/schema";
import { createPresignedR2Url } from "../../../../lib/r2";
import { requirePilotMerchant } from "../auth";

const statuses = new Set(["needs_confirmation", "draft", "published", "archived"]);
const availabilityValues = new Set(["available", "preorder", "out_of_stock", "unavailable"]);
const itemTypes = new Set(["product", "service"]);
const pricingModels = new Set(["fixed", "from", "quote"]);
const serviceModes = new Set(["at_business", "at_customer", "remote"]);
const text = (value: unknown, fallback = "") => typeof value === "string" ? value.trim() : fallback;
const optionalText = (value: unknown, fallback: string | null = null) => value === null ? null : typeof value === "string" ? value.trim() || null : fallback;
const optionList = (value: unknown) => Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))].slice(0, 20) : [];
const skuPart = (value: string) => value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 18) || "STD";

export async function GET() {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant authentication required." }, { status: 401 });
  const rows = await getDb().select().from(products).where(eq(products.merchantId, access.merchantId)).orderBy(asc(products.id));
  return Response.json({ products: rows.map((product) => { const stored = (product.imageUrls as string[] | null) ?? (product.imageUrl ? [product.imageUrl] : []); return { ...product, storageImageUrl: product.imageUrl, storageImageUrls: stored, imageUrls: stored.map((url, slot) => url.startsWith("r2://") ? `/api/merchant/products/media?productId=${product.id}&slot=${slot}` : url), imageUrl: stored[0]?.startsWith("r2://") ? `/api/merchant/products/media?productId=${product.id}&slot=0` : stored[0] ?? product.imageUrl }; }) });
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
    const itemType = text(payload.itemType, "product");
    const pricingModel = text(payload.pricingModel, "fixed");
    const durationMinutes = payload.durationMinutes === null || payload.durationMinutes === undefined || payload.durationMinutes === "" ? null : Number(payload.durationMinutes);
    const serviceMode = itemType === "service" ? text(payload.serviceMode, "at_business") : null;
    const bookingRequired = itemType === "service" && payload.bookingRequired !== false;
    const price = payload.price === null || payload.price === undefined ? null : Number(payload.price);
    const salePrice = payload.salePrice === null || payload.salePrice === undefined || payload.salePrice === "" ? null : Number(payload.salePrice);
    const colours = itemType === "product" ? optionList(payload.colours) : [];
    const sizes = itemType === "product" ? optionList(payload.sizes) : [];
    const combinations = Math.max(1, colours.length) * Math.max(1, sizes.length);
    if (!itemTypes.has(itemType) || !pricingModels.has(pricingModel) || (serviceMode && !serviceModes.has(serviceMode))) return Response.json({ error: "Choose valid catalogue and service settings." }, { status: 400 });
    if (!name || !sku || !category || !description || (pricingModel !== "quote" && price === null)) return Response.json({ error: "Name, reference, category, description and price are required unless pricing is by quote." }, { status: 400 });
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 10080)) return Response.json({ error: "Service duration must be between 5 minutes and 7 days." }, { status: 400 });
    if (price !== null && (!Number.isFinite(price) || price < 0)) return Response.json({ error: "Price must be a valid non-negative amount." }, { status: 400 });
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || price === null || salePrice >= price)) return Response.json({ error: "Sale price must be lower than the regular price." }, { status: 400 });
    if (combinations > 100) return Response.json({ error: "Choose no more than 100 option combinations per product." }, { status: 400 });
    const db = getDb();
    const [duplicate] = await db.select({ id: products.id }).from(products).where(and(eq(products.merchantId, access.merchantId), eq(products.sku, sku))).limit(1);
    if (duplicate) return Response.json({ error: "That SKU is already used in your catalogue." }, { status: 409 });
    const created = await db.transaction(async (tx) => {
      const [product] = await tx.insert(products).values({ merchantId: access.merchantId, itemType, name, sku, category, brand, collection, description, price, salePrice, pricingModel, durationMinutes, serviceMode, bookingRequired, badge, status: "draft", availability: "available" }).returning();
      if (itemType === "product" && price !== null) {
        const colourOptions: (string | null)[] = colours.length ? colours : [null];
        const sizeOptions: (string | null)[] = sizes.length ? sizes : [null];
        const rows = colourOptions.flatMap((color) => sizeOptions.map((size, index) => ({ productId: product.id, sku: `M${access.merchantId}-${sku}-${skuPart(size ?? "")}-${skuPart(color ?? "")}-${index + 1}`, title: [size, color].filter(Boolean).join(" / ") || "Standard", size, color, attributes: { inventoryMode: "generated", priceMode: "product", salePriceMode: "product" }, price, salePrice, status: "draft", imageUrl: product.imageUrl })));
        const generated = await tx.insert(productVariants).values(rows).returning({ id: productVariants.id });
        const [branch] = await tx.select({ id: storeBranches.id }).from(storeBranches).where(eq(storeBranches.merchantId, access.merchantId)).limit(1);
        if (branch && generated.length) await tx.insert(variantInventory).values(generated.map((variant) => ({ variantId: variant.id, branchId: branch.id, onHand: 0, reserved: 0, safetyStock: 0 })));
      }
      await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.created", resourceType: "product", resourceId: String(product.id), metadata: JSON.stringify({ name, sku, generatedVariants: itemType === "product" ? combinations : 0 }), createdAt: new Date() });
      return product;
    });
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
    const imageUrls = payload.imageUrls === undefined ? current.imageUrls : Array.isArray(payload.imageUrls) ? payload.imageUrls.filter((value): value is string => typeof value === "string" && value.length > 0).slice(0, 3) : current.imageUrls;
    const itemType = text(payload.itemType, current.itemType);
    const pricingModel = text(payload.pricingModel, current.pricingModel);
    const durationMinutes = payload.durationMinutes === undefined ? current.durationMinutes : payload.durationMinutes === null || payload.durationMinutes === "" ? null : Number(payload.durationMinutes);
    const serviceMode = itemType === "service" ? text(payload.serviceMode, current.serviceMode ?? "at_business") : null;
    const bookingRequired = itemType === "service" && (payload.bookingRequired === undefined ? current.bookingRequired : payload.bookingRequired === true);
    if (!name || !sku) return Response.json({ error: "Product name and SKU are required." }, { status: 400 });
    if (!itemTypes.has(itemType) || !pricingModels.has(pricingModel) || (serviceMode && !serviceModes.has(serviceMode))) return Response.json({ error: "Choose valid catalogue and service settings." }, { status: 400 });
    if (durationMinutes !== null && (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 10080)) return Response.json({ error: "Service duration must be between 5 minutes and 7 days." }, { status: 400 });
    if (!statuses.has(status) || !availabilityValues.has(availability)) return Response.json({ error: "Invalid product status or availability." }, { status: 400 });
    if (price !== null && (!Number.isFinite(price) || price < 0)) return Response.json({ error: "Price must be a valid non-negative amount." }, { status: 400 });
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || price === null || salePrice >= price)) return Response.json({ error: "Sale price must be lower than the regular price." }, { status: 400 });
    const [duplicate] = await db.select({ id: products.id }).from(products).where(and(eq(products.merchantId, access.merchantId), eq(products.sku, sku))).limit(1);
    if (duplicate && duplicate.id !== current.id) return Response.json({ error: "That SKU is already used in your catalogue." }, { status: 409 });
    if (status === "published" && (!payload.merchantConfirmed || (pricingModel !== "quote" && price === null) || !description || !category || !imageUrl)) return Response.json({ error: "Publishing requires confirmation, pricing, category, description and an image." }, { status: 409 });
    if (imageUrl?.startsWith("r2://") && !imageUrl.slice(5).startsWith(`merchants/${access.merchantId}/products/${current.id}/`)) return Response.json({ error: "Invalid product image." }, { status: 403 });
    if ((imageUrls as string[]).some((url) => url.startsWith("r2://") && !url.slice(5).startsWith(`merchants/${access.merchantId}/products/${current.id}/`))) return Response.json({ error: "Invalid product gallery image." }, { status: 403 });

    const existingVariants = await db.select().from(productVariants).where(eq(productVariants.productId, current.id));
    const inheritedValues = existingVariants.map((variant) => {
      const attributes = (variant.attributes as Record<string, unknown> | null) ?? {};
      const inheritsPrice = attributes.priceMode === "product" || (attributes.priceMode === undefined && variant.price === current.price);
      const inheritsSalePrice = attributes.salePriceMode === "product" || (attributes.salePriceMode === undefined && variant.salePrice === current.salePrice);
      const nextPrice = inheritsPrice && price !== null ? price : variant.price;
      const nextSalePrice = inheritsSalePrice ? salePrice : variant.salePrice;
      return { variant, attributes, inheritsPrice, inheritsSalePrice, nextPrice, nextSalePrice };
    });
    if (inheritedValues.some(({ nextPrice, nextSalePrice }) => nextSalePrice !== null && nextSalePrice >= nextPrice)) return Response.json({ error: "The new product price conflicts with a custom option-group sale price. Update that option group first." }, { status: 409 });
    const updated = await db.transaction(async (tx) => {
      const [saved] = await tx.update(products).set({ itemType, name, sku, collection, category, brand, description, price, salePrice, pricingModel, durationMinutes, serviceMode, bookingRequired, status, availability, imageUrl: (imageUrls as string[])[0] ?? imageUrl, imageUrls, badge }).where(and(eq(products.id, current.id), eq(products.merchantId, access.merchantId))).returning();
      if (itemType === "product" && price !== null && existingVariants.length === 0) {
        await tx.insert(productVariants).values({ productId: current.id, sku: `M${access.merchantId}-${sku}-DEFAULT`, title: "Standard", attributes: { inventoryMode: "merchant_confirmed", priceMode: "product", salePriceMode: "product" }, price, salePrice, status: status === "published" ? "active" : "draft", imageUrl });
      } else {
        if (itemType === "product" && status === "published" && current.status !== "published") {
          await tx.update(productVariants).set({ status: "active" }).where(and(eq(productVariants.productId, current.id), inArray(productVariants.status, ["draft", "needs_confirmation"])));
        }
        for (const inherited of inheritedValues) {
          const defaultVariant = existingVariants.length === 1 && inherited.attributes.inventoryMode === "merchant_confirmed";
          if (!inherited.inheritsPrice && !inherited.inheritsSalePrice && !defaultVariant) continue;
          await tx.update(productVariants).set({
            ...(inherited.inheritsPrice ? { price: inherited.nextPrice, attributes: { ...inherited.attributes, priceMode: "product", ...(inherited.inheritsSalePrice ? { salePriceMode: "product" } : {}) } } : inherited.inheritsSalePrice ? { attributes: { ...inherited.attributes, salePriceMode: "product" } } : {}),
            ...(inherited.inheritsSalePrice ? { salePrice: inherited.nextSalePrice } : {}),
            ...(defaultVariant ? { sku: `M${access.merchantId}-${sku}-DEFAULT`, status: status === "published" ? "active" : status === "archived" ? "archived" : "draft", imageUrl } : {}),
          }).where(eq(productVariants.id, inherited.variant.id));
        }
      }
      await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.updated", resourceType: "product", resourceId: String(current.id), metadata: JSON.stringify({ before: current, after: saved }), createdAt: new Date() });
      return saved;
    });
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
  const permanent = new URL(request.url).searchParams.get("permanent") === "true";
  if (permanent) {
    const [[ordered], [booked]] = await Promise.all([
      db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, id)).limit(1),
      db.select({ id: serviceBookings.id }).from(serviceBookings).where(eq(serviceBookings.productId, id)).limit(1),
    ]);
    if (ordered || booked) return Response.json({ error: `This ${current.itemType} has order or booking history and cannot be permanently deleted. Archive it instead.` }, { status: 409 });
    await db.transaction(async (tx) => {
      await tx.delete(products).where(and(eq(products.id, id), eq(products.merchantId, access.merchantId)));
      await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.deleted", resourceType: "product", resourceId: String(id), metadata: JSON.stringify({ name: current.name, sku: current.sku }), createdAt: new Date() });
    });
    const mediaKeys = [...new Set([current.imageUrl, ...((current.imageUrls as string[] | null) ?? [])].filter((value): value is string => typeof value === "string" && value.startsWith("r2://")).map((value) => value.slice(5)))];
    await Promise.allSettled(mediaKeys.map((key) => fetch(createPresignedR2Url("DELETE", key, 300), { method: "DELETE" })));
    return Response.json({ deleted: true });
  }
  const [product] = await db.update(products).set({ status: "archived", availability: "unavailable" }).where(and(eq(products.id, id), eq(products.merchantId, access.merchantId))).returning();
  await db.insert(auditEvents).values({ actorRef: access.user.userId, action: "product.archived", resourceType: "product", resourceId: String(id), metadata: JSON.stringify({ name: current.name, sku: current.sku }), createdAt: new Date() });
  return Response.json({ product });
}
