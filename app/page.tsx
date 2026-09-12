"use client";

import { type CSSProperties, useEffect, useMemo, useState } from "react";
import MerchantWorkspace from "./components/MerchantWorkspace";
import { openConcierge } from "../lib/concierge-events";
import { merchantCategories } from "../lib/merchant-categories";
import NeuroCityNetworkHome from "./components/NeuroCityNetworkHome";
import { ManagedImage } from "./components/ManagedImage";
import AdvertisingBanner from "./components/AdvertisingBanner";

type Product = {
  id: number;
  itemType: "product" | "service";
  name: string;
  collection: string | null;
  category: string | null;
  price: number | null;
  salePrice: number | null;
  pricingModel: "fixed" | "from" | "quote";
  durationMinutes: number | null;
  serviceMode: string | null;
  bookingRequired: boolean;
  merchantName: string;
  merchantSlug: string;
  image: string;
  badge: string | null;
};
type PublicStore = {
  id: number;
  name: string;
  slug: string;
  category: string;
  categories: string[];
  tagline: string | null;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  fulfillmentMethods: string[];
  branchName?: string;
  branchAddress?: string;
};
type PlatformIdentity = {
  name: string;
  slug: string;
  kind: string;
  country: string;
  city: string | null;
  tagline: string | null;
  logoUrl: string | null;
  markUrl: string | null;
  theme: Record<string, string>;
};

const categories = merchantCategories.map((category) => ({
  ...category,
  detail: category.includes,
}));

function money(value: number | null) {
  return value === null
    ? "Confirm with store"
    : `N$${new Intl.NumberFormat("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
}

export function MarketplaceExperience({
  mallSlug,
}: { mallSlug?: string } = {}) {
  const [view, setView] = useState<"mall" | "store" | "merchant">("mall");
  const [query, setQuery] = useState("");
  const [catalogue, setCatalogue] = useState<Product[]>([]);
  const [storeAvailable, setStoreAvailable] = useState<boolean | null>(null);
  const [stores, setStores] = useState<PublicStore[]>([]);
  const [platform, setPlatform] = useState<PlatformIdentity>({
    name: "NeuroCity",
    slug: "neurocity",
    kind: "marketplace",
    country: "Namibia",
    city: null,
    tagline: "Namibia's intelligent digital mall.",
    logoUrl: "/branding/neurocity-logo.png",
    markUrl: "/branding/neurocity-mark.png",
    theme: { primary: "#18c98e", surface: "#07111f" },
  });
  const [selectedCategory, setSelectedCategory] = useState("");
  const askConcierge = () => openConcierge({ platformSlug: mallSlug });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("workspace") === "merchant")
      setView("merchant");
  }, []);

  useEffect(() => {
    const mall =
      mallSlug ?? new URLSearchParams(window.location.search).get("mall");
    const tenantQuery = mall ? `?mall=${encodeURIComponent(mall)}` : "";
    fetch(`/api/stores${tenantQuery}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("stores_unavailable");
        return response.json();
      })
      .then((data) => {
        const available = Array.isArray(data.stores) ? data.stores : [];
        if (data.platform) setPlatform(data.platform);
        setStores(available);
        setStoreAvailable(available.length > 0);
      })
      .catch(() => {
        setStores([]);
        setStoreAvailable(false);
      });
    fetch("/api/catalogue")
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            response.status === 404
              ? "store_unavailable"
              : "catalogue_unavailable",
          );
        return response.json();
      })
      .then((data) => {
        if (Array.isArray(data.products))
          setCatalogue(
            data.products.map((product: Product & { imageUrl?: string }) => ({
              ...product,
              image: product.imageUrl ?? product.image,
            })),
          );
      })
      .catch(() => setCatalogue([]));
  }, [mallSlug]);

  const filtered = useMemo(
    () =>
      catalogue.filter((p) =>
        `${p.name} ${p.collection ?? ""} ${p.category ?? ""} ${p.merchantName} ${p.itemType}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [query, catalogue],
  );
  const visibleStores = useMemo(
    () =>
      stores.filter(
        (store) =>
          (!selectedCategory || store.category === selectedCategory || store.categories?.includes(selectedCategory)) &&
          `${store.name} ${store.category} ${store.tagline ?? ""} ${store.description ?? ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [stores, selectedCategory, query],
  );
  const categoryCounts = useMemo(
    () =>
      stores.reduce<Record<string, number>>(
        (counts, store) => ({
          ...counts,
          [store.category]: (counts[store.category] ?? 0) + 1,
        }),
        {},
      ),
    [stores],
  );
  const activeCategories = useMemo(
    () =>
      categories.filter(
        (category) => (categoryCounts[category.name] ?? 0) > 0,
      ),
    [categoryCounts],
  );
  const openStore = (slug: string) => {
    window.location.href = `/stores/${slug}`;
  };
  const showStores = (category = "") => {
    setSelectedCategory(category);
    setView("mall");
    requestAnimationFrame(() =>
      document.getElementById("stores")?.scrollIntoView({ behavior: "smooth" }),
    );
  };
  const applicationHref = mallSlug
    ? `/malls/${encodeURIComponent(mallSlug)}/apply`
    : "/apply";

  function openCatalogueItem(product: Product) {
    setNotice(product.itemType === "service" ? `Opening ${product.merchantName} to view this service.` : `Choose the available options for ${product.name} in ${product.merchantName}.`);
    window.location.href = `/stores/${encodeURIComponent(product.merchantSlug)}#shop`;
  }

  return (
    <main
      id="main-content"
      className={
        `${platform.kind === "mall" ? "white-label-mall" : "neurocity-marketplace"} marketplace-shell`
      }
      style={
        {
          "--ink": platform.kind === "mall" ? "#080808" : (platform.theme?.surface ?? "#07111f"),
          "--gold": platform.kind === "mall" ? "#d4af37" : (platform.theme?.primary ?? "#18c98e"),
          "--violet": platform.kind === "mall" ? "#d4af37" : (platform.theme?.primary ?? "#18c98e"),
        } as CSSProperties
      }
    >
      <header className="topbar">
        <button
          className="brand header-brand"
          onClick={() => setView("mall")}
          aria-label={`Go to ${platform.name} home`}
        >
          {platform.markUrl ? (
            <ManagedImage
              className="brand-symbol"
              src={platform.markUrl}
              alt=""
              aria-hidden="true"
            />
          ) : (
            <span className="tenant-monogram" aria-hidden="true">
              {platform.name
                .split(" ")
                .map((word) => word[0])
                .join("")
                .slice(0, 2)}
            </span>
          )}
          <span className="brand-copy">
            <span>
              <b>{platform.kind === "mall" ? platform.name : "NeuroCity"}</b>
              {platform.kind !== "mall" && <em>MARKETPLACE</em>}
            </span>
            <small>
              {platform.kind === "mall"
                ? (platform.tagline ?? `${platform.country}'s digital mall`)
                : "Shop independent Namibian businesses"}
            </small>
          </span>
        </button>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {platform.kind !== "mall" && <a href="/">NeuroCity network</a>}
          {platform.kind !== "mall" && <a href="/chains">Chain stores</a>}
          <button
            className={view === "mall" ? "active" : ""}
            onClick={() => setView("mall")}
          >
            {platform.kind === "mall" ? "Discover" : "Shop"}
          </button>
          <button onClick={() => showStores()}>Stores</button>
          <button
            onClick={() => {
              setView("mall");
              requestAnimationFrame(() =>
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" }),
              );
            }}
          >
            How it works
          </button>
        </nav>
        <div className="header-actions">
          <span className="city-pill">
            {platform.city ?? platform.country} <span>•</span>
          </span>
          <details className="account-menu">
            <summary>Account</summary>
            <div>
              <header><span aria-hidden="true">◎</span><p><b>Your NeuroCity account</b><small>Shopping and business tools</small></p></header>
              <section><small>SHOPPING</small><a href="/account">Customer account <span>→</span></a><a href="/application-status">Track application <span>→</span></a></section>
              <section><small>BUSINESS</small><a href="/marketplace?workspace=merchant">Merchant workspace <span>→</span></a><a href="/mall-manager">Mall management <span>→</span></a><a href="/admin">Administration <span>→</span></a></section>
              <a className="account-menu-all" href="/access">View all account options</a>
            </div>
          </details>
          <a className="cart-button" href="/account?tab=bag"><span>Bag</span><i aria-hidden="true">→</i></a>
        </div>
      </header>
      {platform.kind !== "mall" && (
        <div className="marketplace-context-bar">
          <span>
            <a href="/">NeuroCity</a>
            <b>›</b> Marketplace
          </span>
          <div>
            <i /> Verified local businesses <i /> One account across the network
          </div>
        </div>
      )}

      {view === "mall" && (
        <>
          <section className="hero">
            <div className="hero-copy">
              <p className="eyebrow">
                <span />{" "}
                {platform.kind === "mall"
                  ? `${platform.city ?? "Your"} shopping, digitally connected`
                  : "LOCAL STORES · ONE MARKETPLACE"}
              </p>
              <h1>
                {platform.kind === "mall" ? (
                  <>
                    Your mall.
                    <br />
                    Your favourites.
                    <br />
                    <em>Always open.</em>
                  </>
                ) : (
                  <>
                    Shop local Namibian
                    <br />
                    businesses in <em>one place.</em>
                  </>
                )}
              </h1>
              <p className="hero-lede">
                {platform.kind === "mall"
                  ? `${platform.tagline} Browse participating stores, discover what is available and shop before you arrive.`
                  : "Browse products and services from approved local merchants. Check prices, pickup and delivery options before you order."}
              </p>
              <div className="hero-actions">
                {storeAvailable && (
                  <button onClick={() => showStores()}>Explore stores</button>
                )}
                <a href={applicationHref}>
                  {platform.kind === "mall"
                    ? "Join this digital mall"
                    : "Sell on NeuroCity"}
                </a>
              </div>
              <div className="search-shell">
                <span aria-hidden="true">⌕</span>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedCategory("");
                  }}
                  placeholder="What are you looking for?"
                  aria-label="Search NeuroCity"
                />
                <button onClick={() => showStores()}>Search</button>
              </div>
              <div className="trust-row">
                <span>Approved storefronts</span>
                <span>Prices in Namibian dollars</span>
                <span>Pickup and local delivery</span>
              </div>
            </div>
            <div
              className="hero-city"
              aria-label={`${platform.name} marketplace summary`}
            >
              {stores[0] ? (
                <div className="city-card main-card">
                  <span>FEATURED LOCAL STORE</span>
                  <ManagedImage
                    src={stores[0].logoUrl ?? "/lightwork-logo.png"}
                    alt={stores[0].name}
                  />
                  <small>{stores[0].branchAddress ?? stores[0].tagline}</small>
                  <button onClick={() => openStore(stores[0].slug)}>
                    Enter store →
                  </button>
                </div>
              ) : (
                <div className="city-card main-card marketplace-card">
                  <span>NAMIBIAN MARKETPLACE</span>
                  <strong>{platform.name}</strong>
                  <small>
                    {storeAvailable === null
                      ? "Loading local storefronts…"
                      : "New storefronts coming soon"}
                  </small>
                </div>
              )}
              <div className="float-card top-float">
                <b>{stores.length}</b>
                <span>stores live</span>
              </div>
              <div className="float-card bottom-float">
                <i />{" "}
                <span>
                  Pickup and delivery
                  <br />
                  <b>{platform.city ?? "Namibia"}</b>
                </span>
              </div>
            </div>
          </section>

          {platform.kind !== "mall" && <AdvertisingBanner placement="marketplace" />}

          {activeCategories.length > 0 && (
            <section className="section marketplace-category-filter" aria-labelledby="marketplace-category-title">
              <div className="marketplace-category-copy">
                <span className="category-filter-icon" aria-hidden="true">⌑</span>
                <div>
                  <p className="eyebrow">Shop by category</p>
                  <h2 id="marketplace-category-title">What are you shopping for?</h2>
                  <p>Choose a category to see matching stores.</p>
                </div>
              </div>
              <label className="marketplace-category-select">
                <span>Category</span>
                <select
                  value={selectedCategory}
                  onChange={(event) => showStores(event.target.value)}
                  aria-describedby="marketplace-category-help"
                >
                  <option value="">All categories ({stores.length} {stores.length === 1 ? "store" : "stores"})</option>
                  {activeCategories.map((category) => {
                    const count = categoryCounts[category.name] ?? 0;
                    return <option key={category.name} value={category.name}>{category.name} ({count})</option>;
                  })}
                </select>
                <small id="marketplace-category-help">Only categories with active stores are listed.</small>
              </label>
            </section>
          )}

          <section className="public-stores section" id="stores">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Approved and ready</p>
                <h2>Stores open on {platform.name}.</h2>
              </div>
              <ul className="info-list"><li>Only approved merchants appear here.</li><li>Each merchant must complete and publish its storefront setup.</li></ul>
            </div>
            <div className="store-directory-tools">
              <div>
                {selectedCategory && (
                  <button onClick={() => setSelectedCategory("")}>
                    {selectedCategory} ×
                  </button>
                )}
                <span>
                  {visibleStores.length}{" "}
                  {visibleStores.length === 1 ? "store" : "stores"}
                </span>
              </div>
              <label>
                <span>⌕</span>
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search stores"
                />
              </label>
            </div>
            {storeAvailable === null ? (
              <div className="public-store-empty">
                <strong>Loading local stores…</strong>
              </div>
            ) : visibleStores.length ? (
              <div className="public-store-grid marketplace-filter-results" key={selectedCategory || "all"}>
                {visibleStores.map((store, index) => (
                  <article
                    className="public-store-card marketplace-reveal-card"
                    style={{ "--reveal-index": index } as CSSProperties}
                    key={store.id}
                    role="link"
                    tabIndex={0}
                    aria-label={`Visit ${store.name}`}
                    onClick={() => openStore(store.slug)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openStore(store.slug);
                      }
                    }}
                  >
                    <div className="public-store-art">
                      {store.bannerUrl && <ManagedImage src={store.bannerUrl} alt="" />}
                      <span>Approved store</span>
                    </div>
                    <div className="public-store-copy">
                      {store.logoUrl && (
                        <ManagedImage src={store.logoUrl} alt={`${store.name} logo`} />
                      )}
                      <small>{store.category}</small>
                      <h3>{store.name}</h3>
                      <p>{store.tagline ?? store.description}</p>
                      <div>
                        {store.fulfillmentMethods?.map((method) => (
                          <span key={method}>
                            {method.replaceAll("_", " ")}
                          </span>
                        ))}
                      </div>
                      <button onClick={() => openStore(store.slug)} tabIndex={-1}>
                        Visit store →
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="public-store-empty">
                <strong>No matching stores</strong>
                <p>
                  {stores.length
                    ? "Try clearing the category or changing your search."
                    : "Approved merchants will appear here as soon as their storefront setup is complete and published."}
                </p>
                {(query || selectedCategory) && (
                  <button
                    onClick={() => {
                      setQuery("");
                      setSelectedCategory("");
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </section>

          <section className="public-process" id="how-it-works">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Simple local shopping</p>
                <h2>From discovery to collection.</h2>
              </div>
              <ul className="info-list"><li>Clear, merchant-managed fulfilment during the Windhoek pilot.</li></ul>
            </div>
            <div className="process-grid">
              <article>
                <span>01</span>
                <h3>Discover</h3>
                <ul className="info-list"><li>Browse verified local storefronts.</li><li>Explore product catalogues.</li></ul>
              </article>
              <article>
                <span>02</span>
                <h3>Choose</h3>
                <ul className="info-list"><li>Add confirmed products.</li><li>Select pickup or merchant delivery.</li></ul>
              </article>
              <article>
                <span>03</span>
                <h3>Complete</h3>
                <ul className="info-list"><li>The merchant confirms availability.</li><li>Receive timing and fulfilment details.</li></ul>
              </article>
            </div>
          </section>

          <section className="concierge">
            <div>
                <p className="eyebrow light">Selma-AI · Local shopping assistant</p>
                <h2>
                Describe what you need.
                <br />
                See verified local options.
              </h2>
              <ul className="info-list"><li>Describe the product, colour, size or budget.</li><li>Neuro searches live catalogues from approved local stores.</li></ul>
            </div>
            <button onClick={() => askConcierge()}>
              <span>✦</span>
              <div>
                <small>Ask Selma-AI</small>
                <b>“I need a local streetwear look under N$1,500.”</b>
              </div>
              <i>→</i>
            </button>
          </section>

          {stores.some((store) => store.slug === "lightwork-clothing") && (
            <section className="section featured">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Pilot storefront</p>
                  <h2>LightWork Clothing</h2>
                </div>
                <button
                  className="text-link"
                  onClick={() => openStore("lightwork-clothing")}
                >
                  View the store →
                </button>
              </div>
              <div className="product-grid marketplace-filter-results">
                {catalogue.slice(0, 3).map((p, index) => (
                  <div className="marketplace-reveal-card" style={{ "--reveal-index": index } as CSSProperties} key={p.id}><ProductCard product={p} onOpen={openCatalogueItem} /></div>
                ))}
              </div>
            </section>
          )}

          <section className="merchant-public-cta">
            <div>
              <p className="eyebrow light">For Namibian businesses</p>
              <h2>Bring your store into {platform.name}.</h2>
              <ul className="info-list"><li>Apply online.</li><li>Submit business documents securely.</li><li>Receive a merchant dashboard after approval.</li></ul>
            </div>
            <div>
              <a className="merchant-cta-primary" href={applicationHref}>
                Start an application
              </a>
              <a href="/application-status">Track an existing application</a>
            </div>
          </section>
        </>
      )}

      {view === "store" && storeAvailable && (
        <>
          <section className="store-hero">
            <div className="store-branding">
              <span>NEUROCITY / FASHION / LIGHTWORK</span>
              <ManagedImage src="/lightwork-logo.png" alt="LightWork Clothing logo" />
              <p>
                Global established movement. Windhoek streetwear from Baines
                Centre, Pioneerspark.
              </p>
              <div>
                <button onClick={() => askConcierge()}>
                  ✦ Ask the store AI
                </button>
                <button
                  className="ghost"
                  onClick={() =>
                    setNotice(
                      "Pickup details will be confirmed with LightWork before launch.",
                    )
                  }
                >
                  Pickup information
                </button>
              </div>
            </div>
            <div className="store-art">
              <ManagedImage
                src="/lightwork-crown-v1.png"
                alt="LightWork Crown V1 tracksuit reference"
              />
              <span>PRIVATE PILOT CATALOGUE</span>
            </div>
          </section>
          <section className="store-toolbar">
            <div>
              <b>LightWork catalogue</b>
              <span>
                4 starter products · details pending merchant confirmation
              </span>
            </div>
            <label>
              <span>⌕</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search LightWork"
              />
            </label>
          </section>
          <section className="section store-products">
            <div className="product-grid four marketplace-filter-results">
              {filtered.map((p, index) => (
                <div className="marketplace-reveal-card" style={{ "--reveal-index": index } as CSSProperties} key={p.id}><ProductCard product={p} onOpen={openCatalogueItem} /></div>
              ))}
            </div>
          </section>
        </>
      )}

      {view === "merchant" && (
        <MerchantWorkspace onPreview={() => setView("store")} />
      )}
      {notice && (
        <button
          className="notice"
          aria-live="polite"
          onClick={() => setNotice("")}
          aria-label="Dismiss notification"
        >
          <span>{notice}</span>
          <b>×</b>
        </button>
      )}
      <button
        className="ai-fab"
        onClick={() => askConcierge()}
        aria-label="Open shopping assistant"
      >
        ✦
      </button>
      {view !== "merchant" && (platform.kind !== "mall" ? (
        <footer className="public-footer marketplace-footer">
          <div className="marketplace-footer-lead">
            <a href="/" className="brand"><span>Neuro</span><strong>City</strong></a>
            <p>One place to discover and shop from independent Namibian businesses.</p>
            <span><i /> Built for local commerce</span>
          </div>
          <div className="marketplace-footer-links">
            <section><h3>Explore</h3><button onClick={() => showStores()}>Browse stores</button><a href="/chains">Chain stores</a><a href="/malls">Digital malls</a></section>
            <section><h3>Your account</h3><a href="/account">Customer account</a><a href="/account?tab=bag">Shopping bag</a><a href="/application-status">Application status</a></section>
            <section><h3>For business</h3><a href={applicationHref}>Become a merchant</a><a href="/marketplace?workspace=merchant">Merchant workspace</a><a href="/mall-manager">Mall management</a></section>
          </div>
          <div className="marketplace-footer-bottom"><small>© {new Date().getFullYear()} NeuroCity · Namibia</small><nav aria-label="Legal"><a href="/privacy">Privacy</a><a href="/terms">Terms</a><button className="footer-privacy-choice" onClick={() => window.dispatchEvent(new Event("neurocity:privacy-choices"))}>Privacy choices</button></nav></div>
        </footer>
      ) : (
        <footer className="public-footer">
          <a href="/" className="brand">
            <span>Neuro</span>
            <strong>City</strong>
          </a>
          <p>{platform.name} digital commerce.</p>
          <nav>
            <button onClick={() => showStores()}>Stores</button>
            <a href="/account">Customer account</a>
            <a href={applicationHref}>Become a merchant</a>
            <a href="/application-status">Application status</a>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
          </nav>
          <small>© {new Date().getFullYear()} NeuroCity · Namibia</small>
        </footer>
      ))}
    </main>
  );
}

function ProductCard({
  product,
  onOpen,
}: {
  product: Product;
  onOpen: (p: Product) => void;
}) {
  const service = product.itemType === "service";
  const displayedPrice = product.salePrice ?? product.price;
  return (
    <article className={`product-card${service ? " service-product-card" : ""}`}>
      <div className="product-image">
        <ManagedImage src={product.image} alt={product.name} />
        <span>{product.badge ?? (service ? "SERVICE" : "PRODUCT")}</span>
        <button aria-label={`Save ${product.name}`}>♡</button>
      </div>
      <div className="product-copy">
        <small>{product.merchantName}{product.collection ? ` · ${product.collection}` : ""}</small>
        <h3>{product.name}</h3>
        {service && <p className="marketplace-service-meta"><span>{product.durationMinutes ? `${product.durationMinutes} min` : "Duration confirmed by provider"}</span><span>{product.serviceMode === "at_customer" ? "At your location" : product.serviceMode === "remote" ? "Online / remote" : "At the business"}</span></p>}
        <div>
          <b>{service && product.pricingModel === "quote" ? "Request a quote" : `${service && product.pricingModel === "from" ? "From " : ""}${money(displayedPrice)}`}</b>
          <button onClick={() => onOpen(product)}>
            {service ? (product.bookingRequired ? "View & book" : "View service") : "Choose options"}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  return <NeuroCityNetworkHome />;
}
