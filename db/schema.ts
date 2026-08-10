import { boolean, doublePrecision, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 320 }).notNull(),
  displayName: varchar("display_name", { length: 160 }).notNull(),
  passwordHash: text("password_hash"),
  emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
  platformRole: varchar("platform_role", { length: 32 }).notNull().default("customer"),
  status: varchar("status", { length: 32 }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("idx_users_email").on(table.email)]);

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("idx_sessions_token_hash").on(table.tokenHash), index("idx_sessions_user").on(table.userId)]);

export const merchants = pgTable("merchants", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  slug: varchar("slug", { length: 200 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  status: varchar("status", { length: 32 }).notNull().default("pilot"),
  contactName: varchar("contact_name", { length: 160 }),
  contactEmail: varchar("contact_email", { length: 320 }),
  contactPhone: varchar("contact_phone", { length: 80 }),
  website: text("website"),
  pickupLocation: text("pickup_location"),
  deliveryMode: varchar("delivery_mode", { length: 40 }).notNull().default("merchant_managed"),
  setupStep: integer("setup_step").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("idx_merchants_slug").on(table.slug)]);

export const merchantApplications = pgTable("merchant_applications", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 32 }).notNull(),
  status: varchar("status", { length: 40 }).notNull().default("submitted"),
  legalName: varchar("legal_name", { length: 200 }).notNull(),
  tradingName: varchar("trading_name", { length: 200 }).notNull(),
  registrationNumber: varchar("registration_number", { length: 120 }).notNull(),
  businessType: varchar("business_type", { length: 80 }).notNull(),
  category: varchar("category", { length: 120 }).notNull(),
  description: text("description").notNull(),
  representativeName: varchar("representative_name", { length: 160 }).notNull(),
  representativeRole: varchar("representative_role", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 80 }).notNull(),
  physicalAddress: text("physical_address").notNull(),
  website: text("website"),
  socialProfiles: text("social_profiles"),
  branchCount: integer("branch_count").notNull().default(1),
  branchLocations: text("branch_locations").notNull(),
  productSummary: text("product_summary").notNull(),
  estimatedProductCount: integer("estimated_product_count").notNull().default(1),
  pickupAvailable: boolean("pickup_available").notNull().default(false),
  deliveryAvailable: boolean("delivery_available").notNull().default(false),
  deliveryDetails: text("delivery_details"),
  returnsPolicy: text("returns_policy").notNull(),
  termsAccepted: boolean("terms_accepted").notNull().default(false),
  privacyAccepted: boolean("privacy_accepted").notNull().default(false),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewedBy: integer("reviewed_by").references(() => users.id),
  reviewNotes: text("review_notes"),
  merchantId: integer("merchant_id").references(() => merchants.id),
}, (table) => [uniqueIndex("idx_applications_reference").on(table.reference), index("idx_applications_status").on(table.status), index("idx_applications_email").on(table.email)]);

export const applicationDocuments = pgTable("application_documents", {
  id: serial("id").primaryKey(), applicationId: integer("application_id").notNull().references(() => merchantApplications.id, { onDelete: "cascade" }),
  documentType: varchar("document_type", { length: 80 }).notNull(), storageKey: text("storage_key"), originalName: text("original_name"), mimeType: varchar("mime_type", { length: 120 }), sizeBytes: integer("size_bytes"), status: varchar("status", { length: 32 }).notNull().default("pending_upload"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("idx_application_document_type").on(table.applicationId, table.documentType)]);

export const merchantMemberships = pgTable("merchant_memberships", {
  id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id), userRef: text("user_ref").notNull(), email: varchar("email", { length: 320 }).notNull(), displayName: varchar("display_name", { length: 160 }).notNull(), role: varchar("role", { length: 32 }).notNull().default("staff"), status: varchar("status", { length: 32 }).notNull().default("active"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("idx_membership_merchant_user").on(table.merchantId, table.userRef), index("idx_membership_user").on(table.userRef)]);

export const merchantInvitations = pgTable("merchant_invitations", {
  id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id), codeHash: text("code_hash").notNull(), role: varchar("role", { length: 32 }).notNull().default("staff"), invitedEmail: varchar("invited_email", { length: 320 }), expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), acceptedAt: timestamp("accepted_at", { withTimezone: true }), createdBy: text("created_by").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("idx_invitation_code_hash").on(table.codeHash), index("idx_invitation_merchant").on(table.merchantId)]);

export const products = pgTable("products", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id), sku: varchar("sku", { length: 100 }).notNull(), name: varchar("name", { length: 220 }).notNull(), collection: varchar("collection", { length: 160 }), description: text("description").notNull().default(""), price: doublePrecision("price"), status: varchar("status", { length: 32 }).notNull().default("draft"), imageUrl: text("image_url"), badge: varchar("badge", { length: 120 }) }, (table) => [uniqueIndex("idx_products_merchant_sku").on(table.merchantId, table.sku)]);
export const inventory = pgTable("inventory", { id: serial("id").primaryKey(), productId: integer("product_id").notNull().references(() => products.id), branch: varchar("branch", { length: 200 }).notNull(), onHand: integer("on_hand"), reserved: integer("reserved").notNull().default(0), safetyStock: integer("safety_stock").notNull().default(0) }, (table) => [uniqueIndex("idx_inventory_product_branch").on(table.productId, table.branch)]);
export const orders = pgTable("orders", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id), customerRef: text("customer_ref").notNull(), status: varchar("status", { length: 48 }).notNull().default("draft"), paymentMethod: varchar("payment_method", { length: 60 }), fulfillmentMethod: varchar("fulfillment_method", { length: 60 }), total: doublePrecision("total").notNull().default(0), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_orders_merchant_status").on(table.merchantId, table.status), index("idx_orders_customer_ref").on(table.customerRef)]);
export const orderItems = pgTable("order_items", { id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id), productId: integer("product_id").notNull().references(() => products.id), skuSnapshot: varchar("sku_snapshot", { length: 100 }).notNull(), nameSnapshot: varchar("name_snapshot", { length: 220 }).notNull(), unitPrice: doublePrecision("unit_price").notNull(), quantity: integer("quantity").notNull().default(1) }, (table) => [index("idx_order_items_order_id").on(table.orderId)]);
export const auditEvents = pgTable("audit_events", { id: serial("id").primaryKey(), actorRef: text("actor_ref").notNull(), action: varchar("action", { length: 120 }).notNull(), resourceType: varchar("resource_type", { length: 80 }).notNull(), resourceId: text("resource_id").notNull(), metadata: jsonb("metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_audit_resource").on(table.resourceType, table.resourceId)]);
