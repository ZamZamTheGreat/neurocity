import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditEvents, productVariants, products, storeBranches, variantInventory } from "../../../../../db/schema";
import { isMerchantCategory } from "../../../../../lib/merchant-categories";
import { requirePilotMerchant } from "../../auth";

type ImportRow = { name?: unknown; sku?: unknown; category?: unknown; description?: unknown; price?: unknown; salePrice?: unknown; brand?: unknown; collection?: unknown; variantSku?: unknown; variantTitle?: unknown; size?: unknown; color?: unknown; variantPrice?: unknown; variantSalePrice?: unknown; stock?: unknown };
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json().catch(() => null) as { rows?: ImportRow[] } | null;
  if (!Array.isArray(payload?.rows) || payload.rows.length < 1 || payload.rows.length > 250) return Response.json({ error: "Choose a CSV containing between 1 and 250 products." }, { status: 400 });
  const parsed = payload.rows.map((row, index) => {
    const name = clean(row.name), sku = clean(row.sku).toUpperCase(), category = clean(row.category), description = clean(row.description);
    const price = Number(row.price), salePrice = clean(row.salePrice) ? Number(row.salePrice) : null, stock = clean(row.stock) ? Number(row.stock) : 0;
    const variantSku = clean(row.variantSku).toUpperCase(), variantTitle = clean(row.variantTitle) || "Standard";
    const variantPrice = clean(row.variantPrice) ? Number(row.variantPrice) : price;
    const variantSalePrice = clean(row.variantSalePrice) ? Number(row.variantSalePrice) : salePrice;
    const errors = [!name && "name", !sku && "sku", !isMerchantCategory(category) && "category", !description && "description", (!Number.isFinite(price) || price < 0) && "price", (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) && "sale_price", (!Number.isFinite(variantPrice) || variantPrice < 0) && "variant_price", (variantSalePrice !== null && (!Number.isFinite(variantSalePrice) || variantSalePrice < 0 || variantSalePrice >= variantPrice)) && "variant_sale_price", (!Number.isInteger(stock) || stock < 0) && "stock"].filter(Boolean);
    return { row: index + 2, name, sku, category, description, price, salePrice, stock, brand: clean(row.brand) || null, collection: clean(row.collection) || null, variantSku, variantTitle, size: clean(row.size) || null, color: clean(row.color) || null, variantPrice, variantSalePrice, errors };
  });
  for (const row of parsed) if (!row.variantSku) row.variantSku = `M${access.merchantId}-${row.sku}-DEFAULT`;
  const invalid = parsed.filter((row) => row.errors.length).map((row) => ({ row: row.row, fields: row.errors }));
  const duplicates = parsed.filter((row, index) => parsed.findIndex((candidate) => candidate.variantSku === row.variantSku) !== index).map((row) => row.row);
  const productConflicts = parsed.filter((row) => {
    const first = parsed.find((candidate) => candidate.sku === row.sku)!;
    return ["name", "category", "description", "price", "salePrice", "brand", "collection"].some((field) => row[field as keyof typeof row] !== first[field as keyof typeof first]);
  }).map((row) => row.row);
  if (productConflicts.length) return Response.json({ error: "Rows sharing a product SKU must use identical product details.", invalid: productConflicts.map((row) => ({ row, fields: ["product_fields"] })), duplicateRows: [] }, { status: 400 });
  if (invalid.length || duplicates.length) return Response.json({ error: "Fix the highlighted CSV rows before importing.", invalid, duplicateRows: duplicates }, { status: 400 });
  const db = getDb();
  const productRows = parsed.filter((row, index) => parsed.findIndex((candidate) => candidate.sku === row.sku) === index);
  const existing = await db.select({ sku: products.sku }).from(products).where(and(eq(products.merchantId, access.merchantId), inArray(products.sku, productRows.map((row) => row.sku))));
  if (existing.length) return Response.json({ error: `These SKUs already exist: ${existing.map((row) => row.sku).join(", ")}` }, { status: 409 });
  const existingVariants = await db.select({ sku: productVariants.sku }).from(productVariants).where(inArray(productVariants.sku, parsed.map((row) => row.variantSku)));
  if (existingVariants.length) return Response.json({ error: `These variant SKUs already exist: ${existingVariants.map((row) => row.sku).join(", ")}` }, { status: 409 });
  const imported = await db.transaction(async (tx) => {
    const [branch] = await tx.select({ id: storeBranches.id }).from(storeBranches).where(eq(storeBranches.merchantId, access.merchantId)).limit(1);
    const created = [];
    for (const row of productRows) {
      const [product] = await tx.insert(products).values({ merchantId: access.merchantId, itemType: "product", name: row.name, sku: row.sku, category: row.category, description: row.description, brand: row.brand, collection: row.collection, price: row.price, salePrice: row.salePrice, pricingModel: "fixed", status: "draft", availability: "available" }).returning();
      for (const option of parsed.filter((candidate) => candidate.sku === row.sku)) {
        const [variant] = await tx.insert(productVariants).values({ productId: product.id, sku: option.variantSku, title: option.variantTitle, size: option.size, color: option.color, attributes: { inventoryMode: "bulk_import" }, price: option.variantPrice, salePrice: option.variantSalePrice, status: "draft" }).returning({ id: productVariants.id });
        if (branch) await tx.insert(variantInventory).values({ variantId: variant.id, branchId: branch.id, onHand: option.stock, reserved: 0, safetyStock: 0 });
      }
      created.push(product);
    }
    await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: "catalogue.bulk_imported", resourceType: "merchant", resourceId: String(access.merchantId), metadata: { count: created.length, variantCount: parsed.length, skus: productRows.map((row) => row.sku) } });
    return created;
  });
  return Response.json({ imported: imported.length, variantsImported: parsed.length }, { status: 201 });
}
