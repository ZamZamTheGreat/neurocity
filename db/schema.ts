import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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
  description: text("description").notNull().default(""),
  price: real("price"),
  status: text("status").notNull().default("draft"),
  imageUrl: text("image_url"),
  badge: text("badge"),
}, (table) => [uniqueIndex("idx_products_merchant_sku").on(table.merchantId, table.sku)]);

export const inventory = sqliteTable("inventory", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  productId: integer("product_id").notNull().references(() => products.id),
  branch: text("branch").notNull(),
  onHand: integer("on_hand"),
  reserved: integer("reserved").notNull().default(0),
  safetyStock: integer("safety_stock").notNull().default(0),
}, (table) => [uniqueIndex("idx_inventory_product_branch").on(table.productId, table.branch)]);

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  merchantId: integer("merchant_id").notNull().references(() => merchants.id),
  customerRef: text("customer_ref").notNull(),
  status: text("status").notNull().default("draft"),
  paymentMethod: text("payment_method"),
  fulfillmentMethod: text("fulfillment_method"),
  total: real("total").notNull().default(0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [
  index("idx_orders_merchant_status").on(table.merchantId, table.status),
  index("idx_orders_customer_ref").on(table.customerRef),
]);

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  productId: integer("product_id").notNull().references(() => products.id),
  skuSnapshot: text("sku_snapshot").notNull(),
  nameSnapshot: text("name_snapshot").notNull(),
  unitPrice: real("unit_price").notNull(),
  quantity: integer("quantity").notNull().default(1),
}, (table) => [index("idx_order_items_order_id").on(table.orderId)]);

export const auditEvents = sqliteTable("audit_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  actorRef: text("actor_ref").notNull(),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
}, (table) => [index("idx_audit_resource").on(table.resourceType, table.resourceId)]);
