"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { merchantCategories } from "../../lib/merchant-categories";
import ProductOptionsPanel from "./ProductOptionsPanel";
import ProductCreatePanel, { type NewProduct } from "./ProductCreatePanel";
import DeliveryZonesPanel, { type DeliveryZone } from "./DeliveryZonesPanel";
import PaymentSettingsPanel, {
  type MerchantSettlement,
  type PaymentSettings,
} from "./PaymentSettingsPanel";
import TurnstileChallenge from "./TurnstileChallenge";
import ImageCropper from "./ImageCropper";
import { whatsappNumber } from "../../lib/phone";
import { LatestRequestTracker } from "../../lib/latest-request";
import { ManagedImage } from "./ManagedImage";

type Tab =
  | "Overview"
  | "Setup"
  | "Inbox"
  | "Orders"
  | "Bookings"
  | "Products"
  | "Variants"
  | "Inventory";
const allResources = ["overview", "products", "inventory", "orders", "variants", "conversations", "delivery-zones", "payments", "service-bookings"] as const;
type Resource = typeof allResources[number];
const tabResources: Record<Tab, readonly Resource[]> = {
  Setup: ["payments", "delivery-zones"],
  Overview: ["overview", "inventory", "orders", "conversations"],
  Products: ["products", "variants"],
  Variants: ["products", "variants"],
  Inventory: ["inventory"],
  Orders: ["orders"],
  Inbox: ["conversations"],
  Bookings: ["service-bookings"],
};
type Product = {
  id: number;
  itemType: "product" | "service";
  commerceType: "apparel" | "general_retail" | "prepared_food" | "grocery" | "service_booking";
  commerceAttributes: Record<string, string | number | boolean | string[] | null>;
  name: string;
  sku: string;
  collection: string | null;
  category: string | null;
  brand: string | null;
  description: string;
  price: number | null;
  salePrice: number | null;
  pricingModel: "fixed" | "from" | "quote";
  durationMinutes: number | null;
  serviceMode: string | null;
  bookingRequired: boolean;
  status: string;
  availability: string;
  imageUrl: string | null;
  storageImageUrl: string | null;
  imageUrls: string[];
  storageImageUrls: string[];
  badge: string | null;
};
type Stock = {
  variantId: number;
  productId: number;
  productName: string;
  variantTitle: string;
  size: string | null;
  color: string | null;
  sku: string;
  variantStatus: string;
  branch: string;
  onHand: number;
  reserved: number;
  safetyStock: number;
  available: number;
};
type Order = {
  id: number;
  reference: string;
  status: string;
  paymentStatus: string;
  paymentProof?: {
    id: number;
    status: string;
    originalName: string;
    reviewNote: string | null;
  } | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  fulfillmentMethod: string;
  paymentMethod: string;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  addressSnapshot: Record<string, string | null> | null;
  customerNotes: string | null;
  createdAt: string;
  workflow: string;
  confirmationExpiresAt: string | null;
  paymentExpiresAt: string | null;
  allowedTransitions: string[];
  items: {
    id: number;
    nameSnapshot: string;
    variantSnapshot: string | null;
    sizeSnapshot: string | null;
    colorSnapshot: string | null;
    skuSnapshot: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  events: {
    id: number;
    status: string;
    note: string | null;
    createdAt: string;
  }[];
};
type Session = {
  authenticated: boolean;
  user?: { displayName: string; email: string };
  memberships: { role: string; merchantId: number }[];
  canBootstrap: boolean;
};
type Variant = {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  title: string;
  size: string | null;
  color: string | null;
  price: number;
  salePrice: number | null;
  usesProductPrice?: boolean;
  usesProductSalePrice?: boolean;
  status: string;
  imageUrl: string | null;
  storageImageUrl: string | null;
  stock: {
    branchName: string;
    onHand: number;
    reserved: number;
    safetyStock: number;
  }[];
};
type StoreHour = {
  dayOfWeek: number;
  opensAt: string | null;
  closesAt: string | null;
  closed: boolean;
};
type Merchant = {
  name: string;
  slug: string;
  category: string;
  enabledCategories: string[];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  pickupLocation: string | null;
  deliveryMode: string;
  setupStep: number;
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  isPublic: boolean;
  returnsPolicy: string;
  shippingPolicy: string;
  privacyPolicy: string;
  branchName: string;
  branchAddress: string;
  branchPhone: string;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  hours: StoreHour[];
  readiness: { percent: number; checks: { key: string; done: boolean }[] };
};
type Conversation = {
  id: number;
  customerName: string;
  customerEmail: string;
  productName: string | null;
  subject: string;
  status: string;
  assignedMembershipId: number | null;
  lastMessageAt: string;
  messages: {
    id: number;
    senderRole: string;
    senderName: string;
    body: string;
    createdAt: string;
  }[];
};
type ServiceBooking = {
  id: number;
  reference: string;
  status: string;
  requestedStart: string;
  scheduledStart: string | null;
  durationMinutes: number | null;
  serviceMode: string | null;
  priceSnapshot: number | null;
  pricingModel: string;
  customerNotes: string | null;
  merchantNote: string | null;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  allowedTransitions: string[];
};
const pretty = (value: string) => value.replaceAll("_", " ");
const money = (value: number | null) =>
  value === null ? "Not set" : `N$${value.toFixed(2)}`;
function parseCatalogueCsv(source: string) {
  const records: string[][] = [];
  let record: string[] = [], field = "", quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"' && quoted && source[index + 1] === '"') { field += '"'; index += 1; }
    else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) { record.push(field); field = ""; }
    else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      record.push(field); if (record.some((value) => value.trim())) records.push(record); record = []; field = "";
    } else field += character;
  }
  record.push(field); if (record.some((value) => value.trim())) records.push(record);
  const headers = (records.shift() ?? []).map((value) => value.trim().toLowerCase());
  const required = ["name", "sku", "category", "description", "price"];
  if (!required.every((header) => headers.includes(header))) throw new Error("Missing required columns");
  const apiFields: Record<string, string> = { commerce_type: "commerceType", sale_price: "salePrice", variant_sku: "variantSku", variant_title: "variantTitle", variant_price: "variantPrice", variant_sale_price: "variantSalePrice", stock_by_size: "stockBySize" };
  return records.map((values) => Object.fromEntries(headers.map((header, index) => [apiFields[header] ?? header, values[index]?.trim() ?? ""])));
}
const catalogueCsvHeaders = ["name", "sku", "category", "commerce_type", "description", "price", "sale_price", "brand", "collection", "variant_sku", "variant_title", "size", "sizes", "color", "variant_price", "variant_sale_price", "stock", "stock_by_size"] as const;
const csvCell = (value: unknown) => {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
function catalogueCsv(rows: Record<(typeof catalogueCsvHeaders)[number], unknown>[]) {
  return `\uFEFF${[catalogueCsvHeaders.join(","), ...rows.map((row) => catalogueCsvHeaders.map((header) => csvCell(row[header])).join(","))].join("\r\n")}\r\n`;
}
function downloadCatalogueCsv(filename: string, rows: Record<(typeof catalogueCsvHeaders)[number], unknown>[]) {
  const url = URL.createObjectURL(new Blob([catalogueCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
const dayNames = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
const tabIcons: Record<Tab, string> = {
  Overview: "⌂",
  Setup: "◇",
  Inbox: "✉",
  Orders: "▤",
  Bookings: "◷",
  Products: "□",
  Variants: "◆",
  Inventory: "▥",
};
const merchantNavGroups: { label: string; items: Tab[] }[] = [
  {
    label: "RUN YOUR STORE",
    items: ["Overview", "Inbox", "Orders", "Bookings"],
  },
  { label: "CATALOGUE", items: ["Products", "Inventory"] },
  { label: "STORE SETTINGS", items: ["Setup"] },
];
const tabGuidance: Record<Tab, string> = {
  Overview: "Your priorities, performance and store health at a glance.",
  Setup: "Manage your storefront identity, fulfilment, payments and team.",
  Inbox: "Answer customer questions and keep every conversation moving.",
  Orders: "Confirm, prepare and complete customer orders.",
  Bookings: "Confirm appointments, propose new times and complete services.",
  Products: "Create, publish and maintain your customer-facing catalogue.",
  Variants: "Manage the sizes, colours, prices and SKUs customers can select.",
  Inventory: "Keep stock accurate across every live product option.",
};
const defaultHours = dayNames.map((_, dayOfWeek) => ({
  dayOfWeek,
  opensAt: dayOfWeek === 0 ? null : "09:00",
  closesAt: dayOfWeek === 0 ? null : "17:00",
  closed: dayOfWeek === 0,
}));
type SetupResponse = { merchant: Merchant & { policies?: { returns?: string; shipping?: string; privacy?: string } }; branch?: { name?: string; address?: string; phone?: string; pickupEnabled?: boolean; deliveryEnabled?: boolean }; hours?: StoreHour[]; readiness?: Merchant["readiness"] };
function setupMerchant(data: SetupResponse): Merchant {
  const merchant = data.merchant;
  const branch = data.branch ?? {};
  const policies = merchant.policies ?? {};
  return {
    ...merchant,
    enabledCategories: [...new Set([merchant.category, ...(Array.isArray(merchant.enabledCategories) ? merchant.enabledCategories : [])])],
    returnsPolicy: policies.returns ?? "",
    shippingPolicy: policies.shipping ?? "",
    privacyPolicy: policies.privacy ?? "",
    branchName: branch.name ?? "Primary branch",
    branchAddress: branch.address ?? merchant.pickupLocation ?? "",
    branchPhone: branch.phone ?? merchant.contactPhone ?? "",
    pickupEnabled: branch.pickupEnabled ?? true,
    deliveryEnabled: branch.deliveryEnabled ?? false,
    hours: defaultHours.map(
      (fallback) =>
        data.hours?.find(
          (item: StoreHour) => item.dayOfWeek === fallback.dayOfWeek,
        ) ?? fallback,
    ),
    readiness: data.readiness ?? { percent: 0, checks: [] },
  };
}

export default function MerchantWorkspace({
  onPreview,
}: {
  onPreview: () => void;
}) {
  useEffect(() => {
    document.body.classList.add("merchant-workspace-open");
    return () => document.body.classList.remove("merchant-workspace-open");
  }, []);
  const [tab, setTab] = useState<Tab>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [menuOpen]);
  const [products, setProducts] = useState<Product[]>([]);
  const [stock, setStock] = useState<Stock[]>([]);
  const [inventorySearch, setInventorySearch] = useState("");
  const [variants, setVariants] = useState<Variant[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [bookings, setBookings] = useState<ServiceBooking[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deliveryZones, setDeliveryZones] = useState<DeliveryZone[]>([]);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    payOnCollectionEnabled: true,
    eftEnabled: false,
    bankName: "",
    accountHolder: "",
    accountType: "",
    accountNumber: "",
    branchCode: "",
    referenceInstructions:
      "Use your NeuroCity order reference as the payment reference.",
  });
  const [settlements, setSettlements] = useState<MerchantSettlement[]>([]);
  const [settlementSummary, setSettlementSummary] = useState({ pendingCustomerPayment: 0, scheduled: 0, dueNow: 0, processing: 0, awaitingSettlement: 0, settled: 0, refundAdjustment: 0, grossSales: 0 });
  const [stats, setStats] = useState({
    products: 0,
    publishedProducts: 0,
    orders: 0,
    readiness: 42,
  });
  const [message, setMessage] = useState("");
  const [setupSaving, setSetupSaving] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [claimCode, setClaimCode] = useState("");
  const [claimTurnstileToken, setClaimTurnstileToken] = useState<string | null>(null);
  const [claimTurnstileReset, setClaimTurnstileReset] = useState(0);
  const acceptClaimTurnstile = useCallback((token: string | null) => setClaimTurnstileToken(token), []);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const inventoryQuery = inventorySearch.trim().toLowerCase();
  const visibleStock = inventoryQuery ? stock.filter((row) => [row.productName, row.variantTitle, row.size, row.color, row.sku, row.branch, row.variantStatus].filter(Boolean).join(" ").toLowerCase().includes(inventoryQuery)) : stock;
  const inFlight = useRef(new Map<Resource, Promise<void>>());
  const requestVersions = useRef(new LatestRequestTracker<Resource>());
  const load = useCallback(async (resources: readonly Resource[] = allResources, fresh = false) => {
    await Promise.all(resources.map((resource) => {
      const existing = inFlight.current.get(resource);
      if (existing && !fresh) return existing;
      const version = requestVersions.current.begin(resource);
      const pending = (async () => {
        const response = await fetch(`/api/merchant/${resource}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Merchant workspace could not be loaded.");
        if (!requestVersions.current.isLatest(resource, version)) return;
        switch (resource) {
          case "overview": setStats(data); break;
          case "products": setProducts(data.products); break;
          case "inventory": setStock(data.inventory); break;
          case "orders": setOrders(data.orders); break;
          case "variants": setVariants(data.variants); break;
          case "conversations": setConversations(data.conversations); break;
          case "delivery-zones": setDeliveryZones(data.zones); break;
          case "service-bookings": setBookings(data.bookings ?? []); break;
          case "payments":
            setPaymentSettings(data.settings);
            setSettlements(data.settlements ?? []);
            setSettlementSummary(data.summary);
            break;
        }
      })().finally(() => {
        if (inFlight.current.get(resource) === pending) inFlight.current.delete(resource);
      });
      inFlight.current.set(resource, pending);
      return pending;
    }));
  }, []);
  const loadSession = useCallback(async () => {
    const response = await fetch("/api/merchant/session");
    const data = await response.json();
    setSession(data);
    if (response.ok && data.memberships?.length) {
      const setup = await fetch("/api/merchant/setup");
      if (setup.ok) {
        const setupData = await setup.json();
        const next = setupMerchant(setupData);
        setMerchant(next);
        setStats((current) => ({
          ...current,
          readiness: next.readiness.percent,
        }));
      }
    }
  }, []);
  useEffect(() => {
    loadSession().catch((error) => setMessage(error.message));
  }, [loadSession]);
  useEffect(() => {
    if (!session?.memberships?.length) return;
    const refresh = () => load(tabResources[tab]).catch((error: Error) => setMessage(error.message));
    void refresh();
    if (tab === "Setup" || tab === "Products") return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, 30000);
    return () => window.clearInterval(timer);
  }, [session, tab, load]);
  async function patch(url: string, body: object, success: string) {
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(success);
    await load(url.endsWith("/inventory") ? ["inventory", "variants"] : ["orders", "inventory", "overview"], true);
  }
  async function postAccess(url: string, body: object = {}) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage("Merchant workspace access confirmed.");
    await loadSession();
  }
  async function createInvite() {
    const response = await fetch("/api/merchant/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: "manager" }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setInviteCode(data.code);
    setMessage("Invitation created. Copy the one-time code now.");
  }
  async function saveSetup() {
    if (!merchant) return;
    setSetupSaving(true);
    try {
      const response = await fetch("/api/merchant/setup", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(merchant),
      });
      const data = await response.json();
      if (!response.ok) return setMessage(data.error);
      const next = setupMerchant(data);
      setMerchant(next);
      setStats((current) => ({ ...current, readiness: next.readiness.percent }));
      setMessage(merchant.isPublic ? "Storefront setup saved and published." : "Merchant setup saved as a draft.");
    } catch {
      setMessage("Your setup could not be saved. Check your connection and try again.");
    } finally {
      setSetupSaving(false);
    }
  }
  async function uploadMedia(type: "logo" | "banner", file?: File) {
    if (!merchant || !file) return false;
    setMessage(`Uploading ${type}…`);
    const response = await fetch("/api/merchant/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return false; }
    const upload = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!upload.ok) {
      setMessage(
        `${type === "logo" ? "Logo" : "Banner"} upload failed. Please try again.`,
      );
      return false;
    }
    setMerchant((current) => current ? {
      ...current,
      [type === "logo" ? "logoUrl" : "bannerUrl"]: data.storageValue,
    } : current);
    setMessage(
      `${type === "logo" ? "Logo" : "Banner"} uploaded. Save the storefront to publish this image.`,
    );
    return true;
  }
  async function saveVariant(variant: Variant) {
    const inventory = variant.stock[0];
    const response = await fetch("/api/merchant/variants", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: variant.id,
        title: variant.title,
        size: variant.size,
        color: variant.color,
        price: variant.price,
        salePrice: variant.salePrice,
        usesProductPrice: variant.usesProductPrice,
        usesProductSalePrice: variant.usesProductSalePrice,
        status: variant.status,
        onHand: inventory?.onHand ?? 0,
        safetyStock: inventory?.safetyStock ?? 0,
      }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(`${variant.sku} saved.`);
    await load(["variants", "inventory"], true);
  }
  async function createVariant(
    product: Product,
    values?: {
      sizes: string[];
      color: string;
      price: number;
      salePrice: number | null;
      onHand: number;
    },
  ) {
    if (!values) return;
    const response = await fetch("/api/merchant/variants", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ productId: product.id, ...values }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(`${data.variants.length} size option${data.variants.length === 1 ? "" : "s"} created for ${values.color}. SKU codes were generated automatically.`);
    await load(["variants", "inventory"], true);
  }
  async function replyToConversation(conversationId: number, message: string) {
    const response = await fetch("/api/merchant/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, message }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    await load(["conversations"], true);
  }
  async function updateConversation(
    conversationId: number,
    status?: string,
    assignToMe?: boolean,
  ) {
    const response = await fetch("/api/merchant/conversations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, status, assignToMe }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    await load(["conversations"], true);
  }
  async function updatePayment(
    orderId: number,
    paymentStatus: "paid" | "failed",
  ) {
    const note =
      paymentStatus === "failed"
        ? window.prompt("Why was this payment rejected?")?.trim()
        : undefined;
    if (paymentStatus === "failed" && !note) return;
    const response = await fetch("/api/merchant/orders", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId, paymentStatus, note }),
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(`Payment marked ${paymentStatus}.`);
    await load(["orders", "payments"], true);
  }
  const previewStore = () => {
    if (merchant?.slug) window.location.href = `/stores/${merchant.slug}`;
    else onPreview();
  };

  if (!session)
    return (
      <section className="access-card">
        <h2>Opening secure merchant workspace…</h2>
      </section>
    );
  if (!session.authenticated)
    return (
      <section className="access-card">
        <p className="eyebrow">Secure merchant login</p>
        <h2>Sign in to manage your NeuroCity store</h2>
        <ul className="info-list"><li>Use the account that received your NeuroCity invitation.</li><li>Your identity is verified before merchant data is returned.</li></ul>
      </section>
    );
  if (!session.memberships?.length)
    return (
      <section className="access-card">
        <p className="eyebrow">Merchant access</p>
        <h2>Welcome, {session.user?.displayName}</h2>
        <ul className="info-list"><li>Enter the one-time invitation code supplied by NeuroCity.</li><li>Codes are email-bound and expire after seven days.</li></ul>
        <label>
          Invitation code
          <input
            value={claimCode}
            onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
          />
        </label>
        <TurnstileChallenge action="merchant_claim" onToken={acceptClaimTurnstile} resetKey={claimTurnstileReset} />
        <button
          disabled={!claimTurnstileToken}
          onClick={() => { void postAccess("/api/merchant/claim", { code: claimCode, turnstileToken: claimTurnstileToken }); setClaimTurnstileToken(null); setClaimTurnstileReset((value) => value + 1); }}
        >
          Join merchant workspace
        </button>
        {session.canBootstrap && (
          <button
            className="secondary"
            onClick={() => postAccess("/api/merchant/bootstrap")}
          >
            Activate first LightWork owner
          </button>
        )}
        {message && <p>{message}</p>}
      </section>
    );
  const navCount = (item: Tab) =>
    item === "Products"
      ? products.length
      : item === "Variants"
        ? variants.length
        : item === "Orders"
          ? orders.filter(
              (order) =>
                !["completed", "rejected", "cancelled"].includes(order.status),
            ).length
          : item === "Bookings"
            ? bookings.filter(
                (booking) =>
                  !["completed", "declined", "cancelled"].includes(
                    booking.status,
                  ),
              ).length
            : item === "Inbox"
              ? conversations.filter(
                  (conversation) => conversation.status !== "closed",
                ).length
              : "";
  return (
    <section className="dashboard-shell merchant-dashboard-v2">
      <aside id="merchant-navigation-drawer" className={menuOpen ? "workspace-drawer-open" : ""}>
        <button className="workspace-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close merchant menu">×</button>
        <div className="merchant-mark">
          <ManagedImage src={merchant?.logoUrl ?? "/lightwork-logo.png"} alt="" width={160} height={160} />
          <div>
            <b>{merchant?.name ?? "Merchant"}</b>
            <span>
              {merchant?.isPublic ? "Storefront live" : "Storefront draft"}
            </span>
          </div>
        </div>
        <nav aria-label="Merchant workspace">
          {merchantNavGroups.map((group) => (
            <div className="merchant-nav-group" key={group.label}>
              <small className="nav-section-label">{group.label}</small>
              {group.items.map((item) => (
                <button
                  className={tab === item ? "active" : ""}
                  key={item}
                  onClick={() => { setTab(item); setMenuOpen(false); }}
                  aria-current={tab === item ? "page" : undefined}
                >
                  <i>{tabIcons[item]}</i>
                  <b>{item}</b>
                  <span>{navCount(item)}</span>
                </button>
              ))}
            </div>
          ))}
        </nav>
        <button className="storefront-nav" onClick={previewStore}>
          <i>↗</i>
          <b>View storefront</b>
          <span>{merchant?.isPublic ? "Live" : "Draft"}</span>
        </button>
        <div className="pilot-status">
          <span />
          <b>Store readiness</b>
          <small>{stats.readiness}% complete</small>
          <i>
            <em style={{ width: `${stats.readiness}%` }} />
          </i>
        </div>
      </aside>
      {menuOpen && <button className="workspace-drawer-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close merchant menu" />}
      <div className="dashboard-main">
        <div className="dashboard-head">
          <button type="button" className="workspace-menu-toggle" onClick={() => setMenuOpen(true)} aria-label={menuOpen ? "Merchant menu open" : "Open merchant menu"} aria-controls="merchant-navigation-drawer" aria-expanded={menuOpen}><i className="hamburger-lines" aria-hidden="true"><span /><span /><span /></i><span>Menu</span></button>
          <div>
            <p className="eyebrow">
              Merchant workspace · {session.memberships[0].role}
            </p>
            <h1>
              {tab === "Overview"
                ? "Store overview"
                : tab}
            </h1>
            <p className="dashboard-guidance">{tabGuidance[tab]}</p>
            <small className="dashboard-identity">
              {merchant?.name} · {session.user?.email}
            </small>
          </div>
          <div className="dashboard-head-actions">
            <span
              className={
                merchant?.isPublic ? "store-state live" : "store-state draft"
              }
            >
              <i />
              {merchant?.isPublic ? "Store live" : "Store draft"}
            </span>
            <button onClick={previewStore}>View storefront ↗</button>
          </div>
        </div>
        {message && (
          <button className="workspace-message" onClick={() => setMessage("")}>
            {message} ×
          </button>
        )}
        {tab === "Overview" && (
          <MerchantOverview
            stats={stats}
            orders={orders}
            stock={stock}
            conversations={conversations}
            setTab={setTab}
          />
        )}
        {tab === "Setup" && merchant && (
          <>
            <SetupPanel
              merchant={merchant}
              setMerchant={setMerchant}
              uploadMedia={uploadMedia}
              saveSetup={saveSetup}
              saving={setupSaving}
              inviteEmail={inviteEmail}
              setInviteEmail={setInviteEmail}
              createInvite={createInvite}
              inviteCode={inviteCode}
              canInvite={session.memberships[0].role === "owner"}
            />
            <PaymentSettingsPanel
              settings={paymentSettings}
              setSettings={setPaymentSettings}
              settlements={settlements}
              settlementSummary={settlementSummary}
              setMessage={setMessage}
            />
            <DeliveryZonesPanel
              zones={deliveryZones}
              setZones={setDeliveryZones}
              reload={() => load(["delivery-zones"], true)}
              setMessage={setMessage}
              deliveryEnabled={merchant.deliveryEnabled}
            />
          </>
        )}
        {tab === "Products" && (
          <CatalogueManager
            products={products}
            setProducts={setProducts}
            variants={variants}
            setVariants={setVariants}
            saveVariant={saveVariant}
            createVariant={createVariant}
            reload={() => load(["products", "variants", "overview"], true)}
            setMessage={setMessage}
          />
        )}
        {tab === "Inbox" && (
          <div className="inbox-list">
            {conversations.length === 0 ? (
              <div className="empty-state">
                <h3>No customer conversations</h3>
                <p>Product, service and store enquiries will appear here.</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <ConversationThread
                  key={conversation.id}
                  conversation={conversation}
                  onReply={replyToConversation}
                  onUpdate={updateConversation}
                />
              ))
            )}
          </div>
        )}
        {tab === "Bookings" && (
          <ServiceBookingsPanel
            bookings={bookings}
            reload={() => load(["service-bookings"], true)}
            setMessage={setMessage}
          />
        )}
        {tab === "Variants" && (
          <div className="ops-list">
            <div className="ops-callout variant-callout">
              <div>
                <h3>SKU-level availability</h3>
                <ul className="info-list"><li>Every option inherits the product price unless you set a different option-group price.</li><li>Each size keeps its own stock and customers select the combination on the storefront.</li></ul>
              </div>
              <div>
                {products.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => createVariant(product)}
                  >
                    + {product.name}
                  </button>
                ))}
              </div>
            </div>
            {variants.map((variant) => (
              <VariantEditor
                key={variant.id}
                variant={variant}
                onChange={(next) =>
                  setVariants((rows) =>
                    rows.map((row) => (row.id === next.id ? next : row)),
                  )
                }
                onSave={() => saveVariant(variant)}
              />
            ))}
          </div>
        )}
        {tab === "Inventory" && (
          <div className="ops-list">
            <div className="ops-callout">
              <h3>Live option inventory</h3>
              <ul className="info-list"><li>Available stock equals on-hand stock minus reservations and safety stock.</li><li>New orders reserve units immediately.</li><li>Rejected or cancelled orders return units automatically.</li></ul>
            </div>
            {stock.length > 0 && <div className="merchant-search inventory-search"><label><span aria-hidden="true">⌕</span><input type="search" value={inventorySearch} onChange={(event) => setInventorySearch(event.target.value)} placeholder="Search products, SKUs, choices or option groups" aria-label="Search inventory" /></label><small>{visibleStock.length} of {stock.length} stock item{stock.length === 1 ? "" : "s"}</small>{inventorySearch && <button onClick={() => setInventorySearch("")}>Clear</button>}</div>}
            {visibleStock.map((row) => (
              <article className="ops-row" key={row.variantId}>
                <div className="ops-title">
                  <b>{row.productName}</b>
                  <span>
                    {[row.size, row.color].filter(Boolean).join(" / ") ||
                      row.variantTitle}
                  </span>
                  <small>
                    {row.sku} · {row.branch} · {row.variantStatus}
                  </small>
                </div>
                <label>
                  On hand
                  <input
                    type="number"
                    min="0"
                    value={row.onHand}
                    onChange={(e) =>
                      setStock((rows) =>
                        rows.map((item) =>
                          item.variantId === row.variantId
                            ? { ...item, onHand: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <label>
                  Reserved
                  <input
                    type="number"
                    value={row.reserved}
                    disabled
                    title="Reserved automatically by customer orders"
                  />
                </label>
                <label>
                  Safety stock
                  <input
                    type="number"
                    min="0"
                    value={row.safetyStock}
                    onChange={(e) =>
                      setStock((rows) =>
                        rows.map((item) =>
                          item.variantId === row.variantId
                            ? { ...item, safetyStock: Number(e.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                </label>
                <div className="stock-number">
                  <small>Available now</small>
                  <b>
                    {Math.max(0, row.onHand - row.reserved - row.safetyStock)}
                  </b>
                </div>
                <button
                  onClick={() =>
                    patch(
                      "/api/merchant/inventory",
                      {
                        variantId: row.variantId,
                        onHand: row.onHand,
                        safetyStock: row.safetyStock,
                      },
                      `${row.productName} · ${row.variantTitle} inventory saved.`,
                    )
                  }
                >
                  Save stock
                </button>
              </article>
            ))}
            {stock.length === 0 && <div className="empty-state"><h3>No inventory yet</h3><p>Add a product and its available sizes to start tracking stock.</p><button onClick={() => setTab("Products")}>Go to products</button></div>}
            {stock.length > 0 && visibleStock.length === 0 && <div className="empty-state search-empty"><h3>No matching inventory</h3><p>Try a product name, SKU, choice, option group or branch.</p><button onClick={() => setInventorySearch("")}>Clear search</button></div>}
          </div>
        )}
        {tab === "Orders" && (
          <div className="ops-list">
            {orders.some(
              (order) =>
                order.paymentMethod === "eft" &&
                order.paymentProof &&
                order.paymentStatus !== "paid",
            ) && (
              <section className="merchant-payment-queue">
                <header>
                  <div>
                    <p className="eyebrow">Payment review</p>
                    <h2>Proofs awaiting a decision</h2>
                  </div>
                  <span>
                    {
                      orders.filter(
                        (order) =>
                          order.paymentMethod === "eft" &&
                          order.paymentProof &&
                          order.paymentStatus !== "paid",
                      ).length
                    }
                  </span>
                </header>
                {orders
                  .filter(
                    (order) =>
                      order.paymentMethod === "eft" &&
                      order.paymentProof &&
                      order.paymentStatus !== "paid",
                  )
                  .map((order) => (
                    <article key={order.id}>
                      <div>
                        <b>{order.reference}</b>
                        <span>
                          {order.customerName} · {money(order.total)}
                        </span>
                        <small>{order.paymentProof?.originalName}</small>
                      </div>
                      <a
                        href={`/api/orders/payment-proof?orderId=${order.id}&view=1`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View proof ↗
                      </a>
                      <button onClick={() => updatePayment(order.id, "failed")}>
                        Reject
                      </button>
                      <button
                        className="primary-action"
                        onClick={() => updatePayment(order.id, "paid")}
                      >
                        Verify paid
                      </button>
                    </article>
                  ))}
              </section>
            )}
            {orders.length === 0 ? (
              <div className="empty-state">
                <h3>No orders yet</h3>
                <p>
                  Published products and private pilot checkout orders will
                  appear here.
                </p>
              </div>
            ) : (
              orders.map((order) => (
                <MerchantOrderCard
                  key={order.id}
                  order={order}
                  update={(status, note) =>
                    patch(
                      "/api/merchant/orders",
                      { orderId: order.id, status, note },
                      `Order moved to ${pretty(status)}.`,
                    )
                  }
                  updatePayment={(status) => updatePayment(order.id, status)}
                />
              ))
            )}
          </div>
        )}
      </div>
    </section>
  );
}
function SetupPanel({
  merchant,
  setMerchant,
  uploadMedia,
  saveSetup,
  saving,
  inviteEmail,
  setInviteEmail,
  createInvite,
  inviteCode,
  canInvite,
}: {
  merchant: Merchant;
  setMerchant: (merchant: Merchant) => void;
  uploadMedia: (type: "logo" | "banner", file?: File) => Promise<boolean>;
  saveSetup: () => void;
  saving: boolean;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  createInvite: () => void;
  inviteCode: string;
  canInvite: boolean;
}) {
  const [mediaCrop, setMediaCrop] = useState<{ file: File; type: "logo" | "banner" } | null>(null);
  const [mediaPreview, setMediaPreview] = useState<Partial<Record<"logo" | "banner", string>>>({});
  const mediaSource = (type: "logo" | "banner") => mediaPreview[type] ?? ((type === "logo" ? merchant.logoUrl : merchant.bannerUrl)?.startsWith("r2://") ? `/api/merchant/media?type=${type}` : type === "logo" ? merchant.logoUrl : merchant.bannerUrl);
  const updateHour = (dayOfWeek: number, values: Partial<StoreHour>) =>
    setMerchant({
      ...merchant,
      hours: merchant.hours.map((hour) =>
        hour.dayOfWeek === dayOfWeek ? { ...hour, ...values } : hour,
      ),
    });
  const applyHoursPreset = (preset: "weekdays" | "daily") =>
    setMerchant({
      ...merchant,
      hours: merchant.hours.map((hour) => ({
        ...hour,
        opensAt: "09:00",
        closesAt: "17:00",
        closed: preset === "weekdays" && (hour.dayOfWeek === 0 || hour.dayOfWeek === 6),
      })),
    });
  const setupChecks = [
    { key: "identity", label: "Store details", target: "setup-storefront", done: Boolean(merchant.name && merchant.category && merchant.tagline && merchant.description) },
    { key: "branding", label: "Logo and banner", target: "setup-storefront", done: Boolean(merchant.logoUrl && merchant.bannerUrl) },
    { key: "contact", label: "Contact details", target: "setup-contact", done: Boolean(merchant.contactEmail && merchant.contactPhone) },
    { key: "location", label: "Pickup address", target: "setup-contact", done: Boolean(merchant.branchAddress) },
    { key: "fulfilment", label: "Fulfilment", target: "setup-selling", done: merchant.pickupEnabled || merchant.deliveryEnabled },
    { key: "hours", label: "Opening hours", target: "setup-selling", done: merchant.hours.length === 7 && merchant.hours.every((hour) => hour.closed || (hour.opensAt && hour.closesAt)) },
    { key: "policies", label: "Returns policy", target: "setup-selling", done: Boolean(merchant.returnsPolicy) },
  ];
  const completion = Math.round(setupChecks.filter((check) => check.done).length / setupChecks.length * 100);
  const missingChecks = setupChecks.filter((check) => !check.done);
  const goToSetupSection = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  return (
    <div className="setup-workflow">
      <section className="setup-intro">
        <div>
          <p className="eyebrow">Store setup</p>
          <h2>Get ready to sell in three steps</h2>
          <p>Start with the essentials. You can save a draft at any time and return later.</p>
        </div>
        <span>About 5 minutes</span>
      </section>
      <section className="setup-readiness">
        <div>
          <p className="eyebrow">Store readiness</p>
          <strong>{completion}%</strong>
          <span>{merchant.isPublic ? "Published" : "Draft storefront"}</span>
        </div>
        <div className="readiness-bar">
          <i style={{ width: `${completion}%` }} />
        </div>
        <ul>
          {setupChecks.map((check) => (
            <li className={check.done ? "done" : ""} key={check.key}>
              <button type="button" onClick={() => goToSetupSection(check.target)}>
                {check.done ? "✓" : "○"} {check.label}
              </button>
            </li>
          ))}
        </ul>
      </section>
      <section className="setup-section" id="setup-storefront">
        <header>
          <span>1</span>
          <div>
            <h2>Build your storefront</h2>
            <p>Add the name, short introduction and images customers will see.</p>
          </div>
        </header>
        <div className="setup-fields">
          <label>
            Business name
            <input
              required
              maxLength={180}
              autoComplete="organization"
              value={merchant.name}
              onChange={(e) =>
                setMerchant({ ...merchant, name: e.target.value })
              }
            />
          </label>
          <label>
            Main category
            <select
              required
              value={merchant.category}
              onChange={(e) =>
                setMerchant({ ...merchant, category: e.target.value, enabledCategories: [...new Set([e.target.value, ...merchant.enabledCategories])] })
              }
            >
              {!merchantCategories.some(
                (category) => category.name === merchant.category,
              ) && (
                <option value={merchant.category}>{merchant.category}</option>
              )}
              {merchantCategories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="wide merchant-category-picker">
            <legend>Other categories customers can find you under</legend>
            <small>Select every category that accurately represents the business. Your main category remains the primary label.</small>
            <div>
              {merchantCategories.filter((item) => item.name !== merchant.category).map((item) => {
                const selected = merchant.enabledCategories.includes(item.name);
                return <label className={selected ? "selected" : ""} key={item.name}><input type="checkbox" checked={selected} onChange={() => setMerchant({ ...merchant, enabledCategories: selected ? merchant.enabledCategories.filter((name) => name !== item.name) : [...merchant.enabledCategories, item.name] })} /><span>{item.icon} {item.name}</span></label>;
              })}
            </div>
          </fieldset>
          <label className="wide">
            Store tagline
            <input
              required
              maxLength={220}
              placeholder="A short promise customers will remember"
              value={merchant.tagline ?? ""}
              onChange={(e) =>
                setMerchant({ ...merchant, tagline: e.target.value })
              }
            />
          </label>
          <label className="wide">
            Store description
            <textarea
              required
              maxLength={2000}
              placeholder="What you sell, who you serve, and what makes your store useful"
              value={merchant.description ?? ""}
              onChange={(e) =>
                setMerchant({ ...merchant, description: e.target.value })
              }
            />
          </label>
          <div className="brand-media-grid wide">
            {(["logo", "banner"] as const).map((type) => (
              <label className={`media-upload media-upload-${type}`} key={type}>
                <span className="media-preview">
                  {mediaSource(type) ? <ManagedImage src={mediaSource(type)!} alt={`Current store ${type}`} /> : <b>{type === "logo" ? "LOGO" : "BANNER"}</b>}
                </span>
                <span className="media-upload-copy">
                  <strong>Store {type}</strong>
                  <small>{type === "logo" ? "Square image · shown on store cards and your storefront" : "Wide image · shown across the top of your storefront"}</small>
                  <em>{mediaSource(type) ? "Replace image" : "Choose image"}</em>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={`Upload store ${type}`} onChange={(e) => { const file = e.target.files?.[0]; if (file) setMediaCrop({ file, type }); e.target.value = ""; }} />
              </label>
            ))}
          </div>
        </div>
      </section>
      {mediaCrop && <ImageCropper file={mediaCrop.file} aspect={mediaCrop.type === "banner" ? 16 / 5 : 1} width={mediaCrop.type === "banner" ? 1600 : 800} title={mediaCrop.type === "banner" ? "Crop storefront banner" : "Crop store logo"} onCancel={() => setMediaCrop(null)} onApply={async (file) => { const type = mediaCrop.type; if (await uploadMedia(type, file)) { setMediaPreview((current) => ({ ...current, [type]: URL.createObjectURL(file) })); setMediaCrop(null); } }} />}
      <section className="setup-section" id="setup-contact">
        <header>
          <span>2</span>
          <div>
            <h2>Add contact and pickup details</h2>
            <p>Tell customers how to reach you and where orders can be collected.</p>
          </div>
        </header>
        <div className="setup-fields">
          <label>
            Contact email
            <input
              required
              type="email"
              autoComplete="email"
              placeholder="orders@yourbusiness.com"
              value={merchant.contactEmail ?? ""}
              onChange={(e) =>
                setMerchant({ ...merchant, contactEmail: e.target.value })
              }
            />
          </label>
          <label>
            Phone
            <input
              required
              type="tel"
              autoComplete="tel"
              placeholder="081 234 5678"
              value={merchant.contactPhone ?? ""}
              onChange={(e) =>
                setMerchant({ ...merchant, contactPhone: e.target.value })
              }
            />
          </label>
          <label className="wide">
            Pickup address
            <input
              required
              autoComplete="street-address"
              placeholder="Building, street, suburb and town"
              value={merchant.branchAddress}
              onChange={(e) =>
                setMerchant({
                  ...merchant,
                  branchAddress: e.target.value,
                  pickupLocation: e.target.value,
                })
              }
            />
          </label>
          <details className="optional-fields wide">
            <summary>Optional business details</summary>
            <div>
              <label>Contact person<input value={merchant.contactName ?? ""} onChange={(e) => setMerchant({ ...merchant, contactName: e.target.value })} /></label>
              <label>Website<input value={merchant.website ?? ""} onChange={(e) => setMerchant({ ...merchant, website: e.target.value })} /></label>
              <label>Location name<input value={merchant.branchName} onChange={(e) => setMerchant({ ...merchant, branchName: e.target.value })} /></label>
              <label>Location phone<input value={merchant.branchPhone} onChange={(e) => setMerchant({ ...merchant, branchPhone: e.target.value })} /></label>
            </div>
          </details>
        </div>
      </section>
      <section className="setup-section" id="setup-selling">
        <header>
          <span>3</span>
          <div>
            <h2>Choose how you sell</h2>
            <p>Select fulfilment, confirm your hours and add a returns policy.</p>
          </div>
        </header>
        <div className="fulfilment-options">
          <label aria-label="Customer pickup" htmlFor="pickup-enabled">
            <input
              id="pickup-enabled"
              type="checkbox"
              checked={merchant.pickupEnabled}
              onChange={(e) =>
                setMerchant({ ...merchant, pickupEnabled: e.target.checked })
              }
            />
            <span>
              <strong>Customer pickup</strong>
              <small>Customers collect from the primary branch.</small>
            </span>
          </label>
          <label aria-label="Merchant delivery" htmlFor="delivery-enabled">
            <input
              id="delivery-enabled"
              type="checkbox"
              checked={merchant.deliveryEnabled}
              onChange={(e) =>
                setMerchant({ ...merchant, deliveryEnabled: e.target.checked })
              }
            />
            <span>
              <strong>Merchant delivery</strong>
              <small>Your store manages delivery during the pilot.</small>
            </span>
          </label>
        </div>
        <div className="hours-heading">
          <strong>Opening hours</strong>
          <div><button type="button" onClick={() => applyHoursPreset("weekdays")}>Weekdays 9–5</button><button type="button" onClick={() => applyHoursPreset("daily")}>Every day 9–5</button></div>
        </div>
        <div className="hours-grid">
          {merchant.hours.map((hour) => (
            <div key={hour.dayOfWeek}>
              <strong>{dayNames[hour.dayOfWeek]}</strong>
              <label>
                <input
                  type="checkbox"
                  checked={hour.closed}
                  onChange={(e) =>
                    updateHour(hour.dayOfWeek, { closed: e.target.checked })
                  }
                />{" "}
                Closed
              </label>
              <input
                aria-label={`${dayNames[hour.dayOfWeek]} opening time`}
                type="time"
                disabled={hour.closed}
                value={hour.opensAt ?? "09:00"}
                onChange={(e) =>
                  updateHour(hour.dayOfWeek, { opensAt: e.target.value })
                }
              />
              <span>to</span>
              <input
                aria-label={`${dayNames[hour.dayOfWeek]} closing time`}
                type="time"
                disabled={hour.closed}
                value={hour.closesAt ?? "17:00"}
                onChange={(e) =>
                  updateHour(hour.dayOfWeek, { closesAt: e.target.value })
                }
              />
            </div>
          ))}
        </div>
        <div className="setup-fields">
          <label className="wide">
            Returns and exchanges policy
            <textarea
              required
              value={merchant.returnsPolicy}
              onChange={(e) =>
                setMerchant({ ...merchant, returnsPolicy: e.target.value })
              }
            />
          </label>
          <details className="optional-fields wide">
            <summary>Optional customer policies</summary>
            <div>
              <label>Delivery and pickup policy<textarea value={merchant.shippingPolicy} onChange={(e) => setMerchant({ ...merchant, shippingPolicy: e.target.value })} /></label>
              <label>Privacy note<textarea value={merchant.privacyPolicy} onChange={(e) => setMerchant({ ...merchant, privacyPolicy: e.target.value })} /></label>
            </div>
          </details>
        </div>
      </section>
      <section className="publish-panel">
        <div>
          <h2>{merchant.isPublic ? "Your storefront is public" : "Save your progress"}</h2>
          <p>{merchant.isPublic ? "Save changes to update what customers see." : "Save a draft now, or publish when every required item is complete."}</p>
        </div>
        <label>
          <input
            type="checkbox"
            checked={merchant.isPublic}
            disabled={!merchant.isPublic && completion < 100}
            onChange={(e) =>
              setMerchant({ ...merchant, isPublic: e.target.checked })
            }
          />{" "}
          Make this storefront public
        </label>
        <button onClick={saveSetup} disabled={saving || (merchant.isPublic && completion < 100)}>
          {saving ? "Saving…" : merchant.isPublic
            ? "Save and publish storefront"
            : "Save setup draft"}
        </button>
        {!merchant.isPublic && missingChecks.length > 0 && <small className="publish-blocked">Complete {missingChecks.map((check) => check.label.toLowerCase()).join(", ")} before publishing. Your draft can still be saved.</small>}
      </section>
      {canInvite && (
        <section className="invite-panel">
          <h3>Invite a dashboard manager</h3>
          <ul className="info-list"><li>They must sign in with this exact email.</li><li>They must then enter the one-time code.</li></ul>
          <input
            type="email"
            placeholder="manager@example.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <button onClick={createInvite}>Create 7-day invitation</button>
          {inviteCode && <code>{inviteCode}</code>}
        </section>
      )}
    </div>
  );
}
function CatalogueManager({
  products,
  setProducts,
  variants,
  setVariants,
  saveVariant,
  createVariant,
  reload,
  setMessage,
}: {
  products: Product[];
  setProducts: (products: Product[] | ((rows: Product[]) => Product[])) => void;
  variants: Variant[];
  setVariants: (variants: Variant[] | ((rows: Variant[]) => Variant[])) => void;
  saveVariant: (variant: Variant) => Promise<void>;
  createVariant: (
    product: Product,
    values: {
      sizes: string[];
      color: string;
      price: number;
      salePrice: number | null;
      onHand: number;
    },
  ) => Promise<void>;
  reload: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const productQuery = productSearch.trim().toLowerCase();
  const visibleProducts = productQuery ? products.filter((product) => {
    const productVariants = variants.filter((variant) => variant.productId === product.id);
    return [product.name, product.sku, product.category, product.brand, product.collection, product.status, product.availability, ...productVariants.flatMap((variant) => [variant.title, variant.sku, variant.size, variant.color])].filter(Boolean).join(" ").toLowerCase().includes(productQuery);
  }) : products;
  const downloadTemplate = () => {
    downloadCatalogueCsv("neurocity-catalogue-template.csv", [
      { name: "Classic crew-neck T-shirt", sku: "TSHIRT-001", category: "Fashion & Clothing", commerce_type: "apparel", description: "Cotton crew-neck T-shirt, regular fit.", price: "299.00", sale_price: "249.00", brand: "Example Brand", collection: "Essentials", variant_sku: "", variant_title: "", size: "", sizes: "S|M|L|XL", color: "Black", variant_price: "", variant_sale_price: "", stock: "", stock_by_size: "S:12|M:10|L:8|XL:5" },
      { name: "Classic crew-neck T-shirt", sku: "TSHIRT-001", category: "Fashion & Clothing", commerce_type: "apparel", description: "Cotton crew-neck T-shirt, regular fit.", price: "299.00", sale_price: "249.00", brand: "Example Brand", collection: "Essentials", variant_sku: "", variant_title: "", size: "", sizes: "S|M|L|XL", color: "White", variant_price: "329.00", variant_sale_price: "279.00", stock: "", stock_by_size: "S:8|M:8|L:6|XL:4" },
    ]);
  };
  const exportCatalogue = () => {
    const rows = products.filter((product) => product.itemType === "product").flatMap((product) => {
      const options = variants.filter((variant) => variant.productId === product.id);
      const colourways = options.length ? [...new Map(options.map((variant) => [variant.color?.trim() || "Standard", options.filter((row) => (row.color?.trim() || "Standard") === (variant.color?.trim() || "Standard"))])).values()] : [[]];
      return colourways.map((colourway) => {
        const variant = colourway[0];
        const sizes = colourway.map((item) => item.size).filter(Boolean) as string[];
        return {
        name: product.name,
        sku: product.sku,
        category: product.category ?? "",
        commerce_type: product.commerceType,
        description: product.description,
        price: product.price?.toFixed(2) ?? "",
        sale_price: product.salePrice?.toFixed(2) ?? "",
        brand: product.brand ?? "",
        collection: product.collection ?? "",
        variant_sku: "",
        variant_title: "",
        size: "",
        sizes: sizes.join("|"),
        color: variant?.color ?? "",
        variant_price: variant?.usesProductPrice === false ? variant.price.toFixed(2) : "",
        variant_sale_price: variant?.usesProductSalePrice === false ? variant.salePrice?.toFixed(2) ?? "" : "",
        stock: "",
        stock_by_size: colourway.map((item) => `${item.size ?? "One size"}:${item.stock.reduce((sum, row) => sum + row.onHand, 0)}`).join("|"),
      }; });
    });
    if (!rows.length) return setMessage("Add a product before exporting your catalogue.");
    downloadCatalogueCsv(`neurocity-catalogue-${new Date().toISOString().slice(0, 10)}.csv`, rows);
    setMessage(`${products.filter((product) => product.itemType === "product").length} products exported in ${rows.length} option-group rows. Stock is totalled across branches for each size.`);
  };
  async function importCatalogue(file?: File) {
    if (!file) return;
    setImportBusy(true);
    try {
      const rows = parseCatalogueCsv(await file.text());
      const response = await fetch("/api/merchant/products/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ rows }) });
      const data = await response.json();
      if (!response.ok) return setMessage(data.invalid?.length ? `${data.error} Rows: ${data.invalid.map((item: { row: number; fields: string[] }) => `${item.row} (${item.fields.join(", ")})`).join("; ")}` : data.error);
      setMessage(`${data.imported} product${data.imported === 1 ? "" : "s"} and ${data.variantsImported} variant${data.variantsImported === 1 ? "" : "s"} imported as drafts. Add images and review them before publishing.`);
      await reload();
    } catch {
      setMessage("The CSV could not be read. Download the template and keep its column headings unchanged.");
    } finally {
      setImportBusy(false);
    }
  }
  async function createProduct(product: NewProduct, addAnother = false) {
    setCreateBusy(true);
    const response = await fetch("/api/merchant/products", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(product),
    });
    const data = await response.json();
    setCreateBusy(false);
    if (!response.ok) {
      setMessage(data.error);
      return false;
    }
    if (!addAnother) setCreating(false);
    setMessage(
      addAnother ? `${product.name} and its variants were saved. Add the next catalogue item.` : `${product.name} created as a draft. Its colour and size variants are ready below for images, stock and final details.`,
    );
    await reload();
    return true;
  }
  async function saveProduct(product: Product, confirmed: boolean) {
    try {
      const response = await fetch("/api/merchant/products", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: product.id,
          itemType: product.itemType,
          name: product.name,
          sku: product.sku,
          category: product.category,
          brand: product.brand,
          collection: product.collection,
          description: product.description,
          price: product.price,
          salePrice: product.salePrice,
          pricingModel: product.pricingModel,
          durationMinutes: product.durationMinutes,
          serviceMode: product.serviceMode,
          bookingRequired: product.bookingRequired,
          status: product.status,
          availability: product.availability,
          badge: product.badge,
          imageUrl: product.storageImageUrl,
          imageUrls: product.storageImageUrls,
          merchantConfirmed: confirmed,
        }),
      });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error ?? "The product could not be saved."); return false; }
      setProducts((rows) => rows.map((row) => row.id === product.id ? { ...row, ...data.product, storageImageUrl: data.product.imageUrl, storageImageUrls: data.product.imageUrls ?? [], imageUrl: row.imageUrl, imageUrls: row.imageUrls } : row));
      setMessage(`${product.name} saved${product.status === "published" ? " and published" : ""}.`);
      try { await reload(); } catch { /* The confirmed save remains valid if refresh is temporarily unavailable. */ }
      return true;
    } catch {
      setMessage("The product could not be saved. Check your connection and try again.");
      return false;
    }
  }
  async function uploadImage(product: Product, slot: number, file?: File) {
    if (!file) return false;
    setMessage(`Uploading image for ${product.name}...`);
    const response = await fetch("/api/merchant/products/media", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        slot,
      }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error); return false; }
    const upload = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!upload.ok) {
      setMessage("Product image upload failed. Please try again.");
      return false;
    }
    const gallery = [...(product.storageImageUrls ?? [])]; gallery[slot] = data.storageValue;
    const saved = await fetch("/api/merchant/products", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: product.id,
        imageUrl: gallery[0],
        imageUrls: gallery,
        merchantConfirmed: product.status === "published",
      }),
    });
    const savedData = await saved.json();
    if (!saved.ok) { setMessage(savedData.error); return false; }
    setMessage(`${product.name} image updated.`);
    await reload();
    return true;
  }
  async function uploadVariantImage(colourway: Variant[], file?: File) {
    if (!file) return false;
    const variant = colourway[0];
    setMessage(`Uploading image for ${variant.color ?? variant.title}...`);
    const ticket = await fetch("/api/merchant/variants/media", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ variantId: variant.id, filename: file.name, mimeType: file.type, sizeBytes: file.size }) });
    const uploadData = await ticket.json();
    if (!ticket.ok) { setMessage(uploadData.error); return false; }
    const upload = await fetch(uploadData.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
    if (!upload.ok) { setMessage("Variant image upload failed. Please try again."); return false; }
    for (const option of colourway) {
      const stock = option.stock[0];
      const saved = await fetch("/api/merchant/variants", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: option.id, title: option.title, size: option.size, color: option.color, price: option.price, salePrice: option.salePrice, status: option.status, onHand: stock?.onHand ?? 0, safetyStock: stock?.safetyStock ?? 0, imageUrl: uploadData.storageValue }) });
      const savedData = await saved.json();
      if (!saved.ok) { setMessage(savedData.error); return false; }
    }
    setMessage(`${variant.color ?? variant.title} image applied to ${colourway.length} size option${colourway.length === 1 ? "" : "s"}.`);
    await reload();
    return true;
  }
  async function archiveProduct(product: Product) {
    if (
      !window.confirm(
        `Archive ${product.name}? It will disappear from the storefront but remain in order history.`,
      )
    )
      return;
    const response = await fetch(`/api/merchant/products?id=${product.id}`, {
      method: "DELETE",
    });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(`${product.name} archived.`);
    await reload();
  }
  async function deleteProduct(product: Product) {
    if (!window.confirm(`Permanently delete ${product.name}? Its variants, stock and saved customer references will also be removed. This cannot be undone.`)) return;
    const response = await fetch(`/api/merchant/products?id=${product.id}&permanent=true`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setMessage(`${product.name} permanently deleted.`);
    await reload();
  }
  return (
    <div className="catalogue-manager">
      <div className="catalogue-toolbar">
        <div>
          <span className="catalogue-count">
            {products.length} PRODUCT{products.length === 1 ? "" : "S"}
          </span>
          <h2>Catalogue manager</h2>
          <ul className="info-list"><li>Manage product details and customer options.</li><li>Control prices and stock in one place.</li></ul>
        </div>
        <div className="catalogue-actions">
          <button className="secondary" onClick={downloadTemplate}>Download CSV template</button>
          <button className="secondary" onClick={exportCatalogue}>Export catalogue</button>
          <label className="catalogue-import-button">{importBusy ? "Importing…" : "Import CSV"}<input type="file" accept=".csv,text/csv" disabled={importBusy} onChange={(event) => { void importCatalogue(event.target.files?.[0]); event.currentTarget.value = ""; }} /></label>
          <button onClick={() => setCreating(true)}>+ Add product</button>
        </div>
      </div>
      {products.length > 0 && <div className="merchant-search product-search"><label><span aria-hidden="true">⌕</span><input type="search" value={productSearch} onChange={(event) => setProductSearch(event.target.value)} placeholder="Search products, SKUs, categories or variants" aria-label="Search products" /></label><small>{visibleProducts.length} of {products.length} product{products.length === 1 ? "" : "s"}</small>{productSearch && <button onClick={() => setProductSearch("")}>Clear</button>}</div>}
      <p className="catalogue-csv-help"><b>CSV rules:</b> Use one row per option group. For clothing and related categories, this is a colourway. For other categories it can be a model, flavour, format, finish or type, recorded in the <b>color</b> column for compatibility. Put its choices in <b>sizes</b>, such as S|M|L or 64 GB|128 GB, and stock in <b>stock_by_size</b>, such as S:4|M:8 or 64 GB:5|128 GB:3. NeuroCity creates every option and SKU automatically. Leave variant prices blank to inherit the product price. Repeat the product SKU and identical product details across option groups. Imports are saved as drafts.</p>
      <ProductCreatePanel
        open={creating}
        busy={createBusy}
        onClose={() => setCreating(false)}
        onCreate={createProduct}
      />
      {products.length === 0 ? (
        <div className="empty-state">
          <h3>Your catalogue is empty</h3>
          <ul className="info-list centered"><li>Add your first product to begin building the storefront.</li></ul>
          <button onClick={() => setCreating(true)}>Add first product</button>
        </div>
      ) : visibleProducts.length === 0 ? (
        <div className="empty-state search-empty"><h3>No matching products</h3><p>Try a product name, SKU, category, brand, option or choice.</p><button onClick={() => setProductSearch("")}>Clear search</button></div>
      ) : (
        <div className="ops-list">
          {visibleProducts.map((product) => {
            const productVariants = variants.filter(
              (variant) => variant.productId === product.id,
            );
            return (
              <div className="catalogue-product" key={product.id}>
                <ProductEditor
                  product={product}
                  onChange={(next) =>
                    setProducts((rows) =>
                      rows.map((row) => (row.id === next.id ? next : row)),
                    )
                  }
                  onSave={(confirmed) => saveProduct(product, confirmed)}
                  onUpload={(slot, file) => uploadImage(product, slot, file)}
                  onArchive={() => archiveProduct(product)}
                  onDelete={() => deleteProduct(product)}
                />
                <ProductOptionsPanel
                  product={product}
                  variants={productVariants}
                  onVariantChange={(next) =>
                    setVariants((rows) =>
                      rows.map((row) => (row.id === next.id ? next : row)),
                    )
                  }
                  onVariantSave={saveVariant}
                  onVariantCreate={(values) => createVariant(product, values)}
                  onVariantUpload={uploadVariantImage}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
function ProductEditor({
  product,
  onChange,
  onSave,
  onUpload,
  onArchive,
  onDelete,
}: {
  product: Product;
  onChange: (product: Product) => void;
  onSave: (confirmed: boolean) => Promise<boolean>;
  onUpload: (slot: number, file?: File) => Promise<boolean>;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [crop, setCrop] = useState<{ file: File; slot: number } | null>(null);
  return (
    <article className="catalogue-card">
      <header>
        <div className="catalogue-image product-gallery-admin" aria-label="Product image gallery">
          {[0, 1, 2].map((slot) => <label key={slot}>
            {product.imageUrls?.[slot] ? <ManagedImage src={product.imageUrls[slot]} alt={`${product.name} view ${slot + 1}`} /> : <span>{slot === 0 ? "Main image" : `Add view ${slot + 1}`}</span>}
            <em className="product-image-action"><span aria-hidden="true">{product.imageUrls?.[slot] ? "↻" : "+"}</span>{product.imageUrls?.[slot] ? "Replace image" : slot === 0 ? "Add main image" : "Add view"}</em>
            <input type="file" aria-label={`${product.imageUrls?.[slot] ? "Replace" : "Upload"} ${product.name} image ${slot + 1}`} accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setCrop({ file, slot }); event.target.value = ""; }} />
          </label>)}
        </div>
        <div>
          <span className={`catalogue-status status-${product.status}`}>
            {pretty(product.status)}
          </span>
          <h3>{product.name || "Untitled product"}</h3>
          <p>
            {product.sku} · {pretty(product.availability)}
          </p>
        </div>
      </header>
      <div className="catalogue-fields">
        <label>
          Product name
          <input
            value={product.name}
            onChange={(e) => onChange({ ...product, name: e.target.value })}
          />
        </label>
        <label>
          SKU
          <input
            value={product.sku}
            onChange={(e) =>
              onChange({ ...product, sku: e.target.value.toUpperCase() })
            }
          />
        </label>
        <label>
          Category
          <input
            value={product.category ?? ""}
            placeholder="e.g. Hoodies"
            onChange={(e) => onChange({ ...product, category: e.target.value })}
          />
        </label>
        <label>
          Brand
          <input
            value={product.brand ?? ""}
            onChange={(e) => onChange({ ...product, brand: e.target.value })}
          />
        </label>
        <label>
          Collection
          <input
            value={product.collection ?? ""}
            onChange={(e) =>
              onChange({ ...product, collection: e.target.value })
            }
          />
        </label>
        <label>
          Badge
          <input
            value={product.badge ?? ""}
            placeholder="e.g. New arrival"
            onChange={(e) => onChange({ ...product, badge: e.target.value })}
          />
        </label>
        <label>
          Regular price (N$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={product.price ?? ""}
            onChange={(e) =>
              onChange({
                ...product,
                price: e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Sale price (N$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={product.salePrice ?? ""}
            onChange={(e) =>
              onChange({
                ...product,
                salePrice:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          Availability
          <select
            value={product.availability}
            onChange={(e) =>
              onChange({ ...product, availability: e.target.value })
            }
          >
            <option value="available">Available</option>
            <option value="preorder">Pre-order</option>
            <option value="out_of_stock">Out of stock</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </label>
        <label>
          Publication status
          <select
            value={product.status}
            onChange={(e) => onChange({ ...product, status: e.target.value })}
          >
            <option value="needs_confirmation">Needs confirmation</option>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <label className="wide">
          Description
          <textarea
            value={product.description}
            placeholder="Describe the product, materials, fit and key details."
            onChange={(e) =>
              onChange({ ...product, description: e.target.value })
            }
          />
        </label>
      </div>
      <footer>
        <label className="confirm-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          I confirm these catalogue details are current
        </label>
        <div>
          <button className="danger-text" onClick={onArchive}>
            Archive
          </button>
          <button className="danger-text danger-delete" onClick={onDelete}>
            Delete permanently
          </button>
          <button disabled={saving} onClick={async () => { setSaving(true); const saved = await onSave(confirmed); setSaving(false); if (saved) setConfirmed(false); }}>{saving ? "Saving…" : "Save product"}</button>
        </div>
      </footer>
      {crop && <ImageCropper file={crop.file} aspect={4 / 5} width={1200} title={`Crop ${product.name} · image ${crop.slot + 1}`} onCancel={() => setCrop(null)} onApply={async (file) => { if (await onUpload(crop.slot, file)) setCrop(null); }} />}
    </article>
  );
}
function VariantEditor({
  variant,
  onChange,
  onSave,
}: {
  variant: Variant;
  onChange: (variant: Variant) => void;
  onSave: () => void;
}) {
  const stock = variant.stock[0] ?? {
    branchName: "Primary branch",
    onHand: 0,
    reserved: 0,
    safetyStock: 0,
  };
  const updateStock = (values: Partial<typeof stock>) =>
    onChange({ ...variant, stock: [{ ...stock, ...values }] });
  return (
    <article className="variant-editor">
      <header>
        <div>
          <strong>{variant.productName}</strong>
          <span>{variant.sku}</span>
        </div>
        <select
          value={variant.status}
          onChange={(e) => onChange({ ...variant, status: e.target.value })}
        >
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="needs_confirmation">Needs confirmation</option>
          <option value="archived">Archived</option>
        </select>
      </header>
      <div>
        <label>
          Variant title
          <input
            value={variant.title}
            onChange={(e) => onChange({ ...variant, title: e.target.value })}
          />
        </label>
        <label>
          Size
          <input
            value={variant.size ?? ""}
            onChange={(e) => onChange({ ...variant, size: e.target.value })}
          />
        </label>
        <label>
          Colour
          <input
            value={variant.color ?? ""}
            onChange={(e) => onChange({ ...variant, color: e.target.value })}
          />
        </label>
        <label>
          Price
          <input
            type="number"
            min="0"
            step="0.01"
            value={variant.price}
            onChange={(e) =>
              onChange({ ...variant, price: Number(e.target.value) })
            }
          />
        </label>
        <label>
          Sale price
          <input
            type="number"
            min="0"
            step="0.01"
            value={variant.salePrice ?? ""}
            onChange={(e) =>
              onChange({
                ...variant,
                salePrice:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          On hand · {stock.branchName}
          <input
            type="number"
            min="0"
            value={stock.onHand}
            onChange={(e) => updateStock({ onHand: Number(e.target.value) })}
          />
        </label>
        <label>
          Safety stock
          <input
            type="number"
            min="0"
            value={stock.safetyStock}
            onChange={(e) =>
              updateStock({ safetyStock: Number(e.target.value) })
            }
          />
        </label>
        <div className="variant-available">
          <span>Available</span>
          <strong>
            {Math.max(0, stock.onHand - stock.reserved - stock.safetyStock)}
          </strong>
        </div>
      </div>
      <footer>
        <button onClick={onSave}>Save variant</button>
      </footer>
    </article>
  );
}
function ConversationThread({
  conversation,
  onReply,
  onUpdate,
}: {
  conversation: Conversation;
  onReply: (id: number, message: string) => void;
  onUpdate: (id: number, status?: string, assignToMe?: boolean) => void;
}) {
  const [reply, setReply] = useState("");
  return (
    <article className="inbox-thread">
      <header>
        <div>
          <span className={`review-status status-${conversation.status}`}>
            {conversation.status}
          </span>
          <h3>{conversation.subject}</h3>
          <p>
            {conversation.customerName} · {conversation.customerEmail}
            {conversation.productName ? ` · ${conversation.productName}` : ""}
          </p>
        </div>
        <small>
          {new Date(conversation.lastMessageAt).toLocaleString("en-NA")}
        </small>
      </header>
      <div className="thread-messages">
        {conversation.messages.map((message) => (
          <div
            className={
              message.senderRole === "merchant"
                ? "merchant-message"
                : "customer-message"
            }
            key={message.id}
          >
            <strong>{message.senderName}</strong>
            <p>{message.body}</p>
            <small>{new Date(message.createdAt).toLocaleString("en-NA")}</small>
          </div>
        ))}
      </div>
      <footer>
        {conversation.status !== "closed" ? (
          <>
            <textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Reply to customer…"
            />
            <div>
              <button
                onClick={() => onUpdate(conversation.id, undefined, true)}
              >
                Assign to me
              </button>
              <button onClick={() => onUpdate(conversation.id, "closed")}>
                Close
              </button>
              <button
                className="primary-action"
                disabled={!reply.trim()}
                onClick={() => {
                  onReply(conversation.id, reply);
                  setReply("");
                }}
              >
                Send reply
              </button>
            </div>
          </>
        ) : (
          <button onClick={() => onUpdate(conversation.id, "open")}>
            Reopen conversation
          </button>
        )}
      </footer>
    </article>
  );
}
function MerchantOverview({
  stats,
  orders,
  stock,
  conversations,
  setTab,
}: {
  stats: {
    products: number;
    publishedProducts: number;
    orders: number;
    readiness: number;
  };
  orders: Order[];
  stock: Stock[];
  conversations: Conversation[];
  setTab: (tab: Tab) => void;
}) {
  const pending = orders.filter(
    (order) => order.status === "pending_merchant_confirmation",
  );
  const lowStock = stock.filter(
    (item) => item.variantStatus === "active" && item.available <= 3,
  );
  const openMessages = conversations.filter((item) => item.status !== "closed");
  const paymentReviews = orders.filter(
    (order) => order.paymentMethod === "eft" && order.paymentProof?.status === "uploaded",
  );
  const fulfilmentWork = orders.filter((order) =>
    ["preparing", "ready_for_pickup", "dispatched", "collected", "delivered", "delivery_failed"].includes(order.status),
  );
  const revenue = orders
    .filter((order) => order.status === "completed")
    .reduce((total, order) => total + Number(order.total), 0);
  return (
    <div className="merchant-overview">
      <div className="metric-grid">
        <Metric
          icon="N$"
          label="Completed revenue"
          value={money(revenue)}
          note="All completed orders"
          tone="violet"
        />
        <Metric
          icon="▤"
          label="Orders needing action"
          value={String(pending.length)}
          note={`${stats.orders} orders recorded`}
          tone={pending.length ? "gold" : "green"}
        />
        <Metric
          icon="▥"
          label="Available units"
          value={String(stock.reduce((sum, row) => sum + row.available, 0))}
          note={`${lowStock.length} low-stock options`}
          tone={lowStock.length ? "red" : "green"}
        />
        <Metric
          icon="□"
          label="Published products"
          value={`${stats.publishedProducts}/${stats.products}`}
          note={`${stats.products - stats.publishedProducts} still in draft`}
          tone="ink"
        />
      </div>
      <section className="overview-workbench">
        <div className="priority-panel">
          <header>
            <div>
              <p className="eyebrow">Today’s work</p>
              <h2>Needs your attention</h2>
            </div>
            <span>
              {pending.length + paymentReviews.length + fulfilmentWork.length + lowStock.length + openMessages.length}
            </span>
          </header>
          <div className="priority-list">
            <button onClick={() => setTab("Orders")}>
              <i className={pending.length ? "urgent" : "clear"}>▤</i>
              <span>
                <b>
                  {pending.length
                    ? `${pending.length} order${pending.length === 1 ? "" : "s"} awaiting confirmation`
                    : "Orders are up to date"}
                </b>
                <small>
                  {pending.length
                    ? "Accept or reject these orders promptly"
                    : "No merchant decisions outstanding"}
                </small>
              </span>
              <strong>→</strong>
            </button>
            <button onClick={() => setTab("Inventory")}>
              <i className={lowStock.length ? "warning" : "clear"}>▥</i>
              <span>
                <b>
                  {lowStock.length
                    ? `${lowStock.length} low-stock option${lowStock.length === 1 ? "" : "s"}`
                    : "Inventory looks healthy"}
                </b>
                <small>Live stock after reservations and safety levels</small>
              </span>
              <strong>→</strong>
            </button>
            <button onClick={() => setTab("Orders")}>
              <i className={paymentReviews.length ? "urgent" : "clear"}>N$</i>
              <span>
                <b>{paymentReviews.length ? `${paymentReviews.length} payment proof${paymentReviews.length === 1 ? "" : "s"} to review` : "No payment proofs waiting"}</b>
                <small>Verify EFT payments before preparing orders</small>
              </span>
              <strong>→</strong>
            </button>
            <button onClick={() => setTab("Orders")}>
              <i className={fulfilmentWork.length ? "notice" : "clear"}>→</i>
              <span>
                <b>{fulfilmentWork.length ? `${fulfilmentWork.length} order${fulfilmentWork.length === 1 ? "" : "s"} in fulfilment` : "No active fulfilment work"}</b>
                <small>Prepare, hand over or complete active orders</small>
              </span>
              <strong>→</strong>
            </button>
            <button onClick={() => setTab("Inbox")}>
              <i className={openMessages.length ? "notice" : "clear"}>✉</i>
              <span>
                <b>
                  {openMessages.length
                    ? `${openMessages.length} open conversation${openMessages.length === 1 ? "" : "s"}`
                    : "Inbox is clear"}
                </b>
                <small>Customer product and order enquiries</small>
              </span>
              <strong>→</strong>
            </button>
          </div>
        </div>
        <aside className="readiness-panel">
          <span>STORE READINESS</span>
          <strong>{stats.readiness}%</strong>
          <div>
            <i style={{ width: `${stats.readiness}%` }} />
          </div>
          <p>
            {stats.readiness === 100
              ? "Your storefront setup is complete."
              : "Complete the remaining store identity, fulfilment and policy details."}
          </p>
          <button onClick={() => setTab("Setup")}>
            Continue store setup →
          </button>
        </aside>
      </section>
    </div>
  );
}
function Metric({
  icon,
  label,
  value,
  note,
  tone,
}: {
  icon: string;
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className={`metric metric-${tone}`}>
      <div>
        <i>{icon}</i>
        <span>{label}</span>
      </div>
      <b>{value}</b>
      <small>{note}</small>
    </article>
  );
}
function ServiceBookingsPanel({
  bookings,
  reload,
  setMessage,
}: {
  bookings: ServiceBooking[];
  reload: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  async function update(booking: ServiceBooking, status: string) {
    let scheduledStart: string | undefined;
    if (status === "reschedule_proposed") {
      const value = window.prompt("Propose a new date/time (YYYY-MM-DD HH:MM)");
      if (!value) return;
      const parsed = new Date(value.replace(" ", "T"));
      if (Number.isNaN(parsed.getTime()))
        return setMessage("Enter a valid appointment date and time.");
      scheduledStart = parsed.toISOString();
    }
    const note = ["declined", "cancelled", "reschedule_proposed"].includes(
      status,
    )
      ? window.prompt("Add a note for the customer")?.trim()
      : undefined;
    if (
      ["declined", "cancelled", "reschedule_proposed"].includes(status) &&
      !note
    )
      return;
    const response = await fetch("/api/merchant/service-bookings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: booking.id, status, scheduledStart, note }),
    });
    const result = await response.json();
    setMessage(
      response.ok
        ? `${booking.reference} moved to ${pretty(status)}.`
        : result.error,
    );
    if (response.ok) await reload();
  }
  if (!bookings.length)
    return (
      <div className="empty-state">
        <h3>No service bookings yet</h3>
        <p>Customer appointment and quote requests will appear here.</p>
      </div>
    );
  return (
    <div className="ops-list service-booking-list">
      {bookings.map((booking) => (
        <article className="merchant-order-card open" key={booking.id}>
          <header>
            <div>
              <span className={`order-priority status-${booking.status}`}>
                {pretty(booking.status)}
              </span>
              <h3>
                {booking.reference} · {booking.serviceName}
              </h3>
              <p>
                {booking.customerName} · {booking.customerEmail}
              </p>
            </div>
            <div>
              <small>{pretty(booking.serviceMode ?? "at_business")}</small>
              <strong>
                {booking.pricingModel === "quote" ||
                booking.priceSnapshot === null
                  ? "Quote required"
                  : money(booking.priceSnapshot)}
              </strong>
            </div>
          </header>
          <div className="merchant-order-detail">
            <section>
              <h4>Requested appointment</h4>
              <p>
                <b>
                  {new Date(booking.requestedStart).toLocaleString("en-NA")}
                </b>
                <span>
                  {booking.durationMinutes
                    ? `${booking.durationMinutes} minutes`
                    : "Duration to confirm"}
                </span>
              </p>
              {booking.customerNotes && (
                <div className="order-note">
                  <small>CUSTOMER DETAILS</small>
                  {booking.customerNotes}
                </div>
              )}
            </section>
            <section>
              <h4>Confirmed schedule</h4>
              <p>
                <b>
                  {booking.scheduledStart
                    ? new Date(booking.scheduledStart).toLocaleString("en-NA")
                    : "Awaiting merchant decision"}
                </b>
                {booking.merchantNote && <span>{booking.merchantNote}</span>}
              </p>
            </section>
          </div>
          <footer>
            {booking.allowedTransitions.map((status) => (
              <button
                className={
                  ["declined", "cancelled"].includes(status)
                    ? "danger-action"
                    : ""
                }
                key={status}
                onClick={() => update(booking, status)}
              >
                {pretty(status)}
              </button>
            ))}
          </footer>
        </article>
      ))}
    </div>
  );
}
function MerchantOrderCard({
  order,
  update,
  updatePayment,
}: {
  order: Order;
  update: (status: string, note?: string) => void;
  updatePayment: (status: "paid" | "failed") => void;
}) {
  const [open, setOpen] = useState(
    order.status === "pending_merchant_confirmation",
  );
  const [clock, setClock] = useState(Date.now());
  useEffect(() => { if (order.status !== "pending_merchant_confirmation" || !order.confirmationExpiresAt) return; const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, [order.status, order.confirmationExpiresAt]);
  const confirmationSeconds = order.confirmationExpiresAt ? Math.max(0, Math.ceil((new Date(order.confirmationExpiresAt).getTime() - clock) / 1000)) : null;
  function transition(status: string) {
    const needsReason = ["rejected", "cancelled", "delivery_failed"].includes(
      status,
    );
    const note = needsReason
      ? window.prompt(`Reason for ${pretty(status)}`)?.trim()
      : undefined;
    if (needsReason && !note) return;
    update(status, note);
  }
  const address = order.addressSnapshot;
  const paymentReview =
    order.paymentMethod === "eft" &&
    order.paymentProof &&
    ["uploaded", "rejected"].includes(order.paymentProof.status);
  const pickup = order.fulfillmentMethod === "pickup";
  const journey = pickup
    ? ["pending_merchant_confirmation", "accepted", "paid", "preparing", "ready_for_pickup", "collected", "completed"]
    : ["pending_merchant_confirmation", "accepted", "paid", "preparing", "dispatched", "delivered", "completed"];
  const terminal = ["rejected", "cancelled", "delivery_failed"].includes(order.status);
  const currentStep = journey.indexOf(order.status);
  const progress = terminal || currentStep < 0 ? 0 : (currentStep / (journey.length - 1)) * 100;
  const nextPrimary = order.allowedTransitions.find(
    (status) => !["rejected", "cancelled", "delivery_failed"].includes(status),
  );
  const whatsappUpdate = order.customerPhone ? `https://wa.me/${whatsappNumber(order.customerPhone)}?text=${encodeURIComponent(`Hi ${order.customerName ?? "there"}, an update for your NeuroCity order ${order.reference}: ${pretty(order.status)}. Reply here if you need help.`)}` : null;
  const guidance: Record<string, string> = {
    pending_merchant_confirmation: "Check the items and confirm that you can fulfil this order.",
    accepted: order.paymentStatus !== "paid" ? "Availability is confirmed. Wait for the customer to complete payment before preparing anything." : "Payment is clear. Start preparing the customer's items.",
    preparing: pickup ? "Pack the items, then mark the order ready for collection." : "Pack the items, then mark the order as dispatched.",
    ready_for_pickup: "Keep the order secure until the customer collects it.",
    dispatched: "The order is on its way. Mark it delivered after handover.",
    delivery_failed: "Record what happened, then retry delivery or cancel the order.",
    collected: "Confirm completion to finalise the sale and deduct stock.",
    delivered: "Confirm completion to finalise the sale and deduct stock.",
    completed: "This order is complete and its stock has been deducted.",
    rejected: "This order was rejected and its reserved stock was released.",
    cancelled: "This order was cancelled and its reserved stock was released.",
  };
  return (
    <article className={`merchant-order-card ${open ? "open" : ""}`}>
      <header
        role="button"
        tabIndex={0}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") setOpen(!open);
        }}
      >
        <div>
          <span className={`order-priority status-${order.status}`}>
            {pretty(order.status)}
          </span>
          <h3>{order.reference}</h3>
          <p>
            {order.customerName ?? "Customer"} ·{" "}
            {new Date(order.createdAt).toLocaleString("en-NA")}
          </p>
          {confirmationSeconds !== null && order.status === "pending_merchant_confirmation" && <small className="order-confirmation-timer">Confirm within {Math.floor(confirmationSeconds / 60)}:{String(confirmationSeconds % 60).padStart(2, "0")}</small>}
        </div>
        <div>
          <small>
            {pretty(order.fulfillmentMethod)} · {pretty(order.paymentMethod)}
          </small>
          <strong>{money(order.total)}</strong>
          <button aria-label={open ? "Collapse order" : "Open order"}>
            {open ? "−" : "+"}
          </button>
        </div>
      </header>
      {open && (
        <>
        <section className={`order-journey ${terminal ? "terminal" : ""}`}>
          <div className="order-journey-heading">
            <div><small>NEXT STEP</small><strong>{guidance[order.status] ?? "Review the latest order update."}</strong></div>
            <span className={`payment-state payment-${order.paymentStatus}`}>Payment · {pretty(order.paymentStatus)}</span>
          </div>
          <div className="order-step-track" style={{ "--order-progress": `${progress}%` } as React.CSSProperties}>
            {journey.map((status, index) => (
              <div key={status} className={`${index < currentStep ? "done" : ""} ${index === currentStep ? "current" : ""}`}>
                <i>{index < currentStep ? "✓" : index + 1}</i>
                <span>{status === "pending_merchant_confirmation" ? "New order" : pretty(status)}</span>
              </div>
            ))}
          </div>
          {terminal && <p className="order-terminal-note">{pretty(order.status)} · {guidance[order.status]}</p>}
        </section>
        <div className="merchant-order-detail">
          <section>
            <h4>Customer</h4>
            <p>
              <b>{order.customerName ?? "Not provided"}</b>
              <span>{order.customerEmail}</span>
              <span>{order.customerPhone ?? "No phone supplied"}</span>
            </p>
            {address && (
              <address>
                {address.addressLine1}
                {address.addressLine2 ? `, ${address.addressLine2}` : ""}
                <br />
                {address.suburb ? `${address.suburb}, ` : ""}
                {address.city}
              </address>
            )}
            {order.customerNotes && (
              <div className="order-note">
                <small>CUSTOMER NOTE</small>
                {order.customerNotes}
              </div>
            )}
          </section>
          <section className="merchant-order-items">
            <h4>Items</h4>
            {order.items.map((item) => (
              <article key={item.id}>
                <div>
                  <b>
                    {item.quantity}× {item.nameSnapshot}
                  </b>
                  <span>
                    {[item.sizeSnapshot, item.colorSnapshot]
                      .filter(Boolean)
                      .join(" / ") || item.variantSnapshot}
                  </span>
                  <small>SKU {item.skuSnapshot}</small>
                </div>
                <strong>
                  {money(item.lineTotal || item.unitPrice * item.quantity)}
                </strong>
              </article>
            ))}
            <div className="merchant-order-total">
              <span>
                Subtotal <b>{money(order.subtotal)}</b>
              </span>
              <span>
                Delivery <b>{money(order.deliveryFee)}</b>
              </span>
              <strong>
                Total <b>{money(order.total)}</b>
              </strong>
            </div>
          </section>
          <section>
            <h4>Order progress</h4>
            <ol>
              {order.events
                .slice()
                .reverse()
                .map((event) => (
                  <li key={event.id}>
                    <i />
                    <div>
                      <b>{pretty(event.status)}</b>
                      {event.note && <span>{event.note}</span>}
                      <small>
                        {new Date(event.createdAt).toLocaleString("en-NA")}
                      </small>
                    </div>
                  </li>
                ))}
            </ol>
          </section>
        </div>
        </>
      )}
      {open && order.paymentProof && (
        <section
          className={`order-payment-proof status-${order.paymentProof.status}`}
        >
          <div>
            <span>PAYMENT DOCUMENT</span>
            <h4>{order.paymentProof.originalName}</h4>
            <p>
              Status: <b>{pretty(order.paymentProof.status)}</b>
              {order.paymentProof.reviewNote
                ? ` · ${order.paymentProof.reviewNote}`
                : ""}
            </p>
          </div>
          <a
            href={`/api/orders/payment-proof?orderId=${order.id}&view=1`}
            target="_blank"
            rel="noreferrer"
          >
            View uploaded proof ↗
          </a>
          {paymentReview && (
            <div>
              <button onClick={() => updatePayment("failed")}>
                Reject proof
              </button>
              <button
                className="primary-action"
                onClick={() => updatePayment("paid")}
              >
                Verify payment
              </button>
            </div>
          )}
        </section>
      )}
      <footer>
        <div className="order-action-copy">
          <small>{nextPrimary ? "RECOMMENDED ACTION" : "ORDER STATUS"}</small>
          <span>{nextPrimary ? `Move this order to ${pretty(nextPrimary)}.` : guidance[order.status]}</span>
        </div>
        {whatsappUpdate && <a className="order-whatsapp-action" href={whatsappUpdate} target="_blank" rel="noreferrer">Send WhatsApp update</a>}
        {order.allowedTransitions.filter((next) => next !== nextPrimary).map((next) => (
          <button
            className={
              ["rejected", "cancelled", "delivery_failed"].includes(next)
                ? "danger-action"
                : ""
            }
            key={next}
            onClick={() => transition(next)}
          >
            {pretty(next)}
          </button>
        ))}
        {nextPrimary && <button className="primary-order-action" onClick={() => transition(nextPrimary)}>{pretty(nextPrimary)} <span aria-hidden="true">→</span></button>}
      </footer>
    </article>
  );
}
