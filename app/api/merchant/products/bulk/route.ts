import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { auditEvents, productVariants, products, storeBranches, variantInventory } from "../../../../../db/schema";
import { isMerchantCategory } from "../../../../../lib/merchant-categories";
import { requirePilotMerchant } from "../../auth";

type ImportRow = { name?: unknown; sku?: unknown; category?: unknown; description?: unknown; price?: unknown; salePrice?: unknown; brand?: unknown; collection?: unknown; stock?: unknown };
const clean = (value: unknown) => typeof value === "string" ? value.trim() : "";

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const payload = await request.json().catch(() => null) as { rows?: ImportRow[] } | null;
  if (!Array.isArray(payload?.rows) || payload.rows.length < 1 || payload.rows.length > 250) return Response.json({ error: "Choose a CSV containing between 1 and 250 products." }, { status: 400 });
  const parsed = payload.rows.map((row, index) => {
    const name = clean(row.name), sku = clean(row.sku).toUpperCase(), category = clean(row.category), description = clean(row.description);
    const price = Number(row.price), salePrice = clean(row.salePrice) ? Number(row.salePrice) : null, stock = clean(row.stock) ? Number(row.stock) : 0;
    const errors = [!name && "name", !sku && "sku", !isMerchantCategory(category) && "category", !description && "description", (!Number.isFinite(price) || price < 0) && "price", (salePrice !== null && (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)) && "sale_price", (!Number.isInteger(stock) || stock < 0) && "stock"].filter(Boolean);
    return { row: index + 2, name, sku, category, description, price, salePrice, stock, brand: clean(row.brand) || null, collection: clean(row.collection) || null, errors };
  });
  const invalid = parsed.filter((row) => row.errors.length).map((row) => ({ row: row.row, fields: row.errors }));
  const duplicates = parsed.filter((row, index) => parsed.findIndex((candidate) => candidate.sku === row.sku) !== index).map((row) => row.row);
  if (invalid.length || duplicates.length) return Response.json({ error: "Fix the highlighted CSV rows before importing.", invalid, duplicateRows: duplicates }, { status: 400 });
  const db = getDb();
  const existing = await db.select({ sku: products.sku }).from(products).where(and(eq(products.merchantId, access.merchantId), inArray(products.sku, parsed.map((row) => row.sku))));
  if (existing.length) return Response.json({ error: `These SKUs already exist: ${existing.map((row) => row.sku).join(", ")}` }, { status: 409 });
  const imported = await db.transaction(async (tx) => {
    const [branch] = await tx.select({ id: storeBranches.id }).from(storeBranches).where(eq(storeBranches.merchantId, access.merchantId)).limit(1);
    const created = [];
    for (const row of parsed) {
      const [product] = await tx.insert(products).values({ merchantId: access.merchantId, itemType: "product", name: row.name, sku: row.sku, category: row.category, description: row.description, brand: row.brand, collection: row.collection, price: row.price, salePrice: row.salePrice, pricingModel: "fixed", status: "draft", availability: "available" }).returning();
      const [variant] = await tx.insert(productVariants).values({ productId: product.id, sku: `M${access.merchantId}-${row.sku}-DEFAULT`, title: "Standard", attributes: { inventoryMode: "bulk_import" }, price: row.price, salePrice: row.salePrice, status: "draft" }).returning({ id: productVariants.id });
      if (branch) await tx.insert(variantInventory).values({ variantId: variant.id, branchId: branch.id, onHand: row.stock, reserved: 0, safetyStock: 0 });
      created.push(product);
    }
    await tx.insert(auditEvents).values({ actorRef: access.user.userId, action: "catalogue.bulk_imported", resourceType: "merchant", resourceId: String(access.merchantId), metadata: { count: created.length, skus: parsed.map((row) => row.sku) } });
    return created;
  });
  return Response.json({ imported: imported.length }, { status: 201 });
}
