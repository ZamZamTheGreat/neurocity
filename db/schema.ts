import { integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const merchants = sqliteTable("merchants", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().default("pilot"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [uniqueIndex("idx_merchants_slug").on(table.slug)]);

export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchant_id").notNull().references(() => merchants.id),
  sku: text("sku").notNull(),
  name: text("name").notNull(),
  collection: text("collection"),
  price: real("price"),
  status: text("status").notNull().default("draft"),
  imageUrl: text("image_url"),
}, (table) => [uniqueIndex("idx_products_merchant_sku").on(table.merchantId, table.sku)]);

export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  branch: text("branch").notNull(),
  onHand: integer("on_hand"),
  reserved: integer("reserved").notNull().default(0),
  safetyStock: integer("safety_stock").notNull().default(0),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchant_id").notNull().references(() => merchants.id),
  customerRef: text("customer_ref").notNull(),
  status: text("status").notNull().default("draft"),
  paymentMethod: text("payment_method"),
  fulfillmentMethod: text("fulfillment_method"),
  total: real("total").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});
