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

export const customerCompanionProfiles = pgTable("customer_companion_profiles", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  companionName: varchar("companion_name", { length: 40 }).notNull().default("James"),
  memoryEnabled: boolean("memory_enabled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("idx_companion_profile_user").on(table.userId)]);

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
  tagline: varchar("tagline", { length: 240 }),
  description: text("description"),
  logoUrl: text("logo_url"),
  bannerUrl: text("banner_url"),
  primaryCategory: varchar("primary_category", { length: 120 }),
  policies: jsonb("policies").notNull().default({}),
  contactOptions: jsonb("contact_options").notNull().default({}),
  fulfillmentMethods: jsonb("fulfillment_methods").notNull().default([]),
  paymentSettings: jsonb("payment_settings").notNull().default({}),
  isPublic: boolean("is_public").notNull().default(false),
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

export const products = pgTable("products", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id), sku: varchar("sku", { length: 100 }).notNull(), name: varchar("name", { length: 220 }).notNull(), collection: varchar("collection", { length: 160 }), category: varchar("category", { length: 160 }), brand: varchar("brand", { length: 160 }), description: text("description").notNull().default(""), price: doublePrecision("price"), salePrice: doublePrecision("sale_price"), status: varchar("status", { length: 32 }).notNull().default("draft"), availability: varchar("availability", { length: 32 }).notNull().default("available"), imageUrl: text("image_url"), badge: varchar("badge", { length: 120 }) }, (table) => [uniqueIndex("idx_products_merchant_sku").on(table.merchantId, table.sku)]);
export const storeBranches = pgTable("store_branches", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }), name: varchar("name", { length: 180 }).notNull(), address: text("address").notNull(), city: varchar("city", { length: 120 }).notNull().default("Windhoek"), phone: varchar("phone", { length: 80 }), pickupEnabled: boolean("pickup_enabled").notNull().default(false), deliveryEnabled: boolean("delivery_enabled").notNull().default(false), isPrimary: boolean("is_primary").notNull().default(false) }, (table) => [index("idx_store_branches_merchant").on(table.merchantId)]);
export const merchantDeliveryZones = pgTable("merchant_delivery_zones", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }), area: varchar("area", { length: 160 }).notNull(), fee: doublePrecision("fee").notNull().default(0), estimatedTime: varchar("estimated_time", { length: 120 }).notNull(), active: boolean("active").notNull().default(true), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("idx_delivery_zones_merchant_area").on(table.merchantId, table.area), index("idx_delivery_zones_merchant_active").on(table.merchantId, table.active)]);
export const storeHours = pgTable("store_hours", { id: serial("id").primaryKey(), branchId: integer("branch_id").notNull().references(() => storeBranches.id, { onDelete: "cascade" }), dayOfWeek: integer("day_of_week").notNull(), opensAt: varchar("opens_at", { length: 8 }), closesAt: varchar("closes_at", { length: 8 }), closed: boolean("closed").notNull().default(false) }, (table) => [uniqueIndex("idx_store_hours_branch_day").on(table.branchId, table.dayOfWeek)]);
export const storePromotions = pgTable("store_promotions", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }), title: varchar("title", { length: 180 }).notNull(), description: text("description"), startsAt: timestamp("starts_at", { withTimezone: true }), endsAt: timestamp("ends_at", { withTimezone: true }), status: varchar("status", { length: 32 }).notNull().default("draft") }, (table) => [index("idx_store_promotions_merchant").on(table.merchantId)]);
export const productVariants = pgTable("product_variants", { id: serial("id").primaryKey(), productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), sku: varchar("sku", { length: 120 }).notNull(), title: varchar("title", { length: 180 }).notNull(), size: varchar("size", { length: 80 }), color: varchar("color", { length: 80 }), attributes: jsonb("attributes").notNull().default({}), price: doublePrecision("price").notNull(), salePrice: doublePrecision("sale_price"), status: varchar("status", { length: 32 }).notNull().default("active"), imageUrl: text("image_url"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("idx_product_variants_sku").on(table.sku), index("idx_product_variants_product").on(table.productId)]);
export const variantInventory = pgTable("variant_inventory", { id: serial("id").primaryKey(), variantId: integer("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }), branchId: integer("branch_id").notNull().references(() => storeBranches.id, { onDelete: "cascade" }), onHand: integer("on_hand").notNull().default(0), reserved: integer("reserved").notNull().default(0), safetyStock: integer("safety_stock").notNull().default(0), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("idx_variant_inventory_variant_branch").on(table.variantId, table.branchId)]);
export const customerAddresses = pgTable("customer_addresses", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), label: varchar("label", { length: 80 }).notNull(), recipientName: varchar("recipient_name", { length: 160 }).notNull(), phone: varchar("phone", { length: 80 }).notNull(), addressLine1: text("address_line_1").notNull(), addressLine2: text("address_line_2"), suburb: varchar("suburb", { length: 160 }), city: varchar("city", { length: 120 }).notNull().default("Windhoek"), deliveryNotes: text("delivery_notes"), isDefault: boolean("is_default").notNull().default(false), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_customer_addresses_user").on(table.userId)]);
export const customerWishlists = pgTable("customer_wishlists", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("idx_customer_wishlist_user_product").on(table.userId, table.productId)]);
export const customerSavedStores = pgTable("customer_saved_stores", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), merchantId: integer("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("idx_customer_saved_store").on(table.userId, table.merchantId)]);
export const customerCartItems = pgTable("customer_cart_items", { id: serial("id").primaryKey(), userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), variantId: integer("variant_id").notNull().references(() => productVariants.id, { onDelete: "cascade" }), quantity: integer("quantity").notNull().default(1), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("idx_customer_cart_user_variant").on(table.userId, table.variantId)]);
export const storeConversations = pgTable("store_conversations", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id, { onDelete: "cascade" }), customerId: integer("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }), productId: integer("product_id").references(() => products.id, { onDelete: "set null" }), orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }), subject: varchar("subject", { length: 240 }).notNull(), status: varchar("status", { length: 32 }).notNull().default("open"), assignedMembershipId: integer("assigned_membership_id").references(() => merchantMemberships.id, { onDelete: "set null" }), source: varchar("source", { length: 32 }).notNull().default("neurocity"), lastMessageAt: timestamp("last_message_at", { withTimezone: true }).notNull().defaultNow(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_store_conversations_merchant_status").on(table.merchantId, table.status), index("idx_store_conversations_customer").on(table.customerId)]);
export const conversationMessages = pgTable("conversation_messages", { id: serial("id").primaryKey(), conversationId: integer("conversation_id").notNull().references(() => storeConversations.id, { onDelete: "cascade" }), senderUserId: integer("sender_user_id").notNull().references(() => users.id, { onDelete: "cascade" }), senderRole: varchar("sender_role", { length: 24 }).notNull(), body: text("body").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_conversation_messages_conversation").on(table.conversationId, table.createdAt)]);
export const inventory = pgTable("inventory", { id: serial("id").primaryKey(), productId: integer("product_id").notNull().references(() => products.id), branch: varchar("branch", { length: 200 }).notNull(), onHand: integer("on_hand"), reserved: integer("reserved").notNull().default(0), safetyStock: integer("safety_stock").notNull().default(0) }, (table) => [uniqueIndex("idx_inventory_product_branch").on(table.productId, table.branch)]);
export const orders = pgTable("orders", { id: serial("id").primaryKey(), merchantId: integer("merchant_id").notNull().references(() => merchants.id), customerRef: text("customer_ref").notNull(), customerName: varchar("customer_name", { length: 160 }), customerEmail: varchar("customer_email", { length: 320 }), customerPhone: varchar("customer_phone", { length: 80 }), status: varchar("status", { length: 48 }).notNull().default("draft"), paymentStatus: varchar("payment_status", { length: 32 }).notNull().default("pending"), paymentMethod: varchar("payment_method", { length: 60 }), paymentInstructions: jsonb("payment_instructions"), fulfillmentMethod: varchar("fulfillment_method", { length: 60 }), addressSnapshot: jsonb("address_snapshot"), customerNotes: text("customer_notes"), subtotal: doublePrecision("subtotal").notNull().default(0), deliveryFee: doublePrecision("delivery_fee").notNull().default(0), total: doublePrecision("total").notNull().default(0), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_orders_merchant_status").on(table.merchantId, table.status), index("idx_orders_customer_ref").on(table.customerRef), index("idx_orders_payment_status").on(table.paymentStatus)]);
export const orderItems = pgTable("order_items", { id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id), productId: integer("product_id").notNull().references(() => products.id), variantId: integer("variant_id").references(() => productVariants.id, { onDelete: "set null" }), skuSnapshot: varchar("sku_snapshot", { length: 120 }).notNull(), nameSnapshot: varchar("name_snapshot", { length: 220 }).notNull(), variantSnapshot: varchar("variant_snapshot", { length: 180 }), sizeSnapshot: varchar("size_snapshot", { length: 80 }), colorSnapshot: varchar("color_snapshot", { length: 80 }), unitPrice: doublePrecision("unit_price").notNull(), quantity: integer("quantity").notNull().default(1), lineTotal: doublePrecision("line_total").notNull().default(0) }, (table) => [index("idx_order_items_order_id").on(table.orderId), index("idx_order_items_variant").on(table.variantId)]);
export const orderStatusEvents = pgTable("order_status_events", { id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), status: varchar("status", { length: 48 }).notNull(), actorRef: text("actor_ref").notNull(), note: text("note"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_order_status_events_order").on(table.orderId, table.createdAt)]);
export const orderIssues = pgTable("order_issues", { id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), customerRef: text("customer_ref").notNull(), category: varchar("category", { length: 80 }).notNull(), description: text("description").notNull(), status: varchar("status", { length: 32 }).notNull().default("open"), resolution: text("resolution"), resolvedBy: text("resolved_by"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), resolvedAt: timestamp("resolved_at", { withTimezone: true }) }, (table) => [index("idx_order_issues_order").on(table.orderId), index("idx_order_issues_status").on(table.status)]);
export const paymentProofs = pgTable("payment_proofs", { id: serial("id").primaryKey(), orderId: integer("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }), storageKey: text("storage_key").notNull(), originalName: text("original_name").notNull(), mimeType: varchar("mime_type", { length: 120 }).notNull(), sizeBytes: integer("size_bytes").notNull(), status: varchar("status", { length: 32 }).notNull().default("upload_pending"), reviewNote: text("review_note"), reviewedBy: text("reviewed_by"), reviewedAt: timestamp("reviewed_at", { withTimezone: true }), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [uniqueIndex("idx_payment_proofs_order").on(table.orderId), index("idx_payment_proofs_status").on(table.status)]);
export const auditEvents = pgTable("audit_events", { id: serial("id").primaryKey(), actorRef: text("actor_ref").notNull(), action: varchar("action", { length: 120 }).notNull(), resourceType: varchar("resource_type", { length: 80 }).notNull(), resourceId: text("resource_id").notNull(), metadata: jsonb("metadata").notNull().default({}), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow() }, (table) => [index("idx_audit_resource").on(table.resourceType, table.resourceId)]);
