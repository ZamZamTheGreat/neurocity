"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type CustomerConversation = {
  id: number;
  storeName: string;
  storeSlug: string;
  productName: string | null;
  subject: string;
  status: string;
  lastMessageAt: string;
  messages: {
    id: number;
    senderRole: string;
    senderName: string;
    body: string;
    createdAt: string;
  }[];
};
type PaymentInstructions = {
  bankName: string;
  accountHolder: string;
  accountType: string;
  accountNumber: string;
  branchCode: string;
  referenceInstructions: string;
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
  storeName: string;
  storeSlug: string;
};
type Account = {
  user: { displayName: string; email: string };
  addresses: {
    id: number;
    label: string;
    recipientName: string;
    phone: string;
    addressLine1: string;
    suburb: string | null;
    city: string;
    isDefault: boolean;
  }[];
  wishlist: {
    id: number;
    productId: number;
    name: string;
    imageUrl: string | null;
    price: number | null;
    storeName: string;
    storeSlug: string;
  }[];
  savedStores: {
    id: number;
    merchantId: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    tagline: string | null;
    status: string;
  }[];
  cart: {
    id: number;
    variantId: number;
    quantity: number;
    sku: string;
    title: string;
    size: string | null;
    color: string | null;
    price: number;
    salePrice: number | null;
    productName: string;
    availability?: string;
    imageUrl: string | null;
    merchantId: number;
    storeName: string;
    storeSlug: string;
    fulfillmentMethods: string[];
    paymentMethods: string[];
  }[];
  orders: {
    id: number;
    reference: string;
    status: string;
    paymentStatus: string;
    paymentProof: {
      id: number;
      status: string;
      originalName: string;
      reviewNote: string | null;
    } | null;
    paymentInstructions: PaymentInstructions | null;
    total: number;
    subtotal: number;
    deliveryFee: number;
    fulfillmentMethod: string;
    paymentMethod: string;
    createdAt: string;
    storeName: string;
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
    issues: {
      id: number;
      category: string;
      description: string;
      status: string;
      resolution: string | null;
      createdAt: string;
    }[];
  }[];
  conversations: CustomerConversation[];
};
type Tab =
  | "Overview"
  | "Messages"
  | "Orders"
  | "Bookings"
  | "Bag"
  | "Wishlist"
  | "Stores"
  | "Addresses"
  | "Privacy";
const accountTabs: { id: Tab; label: string; icon: string }[] = [
  { id: "Overview", label: "Home", icon: "⌂" },
  { id: "Orders", label: "Orders", icon: "▣" },
  { id: "Bookings", label: "Bookings", icon: "◷" },
  { id: "Messages", label: "Messages", icon: "✦" },
  { id: "Bag", label: "Bag", icon: "▱" },
  { id: "Wishlist", label: "Wishlist", icon: "♡" },
  { id: "Stores", label: "Saved stores", icon: "◇" },
  { id: "Addresses", label: "Addresses", icon: "⌖" },
  { id: "Privacy", label: "Privacy", icon: "◉" },
];
const tabDescriptions: Record<Tab, string> = {
  Overview: "Everything you need to keep your shopping moving.",
  Orders: "Track purchases, payments and fulfilment updates.",
  Bookings: "Manage your service requests and appointments.",
  Messages: "Continue conversations with stores in one place.",
  Bag: "Review your items and complete one secure checkout.",
  Wishlist: "Products you have saved for later.",
  Stores: "Quick access to the businesses you follow.",
  Addresses: "Manage your pickup and delivery details.",
  Privacy: "Control your data and account preferences.",
};
const blankAddress = {
  label: "Home",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  suburb: "",
  city: "Windhoek",
  deliveryNotes: "",
  isDefault: true,
};

export default function AccountPage() {
  const [data, setData] = useState<Account | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [tab, setTab] = useState<Tab>("Overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [address, setAddress] = useState(blankAddress);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [response, conversationResponse] = await Promise.all([
      fetch("/api/account"),
      fetch("/api/conversations"),
    ]);
    if (response.status === 401) return setUnauthorized(true);
    const body = await response.json();
    const conversationBody = conversationResponse.ok
      ? await conversationResponse.json()
      : { conversations: [] };
    if (!response.ok) return setMessage(body.error);
    setData({ ...body, conversations: conversationBody.conversations });
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    const match = accountTabs.find(
      (item) => item.id.toLowerCase() === requested?.toLowerCase(),
    );
    if (match) setTab(match.id);
  }, []);
  async function action(body: object) {
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const result = await response.json();
    setMessage(response.ok ? "Account updated." : result.error);
    if (response.ok) await load();
  }
  async function addAddress(event: FormEvent) {
    event.preventDefault();
    await action({ action: "address", ...address });
    setAddress(blankAddress);
  }
  async function removeAddress(id: number) {
    await fetch("/api/account", {
      method: "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ resource: "address", id }),
    });
    await load();
  }
  async function reply(conversationId: number, text: string) {
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, message: text }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error);
    await load();
  }
  if (unauthorized)
    return (
      <main className="account-gate">
        <a href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <h1>Your NeuroCity account</h1>
        <p>
          Sign in or create a customer account to save stores, products,
          addresses and orders.
        </p>
        <a href="/login?return_to=%2Faccount">Continue to sign in</a>
      </main>
    );
  if (!data)
    return (
      <main className="account-gate">
        <p>Loading your account…</p>
      </main>
    );
  const bagTotal = data.cart.reduce(
    (sum, item) => sum + Number(item.salePrice ?? item.price) * item.quantity,
    0,
  );
  const bookings =
    (data as Account & { bookings?: ServiceBooking[] }).bookings ?? [];
  const firstName = data.user.displayName.trim().split(/\s+/)[0] || "there";
  const bagCount = data.cart.reduce((sum, item) => sum + item.quantity, 0);
  const openConversations = data.conversations.filter(
    (conversation) => conversation.status !== "closed",
  ).length;
  const activeOrders = data.orders.filter(
    (order) => !["completed", "cancelled", "refunded"].includes(order.status),
  );
  const activeBookings = bookings.filter(
    (booking) =>
      !["completed", "declined", "cancelled"].includes(booking.status),
  );
  function tabCount(item: Tab) {
    if (item === "Messages") return openConversations;
    if (item === "Orders") return data.orders.length;
    if (item === "Bookings") return activeBookings.length;
    if (item === "Bag") return bagCount;
    if (item === "Wishlist") return data.wishlist.length;
    if (item === "Stores") return data.savedStores.length;
    if (item === "Addresses") return data.addresses.length;
    return 0;
  }
  return (
    <main className="customer-account" id="main-content">
      <aside className={menuOpen ? "mobile-open" : ""}>
        <button
          className="account-drawer-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Close account menu"
        >
          ×
        </button>
        <a href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <div>
          <span>{data.user.displayName.slice(0, 1).toUpperCase()}</span>
          <strong>{data.user.displayName}</strong>
          <small>{data.user.email}</small>
        </div>
        <nav aria-label="Customer account">
          {accountTabs.map((item) => (
            <button
              key={item.id}
              className={tab === item.id ? "active" : ""}
              onClick={() => {
                setTab(item.id);
                setMenuOpen(false);
              }}
              aria-current={tab === item.id ? "page" : undefined}
            >
              <span className="account-nav-icon" aria-hidden="true">{item.icon}</span>
              <span>{item.label}</span>
              {tabCount(item.id) > 0 && <b>{tabCount(item.id)}</b>}
            </button>
          ))}
        </nav>
        <a href="/api/auth/logout?return_to=/">Sign out</a>
      </aside>
      {menuOpen && (
        <button
          className="account-drawer-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Close account menu"
        />
      )}
      <section>
        <header>
          <button
            className="account-mobile-menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Open account menu"
            aria-expanded={menuOpen}
          >
            <i aria-hidden="true"><span /><span /><span /></i>
            <span>Menu</span>
          </button>
          <div className="account-heading-copy">
            <p className="eyebrow">Customer account</p>
            <h1>{tab === "Overview" ? `Hello, ${firstName}` : tab}</h1>
            <p>{tabDescriptions[tab]}</p>
          </div>
          <div className="account-header-actions">
            <button onClick={() => setTab("Bag")} className="account-bag-shortcut">
              Bag <b>{bagCount}</b>
            </button>
            <a href="/marketplace">Explore marketplace</a>
          </div>
        </header>
        {message && (
          <button className="workspace-message" onClick={() => setMessage("")}>
            {message} ×
          </button>
        )}
        {tab === "Overview" && (
          <>
            <section className="customer-welcome-card">
              <div>
                <p className="eyebrow">Your shopping space</p>
                <h2>What would you like to do?</h2>
                <p>
                  Discover local stores, ask Selma for help, or pick up where
                  you left off.
                </p>
              </div>
              <div className="customer-quick-actions">
                <a href="/marketplace"><span aria-hidden="true">⌕</span> Browse stores</a>
                <button onClick={() => window.dispatchEvent(new Event("neurocity:open-selma"))}><span aria-hidden="true">✦</span> Ask Selma</button>
                <button onClick={() => setTab("Bag")}><span aria-hidden="true">▱</span> Open bag</button>
              </div>
            </section>
            <div className="account-metrics">
              <article className={activeOrders.length ? "has-activity" : ""}>
                <span>Active orders</span>
                <strong>{activeOrders.length}</strong>
                <small>{activeOrders.length ? "Being processed" : "Nothing pending"}</small>
              </article>
              <article>
                <span>Bag total</span>
                <strong>N${bagTotal.toFixed(2)}</strong>
                <small>{bagCount} {bagCount === 1 ? "item" : "items"}</small>
              </article>
              <article>
                <span>Active bookings</span>
                <strong>{activeBookings.length}</strong>
                <small>{activeBookings.length ? "Awaiting completion" : "No appointments"}</small>
              </article>
              <article>
                <span>Store messages</span>
                <strong>{openConversations}</strong>
                <small>{openConversations ? "Open conversations" : "You're all caught up"}</small>
              </article>
            </div>
            <div className="customer-overview-grid">
              <div className="account-panel">
                <div className="account-panel-title">
                  <div>
                    <span className="account-section-kicker">Purchases</span>
                    <h2>{activeOrders.length ? "Orders in progress" : "Recent orders"}</h2>
                  </div>
                  {data.orders.length > 0 && <button onClick={() => setTab("Orders")}>View all</button>}
                </div>
                {(activeOrders.length ? activeOrders : data.orders).slice(0, 3).map((order) => (
                  <OrderRow key={order.id} order={order} />
                ))}
                {data.orders.length === 0 && (
                  <div className="overview-empty">
                    <span aria-hidden="true">▣</span>
                    <div><strong>No orders yet</strong><p>Your purchases and live tracking will appear here.</p></div>
                    <a href="/marketplace">Start shopping</a>
                  </div>
                )}
              </div>
              <aside className="customer-next-panel">
                <span className="account-section-kicker">At a glance</span>
                <h2>Your saved corner</h2>
                <button onClick={() => setTab("Wishlist")}>
                  <span>Wishlist</span><strong>{data.wishlist.length}</strong>
                </button>
                <button onClick={() => setTab("Stores")}>
                  <span>Saved stores</span><strong>{data.savedStores.length}</strong>
                </button>
                <button onClick={() => setTab("Addresses")}>
                  <span>Delivery addresses</span><strong>{data.addresses.length}</strong>
                </button>
              </aside>
            </div>
          </>
        )}
        {tab === "Orders" && (
          <div className="account-list">
            {data.orders.map((order) => (
              <div className="customer-order-group" key={order.id}>
                <OrderRow order={order} />
                <OrderActions order={order} />
              </div>
            ))}
            {data.orders.length === 0 && (
              <Empty text="Your orders and tracking updates will appear here." />
            )}
          </div>
        )}
        {tab === "Bookings" && (
          <div className="account-list">
            {bookings.map((booking) => (
              <CustomerBooking
                key={booking.id}
                booking={booking}
                reload={load}
                setMessage={setMessage}
              />
            ))}
            {bookings.length === 0 && (
              <Empty text="Your service requests and confirmed appointments will appear here." />
            )}
          </div>
        )}
        {tab === "Messages" && (
          <div className="inbox-list">
            {data.conversations.map((conversation) => (
              <CustomerThread
                key={conversation.id}
                conversation={conversation}
                onReply={reply}
              />
            ))}
            {data.conversations.length === 0 && (
              <Empty text="Questions you send to stores will appear here." />
            )}
          </div>
        )}
        {tab === "Bag" && (
          <CheckoutBag
            data={data}
            total={bagTotal}
            updateCart={action}
            reload={load}
            setMessage={setMessage}
            setTab={setTab}
          />
        )}
        {tab === "Wishlist" && (
          <div className="account-grid">
            {data.wishlist.map((item) => (
              <article key={item.id}>
                {item.imageUrl && <img src={item.imageUrl} alt="" />}
                <h3>{item.name}</h3>
                <p>{item.storeName}</p>
                <div>
                  <a href={`/stores/${item.storeSlug}`}>View product</a>
                  <button
                    onClick={() =>
                      action({ action: "wishlist", productId: item.productId })
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            {data.wishlist.length === 0 && (
              <Empty text="Products you save will appear here." />
            )}
          </div>
        )}
        {tab === "Stores" && (
          <div className="account-grid">
            {data.savedStores.map((store) => (
              <article key={store.id}>
                {store.logoUrl && <img src={store.logoUrl} alt="" />}
                <h3>{store.name}</h3>
                <p>{store.tagline}</p>
                <div>
                  <a href={`/stores/${store.slug}`}>Visit store</a>
                  <button
                    onClick={() =>
                      action({ action: "store", merchantId: store.merchantId })
                    }
                  >
                    Remove
                  </button>
                </div>
              </article>
            ))}
            {data.savedStores.length === 0 && (
              <Empty text="Save local stores for quick access." />
            )}
          </div>
        )}
        {tab === "Addresses" && (
          <div className="address-layout">
            <div className="account-list">
              {data.addresses.map((item) => (
                <article className="address-card" key={item.id}>
                  <div>
                    <strong>
                      {item.label}
                      {item.isDefault ? " · Default" : ""}
                    </strong>
                    <span>
                      {item.recipientName} · {item.phone}
                    </span>
                    <p>
                      {item.addressLine1}
                      {item.suburb ? `, ${item.suburb}` : ""}, {item.city}
                    </p>
                  </div>
                  <button onClick={() => removeAddress(item.id)}>Remove</button>
                </article>
              ))}
            </div>
            <form onSubmit={addAddress}>
              <h2>Add delivery address</h2>
              <label>
                Label
                <input
                  value={address.label}
                  onChange={(event) =>
                    setAddress({ ...address, label: event.target.value })
                  }
                />
              </label>
              <label>
                Recipient
                <input
                  required
                  value={address.recipientName}
                  onChange={(event) =>
                    setAddress({
                      ...address,
                      recipientName: event.target.value,
                    })
                  }
                />
              </label>
              <label>
                Phone
                <input
                  required
                  value={address.phone}
                  onChange={(event) =>
                    setAddress({ ...address, phone: event.target.value })
                  }
                />
              </label>
              <label>
                Street address
                <input
                  required
                  value={address.addressLine1}
                  onChange={(event) =>
                    setAddress({ ...address, addressLine1: event.target.value })
                  }
                />
              </label>
              <label>
                Suburb
                <input
                  value={address.suburb}
                  onChange={(event) =>
                    setAddress({ ...address, suburb: event.target.value })
                  }
                />
              </label>
              <label>
                City
                <input
                  value={address.city}
                  onChange={(event) =>
                    setAddress({ ...address, city: event.target.value })
                  }
                />
              </label>
              <label className="address-default">
                <input
                  type="checkbox"
                  checked={address.isDefault}
                  onChange={(event) =>
                    setAddress({ ...address, isDefault: event.target.checked })
                  }
                />{" "}
                Make default
              </label>
              <button>Add address</button>
            </form>
          </div>
        )}
        {tab === "Privacy" && (
          <div className="account-panel privacy-centre">
            <p className="eyebrow">Your information</p>
            <h2>Privacy controls</h2>
            <p>Download a portable JSON copy of the account, addresses, bag, saved items, orders, bookings and companion preferences linked to you.</p>
            <div className="privacy-actions">
              <a href="/api/account/privacy" download>Download my information</a>
              <a href="/privacy">Read the privacy notice</a>
            </div>
            <hr />
            <h3>Request account deletion</h3>
            <p>This submits a review request. Transaction or verification records that NeuroCity must keep for legal, accounting, fraud or dispute purposes will be restricted and retained only as required.</p>
            <button onClick={async () => {
              if (!window.confirm("Submit an account deletion request? You can continue using your account while it is reviewed.")) return;
              const response = await fetch("/api/account/privacy", { method: "DELETE" });
              const result = await response.json();
              setMessage(result.message ?? result.error);
            }}>Request account deletion</button>
          </div>
        )}
      </section>
    </main>
  );
}

function CustomerBooking({
  booking,
  reload,
  setMessage,
}: {
  booking: ServiceBooking;
  reload: () => Promise<void>;
  setMessage: (message: string) => void;
}) {
  async function cancel() {
    if (!window.confirm(`Cancel ${booking.reference}?`)) return;
    const response = await fetch("/api/service-bookings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: booking.id, action: "cancel" }),
    });
    const result = await response.json();
    setMessage(response.ok ? `${booking.reference} cancelled.` : result.error);
    if (response.ok) await reload();
  }
  const appointment = booking.scheduledStart ?? booking.requestedStart;
  return (
    <article className="account-order expanded">
      <div>
        <span>{booking.reference}</span>
        <strong>{booking.storeName}</strong>
        <small>{booking.serviceName}</small>
      </div>
      <div>
        <span className="order-status">
          {booking.status.replaceAll("_", " ")}
        </span>
        <small>
          {new Date(appointment).toLocaleString("en-NA")} ·{" "}
          {(booking.serviceMode ?? "at_business").replaceAll("_", " ")}
        </small>
      </div>
      <strong>
        {booking.pricingModel === "quote" || booking.priceSnapshot === null
          ? "Quote"
          : `N$${Number(booking.priceSnapshot).toFixed(2)}`}
      </strong>
      <div className="customer-order-detail">
        <p>
          <span>
            {booking.durationMinutes
              ? `${booking.durationMinutes} minutes`
              : "Duration to be confirmed"}
          </span>
          {booking.merchantNote && <small>{booking.merchantNote}</small>}
        </p>
        <div>
          <a href={`/stores/${booking.storeSlug}`}>View provider</a>
          {["requested", "confirmed", "reschedule_proposed"].includes(
            booking.status,
          ) && <button onClick={cancel}>Cancel booking</button>}
        </div>
      </div>
    </article>
  );
}

function CheckoutBag({
  data,
  total,
  updateCart,
  reload,
  setMessage,
  setTab,
}: {
  data: Account;
  total: number;
  updateCart: (body: object) => Promise<void>;
  reload: () => Promise<void>;
  setMessage: (message: string) => void;
  setTab: (tab: Tab) => void;
}) {
  const [checkoutMerchant, setCheckoutMerchant] = useState<number | null>(null);
  const [fulfillment, setFulfillment] = useState("pickup");
  const [addressId, setAddressId] = useState<number | null>(
    data.addresses.find((item) => item.isDefault)?.id ??
      data.addresses[0]?.id ??
      null,
  );
  const [notes, setNotes] = useState("");
  const [placing, setPlacing] = useState(false);
  const [confirmation, setConfirmation] = useState<{
    reference: string;
    total: number;
    paymentMethod: string;
    paymentInstructions: PaymentInstructions | null;
    paymentUrl?: string | null;
    paymentError?: string | null;
  } | null>(null);
  const [deliveryQuote, setDeliveryQuote] = useState<{
    supported: boolean;
    deliveryFee?: number;
    area?: string;
    estimatedTime?: string;
    error?: string;
  } | null>(null);
  const [quoting, setQuoting] = useState(false);
  const merchants = [
    ...new Map(
      data.cart.map((item) => [
        item.merchantId,
        {
          id: item.merchantId,
          name: item.storeName,
          fulfillmentMethods: item.fulfillmentMethods,
          paymentMethods: item.paymentMethods,
        },
      ]),
    ).values(),
  ];
  const checkoutItems = data.cart;
  const checkoutTotal = total;
  const deliveryFee =
    fulfillment === "merchant_delivery" && deliveryQuote?.supported
      ? Number(deliveryQuote.deliveryFee ?? 0)
      : 0;
  useEffect(() => {
    if (
      fulfillment !== "merchant_delivery" ||
      !checkoutMerchant ||
      !addressId
    ) {
      setDeliveryQuote(null);
      setQuoting(false);
      return;
    }
    const controller = new AbortController();
    setQuoting(true);
    fetch(
      `/api/orders/quote?addressId=${addressId}`,
      { signal: controller.signal },
    )
      .then(async (response) => {
        const result = await response.json();
        if (!controller.signal.aborted) setDeliveryQuote(result);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setDeliveryQuote({
            supported: false,
            error: "Delivery could not be checked. Please try again.",
          });
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuoting(false);
      });
    return () => controller.abort();
  }, [checkoutMerchant, addressId, fulfillment]);
  useEffect(() => {
    if (fulfillment !== "merchant_delivery" || !checkoutMerchant) return;
  }, [fulfillment, checkoutMerchant]);
  function begin() {
    const methods = merchants.length ? merchants[0].fulfillmentMethods.filter((method) => merchants.every((merchant) => merchant.fulfillmentMethods.includes(method))) : [];
    setCheckoutMerchant(-1);
    setFulfillment(
      methods.includes("pickup") ? "pickup" : (methods[0] ?? "pickup"),
    );
    setDeliveryQuote(null);
    setConfirmation(null);
  }
  async function placeOrder() {
    if (!checkoutMerchant) return;
    setPlacing(true);
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fulfillment: merchants.map((merchant) => ({ merchantId: merchant.id, addressId, fulfillmentMethod: fulfillment })),
        customerNotes: notes,
      }),
    });
    const result = await response.json();
    setPlacing(false);
    if (!response.ok) return setMessage(result.error);
    if (result.checkout.paymentUrl) {
      setMessage("Opening PayToday secure payment…");
      window.location.assign(result.checkout.paymentUrl);
      return;
    }
    setConfirmation({ reference: result.checkout.reference, total: result.checkout.total, paymentMethod: "paytoday", paymentInstructions: null });
    setMessage(`${result.checkout.reference} created for ${result.checkout.merchantCount} stores.`);
    await reload();
  }
  if (confirmation)
    return (
      <section className="checkout-success">
        <span>✓</span>
        <p className="eyebrow">Order confirmed</p>
        <h2>{confirmation.reference}</h2>
        <p>Your order has been sent to the merchant for confirmation.</p>
        <strong>N${Number(confirmation.total).toFixed(2)}</strong>
        {confirmation.paymentError && <p className="checkout-warning">{confirmation.paymentError} Your order is saved; choose it under Orders to retry payment.</p>}
        <button onClick={() => setTab("Orders")}>Track these orders</button>
      </section>
    );
  if (checkoutMerchant) {
    const methods = merchants.length ? merchants[0].fulfillmentMethods.filter((method) => merchants.every((merchant) => merchant.fulfillmentMethods.includes(method))) : [];
    return (
      <section className="account-checkout">
        <header>
          <button onClick={() => setCheckoutMerchant(null)}>← Bag</button>
          <div>
            <p className="eyebrow">Secure checkout</p>
            <h2>{merchants.length} {merchants.length === 1 ? "store" : "stores"} · one payment</h2>
          </div>
        </header>
        <ol className="checkout-progress" aria-label="Checkout progress">
          <li className="complete"><span>1</span><b>Bag</b></li>
          <li className="current"><span>2</span><b>Delivery &amp; payment</b></li>
          <li><span>3</span><b>Confirmation</b></li>
        </ol>
        <div className="checkout-layout">
          <div>
            <section>
              <h3>1. Fulfilment</h3>
              <div className="checkout-options">
                {methods.includes("pickup") && (
                  <label className={fulfillment === "pickup" ? "selected" : ""}>
                    <input
                      type="radio"
                      checked={fulfillment === "pickup"}
                      onChange={() => setFulfillment("pickup")}
                    />
                    <span>
                      <b>Customer pickup</b>
                      <small>Collect directly from the store</small>
                    </span>
                  </label>
                )}
                {methods.includes("merchant_delivery") && (
                  <label
                    className={
                      fulfillment === "merchant_delivery" ? "selected" : ""
                    }
                  >
                    <input
                      type="radio"
                      checked={fulfillment === "merchant_delivery"}
                      onChange={() => setFulfillment("merchant_delivery")}
                    />
                    <span>
                      <b>Merchant delivery</b>
                      <small>Fee calculated from your suburb</small>
                    </span>
                  </label>
                )}
              </div>
              {fulfillment === "merchant_delivery" && (
                <label className="checkout-address">
                  Delivery address
                  <select
                    value={addressId ?? ""}
                    onChange={(event) =>
                      setAddressId(Number(event.target.value))
                    }
                  >
                    <option value="" disabled>
                      Choose an address
                    </option>
                    {data.addresses.map((address) => (
                      <option key={address.id} value={address.id}>
                        {address.label} — {address.addressLine1}
                        {address.suburb ? `, ${address.suburb}` : ""}
                      </option>
                    ))}
                  </select>
                  {data.addresses.length === 0 && (
                    <small>
                      Add an address under Addresses before choosing delivery.
                    </small>
                  )}
                  {addressId && (
                    <span
                      className={`delivery-quote ${deliveryQuote?.supported ? "supported" : deliveryQuote && !quoting ? "unsupported" : ""}`}
                    >
                      {quoting
                        ? "Checking this delivery area…"
                        : deliveryQuote?.supported
                          ? `Delivery to ${deliveryQuote.area}: N$${Number(deliveryQuote.deliveryFee).toFixed(2)} · ${deliveryQuote.estimatedTime}`
                          : deliveryQuote?.error}
                    </span>
                  )}
                </label>
              )}
            </section>
            <section>
              <h3>2. Payment</h3>
              <div className="checkout-options">
                <div className="selected"><span><b>PayToday secure payment</b><small>One payment to NeuroCity for the complete bag</small></span></div>
              </div>
            </section>
            <section>
              <h3>3. Order note</h3>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional pickup or delivery instructions"
                maxLength={1000}
              />
            </section>
          </div>
          <aside>
            <div className="checkout-summary-heading"><div><small>ONE PAYMENT</small><h3>Order summary</h3></div><b>{checkoutItems.reduce((sum, item) => sum + item.quantity, 0)} items</b></div>
            {merchants.map((merchant) => (
              <section className="checkout-merchant-group" key={merchant.id}>
                <header><span>{merchant.name}</span><small>{checkoutItems.filter((item) => item.merchantId === merchant.id).length} lines</small></header>
                {checkoutItems.filter((item) => item.merchantId === merchant.id).map((item) => (
                  <article key={item.id}>
                    <div><b>{item.productName}</b>{item.availability === "preorder" && <small>Preorder only · Merchant confirms fulfilment date</small>}<small>{[item.size, item.color].filter(Boolean).join(" / ") || item.title} · Qty {item.quantity}</small></div>
                    <strong>N${(Number(item.salePrice ?? item.price) * item.quantity).toFixed(2)}</strong>
                  </article>
                ))}
              </section>
            ))}
            <div className="checkout-totals">
              <span>
                Subtotal <b>N${checkoutTotal.toFixed(2)}</b>
              </span>
              <span>
                Delivery{" "}
                <b>{quoting ? "Checking…" : `N$${deliveryFee.toFixed(2)}`}</b>
              </span>
              <strong>
                Total <b>N${(checkoutTotal + deliveryFee).toFixed(2)}</b>
              </strong>
            </div>
            <button
              disabled={
                placing ||
                (fulfillment === "merchant_delivery" &&
                  (!addressId ||
                    quoting ||
                    !deliveryQuote?.supported))
              }
              onClick={placeOrder}
            >
              {placing ? "Checking stock and creating order…" : `Pay N$${(checkoutTotal + deliveryFee).toFixed(2)} with PayToday`}
            </button>
            <small>
              Prices, inventory and delivery eligibility are checked again
              before the order is created.
            </small>
          </aside>
        </div>
      </section>
    );
  }
  return (
    <div className="account-panel bag-checkout">
      <div className="account-panel-title">
        <div>
          <h2>Shopping bag</h2>
          <small>Everything in your bag is paid in one secure checkout.</small>
        </div>
        <strong>N${total.toFixed(2)}</strong>
      </div>
      {merchants.map((merchant) => {
        const items = data.cart.filter(
          (item) => item.merchantId === merchant.id,
        );
        const merchantTotal = items.reduce(
          (sum, item) =>
            sum + Number(item.salePrice ?? item.price) * item.quantity,
          0,
        );
        return (
          <section className="bag-store" key={merchant.id}>
            <header>
              <div>
                <small>STORE</small>
                <h3>{merchant.name}</h3>
              </div>
              <strong>N${merchantTotal.toFixed(2)}</strong>
            </header>
            {items.map((item) => (
              <article className="account-product-row" key={item.id}>
                {item.imageUrl && <img src={item.imageUrl} alt="" />}
                <div>
                  <strong>{item.productName}</strong>
                  {item.availability === "preorder" && <small>Preorder only · Merchant confirms fulfilment date</small>}
                  <span>
                    {[item.size, item.color].filter(Boolean).join(" / ") ||
                      item.title}{" "}
                    · {item.sku}
                  </span>
                </div>
                <div className="bag-quantity" aria-label={`Quantity for ${item.productName}`}>
                  <button aria-label={`Remove one ${item.productName}`} onClick={() => updateCart({ action: "cart", variantId: item.variantId, quantity: Math.max(0, item.quantity - 1) })}>−</button>
                  <span>{item.quantity}</span>
                  <button aria-label={`Add one ${item.productName}`} disabled={item.quantity >= 20} onClick={() => updateCart({ action: "cart", variantId: item.variantId, quantity: item.quantity + 1 })}>+</button>
                </div>
                <b>
                  N$
                  {(
                    Number(item.salePrice ?? item.price) * item.quantity
                  ).toFixed(2)}
                </b>
              </article>
            ))}
          </section>
        );
      })}
      {data.cart.length > 0 && <button className="checkout-store-button" onClick={() => begin()}>Checkout entire bag · N${total.toFixed(2)}</button>}
      {data.cart.length === 0 && (
        <Empty text="Your saved bag will follow you across devices." />
      )}
    </div>
  );
}
function OrderRow({ order }: { order: Account["orders"][number] }) {
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [paymentMessage, setPaymentMessage] = useState("");
  const pickup = order.fulfillmentMethod === "pickup";
  const journey = pickup
    ? ["pending_merchant_confirmation", "accepted", "preparing", "ready_for_pickup", "collected", "completed"]
    : ["pending_merchant_confirmation", "accepted", "preparing", "dispatched", "delivered", "completed"];
  const terminal = ["rejected", "cancelled"].includes(order.status);
  const currentStep = journey.indexOf(order.status);
  const customerGuidance: Record<string, string> = {
    pending_merchant_confirmation: `${order.storeName} is checking your items.`,
    accepted: order.paymentMethod === "eft" && order.paymentStatus !== "paid" ? "Complete or verify payment so the store can prepare your order." : "Your order was accepted and will be prepared next.",
    preparing: "The store is preparing your items.",
    ready_for_pickup: "Your order is ready. Take your order reference when collecting.",
    dispatched: "Your order has left the store and is on its way.",
    collected: "Collection was recorded. The store will close the order shortly.",
    delivered: "Delivery was recorded. The store will close the order shortly.",
    completed: "Your order is complete. Thank you for shopping local.",
    rejected: "The store could not fulfil this order. Reserved stock has been released.",
    cancelled: "This order was cancelled. Reserved stock has been released.",
  };
  async function uploadProof(file?: File) {
    if (!file) return;
    setUploading(true);
    const response = await fetch("/api/orders/payment-proof", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orderId: order.id,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setPaymentMessage(data.error);
      setUploading(false);
      return;
    }
    const upload = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!upload.ok) {
      setPaymentMessage("Upload failed. Please try again.");
      setUploading(false);
      return;
    }
    const complete = await fetch("/api/orders/payment-proof", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id }),
    });
    const completed = await complete.json();
    setPaymentMessage(
      complete.ok
        ? "Proof submitted for verification. Refresh to see the latest status."
        : completed.error,
    );
    setUploading(false);
  }
  return (
    <article
      className={`account-order ${open ? "expanded" : ""}`}
      onClick={() => setOpen(!open)}
    >
      <div>
        <span>{order.reference}</span>
        <strong>{order.storeName}</strong>
        <small>{new Date(order.createdAt).toLocaleDateString("en-NA")}</small>
      </div>
      <div>
        <span className="order-status">
          {order.status.replaceAll("_", " ")}
        </span>
        <small>
          {order.fulfillmentMethod.replaceAll("_", " ")} · Payment{" "}
          {order.paymentStatus.replaceAll("_", " ")}
        </small>
      </div>
      <strong>N${Number(order.total).toFixed(2)}</strong>
      {open && (
        <div
          className="customer-order-detail"
          onClick={(event) => event.stopPropagation()}
        >
          <h4>Items</h4>
          {order.items.map((item) => (
            <p key={item.id}>
              <span>
                {item.quantity}× {item.nameSnapshot} ·{" "}
                {[item.sizeSnapshot, item.colorSnapshot]
                  .filter(Boolean)
                  .join(" / ") || item.variantSnapshot}
              </span>
              <b>
                N$
                {Number(
                  item.lineTotal || item.unitPrice * item.quantity,
                ).toFixed(2)}
              </b>
            </p>
          ))}
          {order.paymentMethod === "eft" && order.paymentStatus !== "paid" && (
            <section className="customer-payment-proof">
              {order.paymentInstructions && (
                <PaymentInstructionsCard
                  instructions={order.paymentInstructions}
                  reference={order.reference}
                />
              )}
              <h4>Payment proof</h4>
              <p>
                {order.paymentProof
                  ? `Current proof: ${order.paymentProof.status.replaceAll("_", " ")}`
                  : "Upload your EFT confirmation for merchant verification."}
              </p>
              {order.paymentProof?.reviewNote && (
                <small>{order.paymentProof.reviewNote}</small>
              )}
              <label>
                {uploading
                  ? "Uploading…"
                  : order.paymentProof
                    ? "Replace proof"
                    : "Upload proof"}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png"
                  disabled={uploading}
                  onChange={(event) => uploadProof(event.target.files?.[0])}
                />
              </label>
              {order.paymentProof && (
                <a
                  href={`/api/orders/payment-proof?orderId=${order.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View uploaded proof
                </a>
              )}
              {paymentMessage && <span>{paymentMessage}</span>}
            </section>
          )}
          <section className={`customer-order-journey ${terminal ? "terminal" : ""}`}>
            <div><small>WHAT’S HAPPENING</small><strong>{customerGuidance[order.status] ?? "Check the latest order update below."}</strong></div>
            {!terminal && <div className="customer-step-track">
              {journey.map((status, index) => <span key={status} className={`${index < currentStep ? "done" : ""} ${index === currentStep ? "current" : ""}`}><i>{index < currentStep ? "✓" : index + 1}</i><b>{status === "pending_merchant_confirmation" ? "Placed" : status.replaceAll("_", " ")}</b></span>)}
            </div>}
          </section>
          <details className="customer-order-history">
            <summary>View detailed order history</summary>
            <ol>
            {order.events
              .slice()
              .reverse()
              .map((event) => (
                <li key={event.id}>
                  <b>{event.status.replaceAll("_", " ")}</b>
                  <small>
                    {new Date(event.createdAt).toLocaleString("en-NA")}
                  </small>
                </li>
              ))}
            </ol>
          </details>
        </div>
      )}
    </article>
  );
}
function PaymentInstructionsCard({
  instructions,
  reference,
}: {
  instructions: PaymentInstructions;
  reference: string;
}) {
  return (
    <div className="payment-instructions">
      <p className="eyebrow">EFT instructions</p>
      <h3>Pay {instructions.bankName}</h3>
      <dl>
        <div>
          <dt>Account holder</dt>
          <dd>{instructions.accountHolder}</dd>
        </div>
        <div>
          <dt>Account type</dt>
          <dd>{instructions.accountType}</dd>
        </div>
        <div>
          <dt>Account number</dt>
          <dd>{instructions.accountNumber}</dd>
        </div>
        <div>
          <dt>Branch code</dt>
          <dd>{instructions.branchCode}</dd>
        </div>
        <div>
          <dt>Payment reference</dt>
          <dd>{reference}</dd>
        </div>
      </dl>
      <p>{instructions.referenceInstructions}</p>
    </div>
  );
}
function OrderActions({ order }: { order: Account["orders"][number] }) {
  const [message, setMessage] = useState("");
  async function cancel() {
    const reason = window.prompt("Why are you cancelling this order?")?.trim();
    if (!reason) return;
    const response = await fetch("/api/orders", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, reason }),
    });
    const data = await response.json();
    setMessage(
      response.ok
        ? "Order cancelled. Refresh to see the updated status."
        : data.error,
    );
  }
  async function report() {
    const category = window
      .prompt(
        "Issue type: payment, order_change, delivery, product, refund or other",
        "other",
      )
      ?.trim();
    if (!category) return;
    const description = window
      .prompt("Describe the issue for NeuroCity support")
      ?.trim();
    if (!description) return;
    const response = await fetch("/api/orders/issues", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId: order.id, category, description }),
    });
    const data = await response.json();
    setMessage(response.ok ? "Issue sent to NeuroCity support." : data.error);
  }
  return (
    <section className="customer-order-actions">
      {order.issues?.map((issue) => (
        <div className={`customer-issue issue-${issue.status}`} key={issue.id}>
          <b>
            {issue.category.replaceAll("_", " ")} · {issue.status}
          </b>
          <span>{issue.description}</span>
          {issue.resolution && <small>Resolution: {issue.resolution}</small>}
        </div>
      ))}
      <div>
        {order.status === "pending_payment" && order.paymentStatus !== "paid" && <button onClick={cancel}>Cancel checkout order</button>}
        {!order.issues?.some((issue) => issue.status === "open") && (
          <button onClick={report}>Report an issue</button>
        )}
      </div>
      {message && <p>{message}</p>}
    </section>
  );
}
function CustomerThread({
  conversation,
  onReply,
}: {
  conversation: CustomerConversation;
  onReply: (id: number, text: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <article className="inbox-thread customer-thread">
      <header>
        <div>
          <span className={`review-status status-${conversation.status}`}>
            {conversation.status}
          </span>
          <h3>{conversation.subject}</h3>
          <p>
            {conversation.storeName}
            {conversation.productName ? ` · ${conversation.productName}` : ""}
          </p>
        </div>
        <a href={`/stores/${conversation.storeSlug}`}>Visit store</a>
      </header>
      <div className="thread-messages">
        {conversation.messages.map((message) => (
          <div
            className={
              message.senderRole === "customer"
                ? "customer-message"
                : "merchant-message"
            }
            key={message.id}
          >
            <strong>{message.senderName}</strong>
            <p>{message.body}</p>
            <small>{new Date(message.createdAt).toLocaleString("en-NA")}</small>
          </div>
        ))}
      </div>
      {conversation.status !== "closed" && (
        <footer>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Reply to the store…"
          />
          <button
            disabled={!text.trim()}
            onClick={() => {
              onReply(conversation.id, text);
              setText("");
            }}
          >
            Send message
          </button>
        </footer>
      )}
    </article>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="account-empty">
      <strong>Nothing here yet</strong>
      <p>{text}</p>
      <a href="/">Explore NeuroCity</a>
    </div>
  );
}
