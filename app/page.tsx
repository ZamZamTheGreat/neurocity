"use client";

import { useEffect, useMemo, useState } from "react";
import MerchantWorkspace from "./components/MerchantWorkspace";

type Product = {
  id: number;
  name: string;
  collection: string;
  price: number | null;
  image: string;
  badge: string;
};

const starterProducts: Product[] = [
  { id: 1, name: "Crown V1 Cuffed Tracksuit", collection: "Crown V1", price: 1249.99, image: "/lightwork-crown-v1.png", badge: "Price to confirm" },
  { id: 2, name: "Metallic 23 Longsleeve", collection: "Metallic 23", price: null, image: "/lightwork-metallic-23.jpeg", badge: "Coming to the pilot" },
  { id: 3, name: "Majesteric Zip Hoodie", collection: "Majesteric Edition", price: null, image: "/lightwork-majesteric.jpeg", badge: "4 colourways" },
  { id: 4, name: "Esoteric Tee & Shorts", collection: "Esoteric", price: null, image: "/lightwork-esoteric.jpeg", badge: "Details to confirm" },
];

const categories = [
  { name: "Fashion", detail: "Streetwear, essentials and local labels", count: "Pilot open", icon: "F" },
  { name: "Beauty & care", detail: "Everyday care from trusted local stores", count: "Recruiting", icon: "B" },
  { name: "Gifts & living", detail: "Thoughtful finds for home and occasions", count: "Recruiting", icon: "G" },
];

function money(value: number | null) {
  return value === null ? "Confirm with store" : `N$${new Intl.NumberFormat("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

export default function Home() {
  const [view, setView] = useState<"mall" | "store" | "merchant">("mall");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<number[]>([]);
  const [catalogue, setCatalogue] = useState<Product[]>(starterProducts);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [fulfillment, setFulfillment] = useState<"pickup" | "merchant_delivery">("pickup");
  const [payment, setPayment] = useState<"online" | "pay_on_collection">("pay_on_collection");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [merchantStats, setMerchantStats] = useState({ products: 4, publishedProducts: 0, orders: 0, readiness: 42 });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    fetch("/api/catalogue").then((response) => response.ok ? response.json() : Promise.reject()).then((data) => {
      if (Array.isArray(data.products)) setCatalogue(data.products.map((product: Product & { imageUrl?: string }) => ({ ...product, image: product.imageUrl ?? product.image })));
    }).catch(() => setNotice("Using the private pilot catalogue while the hosted database initializes."));
  }, []);

  useEffect(() => {
    if (view !== "merchant") return;
    fetch("/api/merchant/overview").then((response) => response.ok ? response.json() : Promise.reject()).then(setMerchantStats).catch(() => undefined);
  }, [view]);

  const filtered = useMemo(() => catalogue.filter((p) => `${p.name} ${p.collection}`.toLowerCase().includes(query.toLowerCase())), [query, catalogue]);
  const cartTotal = cart.reduce((sum, id) => sum + (catalogue.find((p) => p.id === id)?.price ?? 0), 0);

  function addToCart(product: Product) {
    if (product.price === null) {
      setNotice(`${product.name} is in pilot review. Ask LightWork to confirm price and availability.`);
      setAssistantOpen(true);
      return;
    }
    setCart((current) => current.includes(product.id) ? current : [...current, product.id]);
    setNotice(`${product.name} added to your LightWork order.`);
  }

  async function placeOrder() {
    setPlacingOrder(true);
    try {
      const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ productIds: cart, fulfillmentMethod: fulfillment, paymentMethod: payment }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Order creation failed");
      setCart([]);
      setCheckoutOpen(false);
      setNotice(`${data.order.reference} created · ${data.order.status.replaceAll("_", " ")}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Order creation failed");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <main>
      <header className="topbar">
        <button className="brand" onClick={() => setView("mall")} aria-label="Go to NeuroCity mall home">
          <span>Neuro</span><strong>City</strong>
        </button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <button className={view === "mall" ? "active" : ""} onClick={() => setView("mall")}>Discover</button>
          <button className={view === "store" ? "active" : ""} onClick={() => setView("store")}>LightWork</button>
          <button className={view === "merchant" ? "active" : ""} onClick={() => setView("merchant")}>Merchant portal</button>
          <button onClick={() => { window.location.href = "/apply"; }}>Apply to sell</button>
          <button onClick={() => { window.location.href = "/application-status"; }}>Track application</button>
          <button onClick={() => { window.location.href = "/application-documents"; }}>Upload documents</button>
          <button onClick={() => { window.location.href = "/login"; }}>Sign in</button>
        </nav>
        <div className="header-actions">
          <button className="city-pill">Windhoek <span>•</span></button>
          <button className="cart-button" onClick={() => cart.length ? setCheckoutOpen(true) : setNotice("Your mall basket is empty.")}>
            Bag <b>{cart.length}</b>
          </button>
        </div>
      </header>

      {view === "mall" && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow"><span /> Your Windhoek mall, online</p>
              <h1>Your city.<br />Your stores.<br /><em>One place.</em></h1>
              <p className="hero-lede">Discover trusted local brands, ask better shopping questions, and arrange pickup or delivery without leaving the city.</p>
              <div className="search-shell">
                <span aria-hidden="true">⌕</span>
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Try “black outfit under N$1,500”" aria-label="Search NeuroCity" />
                <button onClick={() => setView("store")}>Search</button>
              </div>
              <div className="trust-row"><span>Curated stores</span><span>Local pickup</span><span>Merchant delivery</span></div>
            </div>
            <div className="hero-city" aria-label="NeuroCity pilot summary">
              <div className="city-orbit orbit-one" /><div className="city-orbit orbit-two" />
              <div className="city-card main-card"><span>PILOT STORE 01</span><img src="/lightwork-logo.png" alt="LightWork Clothing" /><small>Baines Centre · Pioneerspark</small><button onClick={() => setView("store")}>Enter store →</button></div>
              <div className="float-card top-float"><b>3</b><span>pilot categories</span></div>
              <div className="float-card bottom-float"><i /> <span>Merchant delivery<br /><b>Windhoek</b></span></div>
            </div>
          </section>

          <section className="section">
            <div className="section-heading"><div><p className="eyebrow">Explore the city</p><h2>One mall. Distinct local stores.</h2></div><p>NeuroCity gives every merchant a real storefront—not just a listing.</p></div>
            <div className="category-grid">
              {categories.map((category) => <button className="category-card" key={category.name} onClick={() => category.name === "Fashion" ? setView("store") : setNotice(`${category.name} merchants are being recruited for the pilot.`)}><span className="category-icon">{category.icon}</span><div><small>{category.count}</small><h3>{category.name}</h3><p>{category.detail}</p></div><b>↗</b></button>)}
            </div>
          </section>

          <section className="concierge">
            <div><p className="eyebrow light">Neuro concierge</p><h2>Tell us what you need.<br />We’ll find where it lives.</h2><p>Natural-language shopping across participating stores is part of the intelligent commerce roadmap.</p></div>
            <button onClick={() => setAssistantOpen(true)}><span>✦</span><div><small>Ask NeuroCity</small><b>“I need a local streetwear look under N$1,500.”</b></div><i>→</i></button>
          </section>

          <section className="section featured">
            <div className="section-heading"><div><p className="eyebrow">First pilot storefront</p><h2>LightWork Clothing</h2></div><button className="text-link" onClick={() => setView("store")}>View the store →</button></div>
            <div className="product-grid">{catalogue.slice(0, 3).map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}</div>
          </section>
        </>
      )}

      {view === "store" && (
        <>
          <section className="store-hero">
            <div className="store-branding"><span>NEUROCITY / FASHION / LIGHTWORK</span><img src="/lightwork-logo.png" alt="LightWork Clothing logo" /><p>Global established movement. Windhoek streetwear from Baines Centre, Pioneerspark.</p><div><button onClick={() => setAssistantOpen(true)}>✦ Ask the store AI</button><button className="ghost" onClick={() => setNotice("Pickup details will be confirmed with LightWork before launch.")}>Pickup information</button></div></div>
            <div className="store-art"><img src="/lightwork-crown-v1.png" alt="LightWork Crown V1 tracksuit reference" /><span>PRIVATE PILOT CATALOGUE</span></div>
          </section>
          <section className="store-toolbar"><div><b>LightWork catalogue</b><span>4 starter products · details pending merchant confirmation</span></div><label><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search LightWork" /></label></section>
          <section className="section store-products"><div className="product-grid four">{filtered.map((p) => <ProductCard key={p.id} product={p} onAdd={addToCart} />)}</div></section>
        </>
      )}

      {view === "merchant" && <MerchantWorkspace onPreview={() => setView("store")} />}
      {false && (
        <section className="dashboard-shell">
          <aside><div className="merchant-mark"><img src="/lightwork-logo.png" alt="" /><div><b>LightWork</b><span>Pilot workspace</span></div></div>{["Overview", "Orders", "Products", "Inventory", "Storefront", "AI conversations", "Reports"].map((item, i) => <button className={i === 0 ? "active" : ""} key={item}>{item}<span>{item === "Products" ? "4" : item === "Orders" ? "0" : ""}</span></button>)}<div className="pilot-status"><span /><b>Pilot setup</b><small>42% complete</small></div></aside>
          <div className="dashboard-main"><div className="dashboard-head"><div><p className="eyebrow">Merchant overview</p><h1>Good evening, Zephan.</h1><p>Your storefront is in private pilot setup. Complete the catalogue before accepting orders.</p></div><button onClick={() => setView("store")}>Preview storefront ↗</button></div>
            <div className="metric-grid"><Metric label="Published products" value={String(merchantStats.publishedProducts)} note={`${merchantStats.products} need confirmation`} tone="gold" /><Metric label="Orders recorded" value={String(merchantStats.orders)} note="Persistent merchant orders" /><Metric label="Store readiness" value={`${merchantStats.readiness}%`} note="7 details remaining" tone="violet" /><Metric label="AI catalogue coverage" value="0%" note="Publish products first" /></div>
            <div className="dashboard-columns"><div className="task-panel"><div className="panel-title"><div><h3>Launch checklist</h3><p>What LightWork needs before pilot review</p></div><b>3 of 7</b></div>{[
              ["Business and pickup location", "Complete", true], ["Brand logo and website", "Complete", true], ["Starter product evidence", "Complete", true], ["Current prices and sizes", "Required", false], ["Branch stock or confirmation mode", "Required", false], ["Delivery zones and fees", "Required", false], ["Returns and exchange policy", "Required", false]
            ].map(([task, status, done]) => <div className="task-row" key={String(task)}><span className={done ? "done" : ""}>{done ? "✓" : ""}</span><b>{task}</b><small>{status}</small></div>)}</div>
              <div className="activity-panel"><div className="panel-title"><div><h3>Catalogue health</h3><p>Confirmation required</p></div></div>{catalogue.map((p) => <div className="mini-product" key={p.id}><img src={p.image} alt="" /><div><b>{p.name}</b><span>{p.price ? "Historic price recorded" : "Price missing"}</span></div><em>Review</em></div>)}</div></div>
          </div>
        </section>
      )}

      {notice && <button className="notice" onClick={() => setNotice("")} aria-label="Dismiss notification"><span>{notice}</span><b>×</b></button>}
      {checkoutOpen && <div className="checkout-backdrop" onClick={() => setCheckoutOpen(false)}><section className="checkout-panel" onClick={(event) => event.stopPropagation()}><header><div><small>LIGHTWORK ORDER</small><h2>Review your order</h2></div><button onClick={() => setCheckoutOpen(false)}>×</button></header><div className="checkout-items">{cart.map((id, index) => { const product = catalogue.find((item) => item.id === id); return product ? <div className="checkout-item" key={`${id}-${index}`}><img src={product.image} alt="" /><div><b>{product.name}</b><span>{product.collection}</span></div><strong>{money(product.price)}</strong></div> : null; })}</div><fieldset><legend>How would you like it?</legend><label className={fulfillment === "pickup" ? "selected" : ""}><input type="radio" checked={fulfillment === "pickup"} onChange={() => setFulfillment("pickup")} /><span><b>Pickup at Baines Centre</b><small>Timing confirmed by LightWork</small></span></label><label className={fulfillment === "merchant_delivery" ? "selected" : ""}><input type="radio" checked={fulfillment === "merchant_delivery"} onChange={() => setFulfillment("merchant_delivery")} /><span><b>Merchant delivery</b><small>Zone and fee confirmed before fulfillment</small></span></label></fieldset><fieldset><legend>Payment preference</legend><label className={payment === "pay_on_collection" ? "selected" : ""}><input type="radio" checked={payment === "pay_on_collection"} onChange={() => setPayment("pay_on_collection")} /><span><b>Pay on collection</b><small>Available during the controlled pilot</small></span></label><label className={payment === "online" ? "selected" : ""}><input type="radio" checked={payment === "online"} onChange={() => setPayment("online")} /><span><b>Online payment</b><small>Provider connection pending</small></span></label></fieldset><div className="checkout-total"><span>Total</span><b>{money(cartTotal)}</b></div><button className="place-order" disabled={placingOrder} onClick={placeOrder}>{placingOrder ? "Creating order…" : payment === "online" ? "Create order and continue to payment" : "Place pilot order"}</button><p className="checkout-note">This creates a real private pilot order. Products awaiting merchant confirmation cannot be ordered.</p></section></div>}
      <button className="ai-fab" onClick={() => setAssistantOpen(true)} aria-label="Open shopping assistant">✦</button>
      {assistantOpen && <div className="assistant-backdrop" onClick={() => setAssistantOpen(false)}><section className="assistant" onClick={(e) => e.stopPropagation()}><header><div><span>✦</span><div><b>{view === "store" ? "LightWork assistant" : "Neuro concierge"}</b><small>Catalogue-grounded pilot</small></div></div><button onClick={() => setAssistantOpen(false)}>×</button></header><div className="assistant-body"><p className="ai-message">Hi—tell me what you are looking for, your size and your budget. I’ll only suggest products confirmed in the pilot catalogue.</p><div className="suggestions"><button onClick={() => setQuery("black")}>Black outfit under N$1,500</button><button onClick={() => setQuery("hoodie")}>Show me hoodies</button><button onClick={() => setNotice("A human LightWork enquiry would be created here once messaging is connected.")}>Ask a human</button></div></div><footer><input placeholder="Describe what you need..." /><button onClick={() => setNotice("AI messaging will connect after the catalogue tools are implemented.")}>Send</button></footer></section></div>}
    </main>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  return <article className="product-card"><div className="product-image"><img src={product.image} alt={product.name} /><span>{product.badge}</span><button aria-label={`Save ${product.name}`}>♡</button></div><div className="product-copy"><small>LIGHTWORK · {product.collection}</small><h3>{product.name}</h3><div><b>{money(product.price)}</b><button onClick={() => onAdd(product)}>{product.price ? "+ Add" : "Ask store"}</button></div></div></article>;
}

function Metric({ label, value, note, tone = "plain" }: { label: string; value: string; note: string; tone?: string }) {
  return <article className={`metric ${tone}`}><span>{label}</span><b>{value}</b><small>{note}</small></article>;
}
