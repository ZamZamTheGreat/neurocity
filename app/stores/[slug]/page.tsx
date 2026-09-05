"use client";

import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Variant = {
  id: number;
  sku: string;
  title: string;
  size: string | null;
  color: string | null;
  price: number;
  salePrice: number | null;
  status: string;
  available: number | null;
};
type Product = {
  id: number;
  merchantId: number;
  itemType: "product" | "service";
  name: string;
  collection: string | null;
  brand: string | null;
  description: string;
  imageUrl: string | null;
  imageUrls: string[];
  badge?: string | null;
  price: number | null;
  salePrice: number | null;
  pricingModel: "fixed" | "from" | "quote";
  durationMinutes: number | null;
  serviceMode: string | null;
  bookingRequired: boolean;
  availability: string;
  variants: Variant[];
};
type StoreData = {
  store: {
    id: number;
    name: string;
    tagline: string | null;
    description: string | null;
    logoUrl: string | null;
    bannerUrl: string | null;
    category: string;
    contactOptions: Record<string, string>;
    fulfillmentMethods: string[];
    policies: Record<string, string>;
  };
  branches: {
    id: number;
    name: string;
    address: string;
    city: string;
    pickupEnabled: boolean;
    deliveryEnabled: boolean;
  }[];
  promotions: { id: number; title: string; description: string | null }[];
  products: Product[];
};
const label = (value: string) => value.replaceAll("_", " ");
const whatsappNumber = (value: string) => {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = `264${digits.slice(1)}`;
  return digits;
};
const whatsappHref = (phone: string, storeName: string) =>
  `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(`Hi ${storeName}, I found your store on NeuroCity and would like some help.`)}`;
const productPrice = (product: Product) =>
  product.itemType === "service"
    ? (product.salePrice ?? product.price ?? Number.POSITIVE_INFINITY)
    : Math.min(
        ...product.variants
          .map((variant) => variant.salePrice ?? variant.price)
          .filter(Number.isFinite),
        Number.POSITIVE_INFINITY,
      );

export default function StorefrontPage() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<StoreData | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [collection, setCollection] = useState("all");
  const [sort, setSort] = useState("featured");
  useEffect(() => {
    fetch(`/api/stores/${encodeURIComponent(slug)}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error);
        return body;
      })
      .then(setData)
      .catch((reason) => setError(reason.message ?? "Store unavailable."));
  }, [slug]);
  const products = useMemo(() => {
    const rows = (data?.products ?? []).filter(
      (product) =>
        (collection === "all" || product.collection === collection) &&
        `${product.name} ${product.brand ?? ""} ${product.collection ?? ""} ${product.description}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
    return [...rows].sort((a, b) =>
      sort === "price_low"
        ? productPrice(a) - productPrice(b)
        : sort === "price_high"
          ? productPrice(b) - productPrice(a)
          : a.id - b.id,
    );
  }, [data, query, collection, sort]);
  if (error)
    return (
      <main className="storefront-state">
        <a href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <h1>Store unavailable</h1>
        <p>{error}</p>
        <a href="/">Return to NeuroCity</a>
      </main>
    );
  if (!data)
    return (
      <main className="storefront-state">
        <span className="store-loader" />
        <p>Opening storefront...</p>
      </main>
    );
  const { store } = data;
  const collections = [
    ...new Set(
      data.products.map((product) => product.collection).filter(Boolean),
    ),
  ] as string[];
  async function accountAction(body: { action?: string; [key: string]: unknown }) {
    const response = await fetch("/api/account", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 401) {
      window.location.href = `/login?return_to=${encodeURIComponent(`/stores/${slug}`)}`;
      return undefined;
    }
    const result = await response.json();
    setNotice(
      response.ok
        ? body.action === "cart"
          ? "Added to your bag. Open your account when you are ready to checkout."
          : body.action === "wishlist"
            ? "Saved to your wishlist."
            : "Store saved to your NeuroCity account."
        : result.error,
    );
    return response.ok;
  }
  return (
    <main id="main-content" className="storefront-v2">
      <header className="store-header">
          <a href="/" className="store-mall-brand">
            <b>
              Neuro<span>City</span>
            </b>
            <small>Marketplace · Local storefront</small>
          </a>
          <nav aria-label="Store navigation">
            <a href="/marketplace">Marketplace</a>
            <a href="#shop">Shop</a>
          <a href="#about">About</a>
          <button
            onClick={() =>
              accountAction({ action: "store", merchantId: store.id })
            }
          >
            ♡ Save store
          </button>
          <a className="store-account" href="/account?tab=Bag">
            View bag
          </a>
        </nav>
      </header>
      {notice && (
        <button
          className="store-notice"
          role="status"
          aria-live="polite"
          onClick={() => setNotice("")}
        >
          {notice} ×
        </button>
      )}
      <section className="store-hero-v2">
        <div className="store-hero-copy">
          <p className="store-breadcrumb">
            <a href="/">NeuroCity</a>
            <span>/</span>
            {store.category}
          </p>
          {store.logoUrl && (
            <img
              className="store-logo-v2"
              src={store.logoUrl}
              alt={`${store.name} logo`}
            />
          )}
          <p className="store-kicker">Verified Namibian store</p>
          <h1>{store.name}</h1>
          {store.tagline && <h2>{store.tagline}</h2>}
          <p className="store-description">{store.description}</p>
          <div className="store-hero-facts" aria-label="Store summary">
            <span>{data.products.length} {data.products.length === 1 ? "item" : "items"}</span>
            <span>{store.category}</span>
            {data.branches[0]?.city && <span>{data.branches[0].city}</span>}
          </div>
          <div className="store-hero-actions">
            <a href="#shop">Shop catalogue</a>
            <button
              onClick={() =>
                accountAction({ action: "store", merchantId: store.id })
              }
            >
              Save this store
            </button>
          </div>
        </div>
        <div className="store-hero-art">
          {store.bannerUrl ? (
            <img src={store.bannerUrl} alt={`${store.name} collection`} />
          ) : (
            <div>
              <span>{store.name.slice(0, 1)}</span>
            </div>
          )}
          <small>Independent local merchant · Namibia</small>
        </div>
      </section>
      <section className="store-service-strip">
        {store.fulfillmentMethods?.map((method) => (
          <article key={method}>
            <span>{method.includes("pickup") ? "⌖" : "◇"}</span>
            <div>
              <b>{label(method)}</b>
              <small>
                {method.includes("pickup")
                  ? "Collect from the merchant"
                  : "Arranged by the merchant"}
              </small>
            </div>
          </article>
        ))}
        <article>
          <span aria-hidden="true">✓</span>
          <div>
            <b>Verified merchant</b>
            <small>Approved by NeuroCity</small>
          </div>
        </article>
        <article>
          <span aria-hidden="true">↗</span>
          <div>
            <b>Direct merchant support</b>
            <small>Ask about any product</small>
          </div>
        </article>
      </section>
      {data.promotions.length > 0 && (
        <section className="store-promotions-v2">
          {data.promotions.map((promotion) => (
            <article key={promotion.id}>
              <small>STORE OFFER</small>
              <strong>{promotion.title}</strong>
              {promotion.description && <span>{promotion.description}</span>}
              <a href="#shop">Shop offer →</a>
            </article>
          ))}
        </section>
      )}
      <section className="store-shop" id="shop">
        <div className="store-shop-heading">
          <div>
            <p className="store-kicker">Shop {store.name}</p>
            <h2>Browse the catalogue</h2>
            <p>
              {products.length} of {data.products.length}{" "}
              {data.products.length === 1 ? "item" : "items"} shown
            </p>
          </div>
          <label className="store-search">
            <span>⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search this store"
            />
          </label>
        </div>
        <div className="store-catalogue-controls">
          <div>
            <button
              className={collection === "all" ? "active" : ""}
              onClick={() => setCollection("all")}
            >
              All products
            </button>
            {collections.map((item) => (
              <button
                className={collection === item ? "active" : ""}
                key={item}
                onClick={() => setCollection(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <label>
            Sort
            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price_low">Price: low to high</option>
              <option value="price_high">Price: high to low</option>
            </select>
          </label>
        </div>
        {products.length ? (
          <div className="store-product-grid-v2">
            {products.map((product) => (
              <StoreProduct
                key={product.id}
                product={product}
                fulfillmentMethods={store.fulfillmentMethods}
                accountAction={accountAction}
              />
            ))}
          </div>
        ) : (
          <div className="store-empty">
            <span>⌕</span>
            <h3>No matching products</h3>
            <p>Try another search or view all products.</p>
            <button
              onClick={() => {
                setQuery("");
                setCollection("all");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>
      <section className="store-about-v2" id="about">
        <div>
          <p className="store-kicker">Shop with confidence</p>
          <h2>About the store</h2>
          <p>{store.description}</p>
          <div className="store-contact-links">
            {store.contactOptions?.phone && (
              <a href={`tel:${store.contactOptions.phone}`}>Call store</a>
            )}
            {store.contactOptions?.phone && (
              <a
                href={whatsappHref(store.contactOptions.phone, store.name)}
                target="_blank"
                rel="noreferrer"
                aria-label={`Text ${store.name} on WhatsApp`}
              >
                Text store
              </a>
            )}
            {store.contactOptions?.email && (
              <a href={`mailto:${store.contactOptions.email}`}>Email store</a>
            )}
            {store.contactOptions?.website && (
              <a
                href={store.contactOptions.website}
                target="_blank"
                rel="noreferrer"
              >
                Merchant website ↗
              </a>
            )}
          </div>
        </div>
        <div className="store-location-list">
          {data.branches.map((branch) => (
            <article key={branch.id}>
              <span>⌖</span>
              <div>
                <small>LOCATION</small>
                <h3>{branch.name}</h3>
                <p>{branch.address}</p>
                <div>
                  {branch.pickupEnabled && <b>Pickup</b>}
                  {branch.deliveryEnabled && <b>Delivery</b>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="store-policies-v2">
          <h3>Store policies</h3>
          {Object.entries(store.policies ?? {}).map(([name, policy]) => (
            <details key={name}>
              <summary>
                {label(name)} <span>+</span>
              </summary>
              <p>{policy}</p>
            </details>
          ))}
        </div>
      </section>
      <footer className="store-footer-v2">
        <a href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <p>{store.name} is an independent merchant on NeuroCity.</p>
        <div>
          <a href="#shop">Catalogue</a>
          <a href="#about">Store information</a>
          <a href="/account">My account</a>
        </div>
      </footer>
    </main>
  );
}

function StoreProduct({
  product,
  fulfillmentMethods,
  accountAction,
}: {
  product: Product;
  fulfillmentMethods: string[];
  accountAction: (body: { action?: string; [key: string]: unknown }) => Promise<boolean | undefined>;
}) {
  const { slug } = useParams<{ slug: string }>();
  const [imageIndex, setImageIndex] = useState(0);
  const gallery = product.imageUrls?.length ? product.imageUrls : product.imageUrl ? [product.imageUrl] : [];
  const activeImage = gallery[imageIndex] ?? gallery[0] ?? null;
  const [variantId, setVariantId] = useState(
    product.variants.find(
      (item) => item.available === null || item.available > 0,
    )?.id ??
      product.variants[0]?.id ??
      0,
  );
  const variant = product.variants.find((item) => item.id === variantId);
  const preorder = product.availability === "preorder";
  const purchasable = preorder || product.availability === "available";
  const price = variant?.salePrice ?? variant?.price;
  const [adding, setAdding] = useState(false);
  async function ask() {
    const message = window.prompt(
      `What would you like to ask about ${product.name}?`,
    );
    if (!message?.trim()) return;
    const response = await fetch("/api/conversations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        merchantId: product.merchantId,
        productId: product.id,
        subject: `Question about ${product.name}`,
        message,
      }),
    });
    if (response.status === 401)
      window.location.href = `/login?return_to=${encodeURIComponent(`/stores/${slug}`)}`;
    else if (response.ok) window.location.href = "/account";
  }
  async function requestService() {
    const slotResponse = await fetch(
      `/api/services/slots?productId=${product.id}`,
      { cache: "no-store" },
    );
    const slotData = await slotResponse.json();
    if (!slotResponse.ok) return window.alert(slotData.error);
    const slots = (slotData.slots ?? []).slice(0, 20) as {
      start: string;
      label: string;
    }[];
    if (!slots.length)
      return window.alert(
        "This provider has no available online booking slots yet. Use Ask about this service to contact them.",
      );
    const choice = window.prompt(
      `Choose a preferred time for ${product.name}:\n\n${slots.map((slot, index) => `${index + 1}. ${slot.label}`).join("\n")}\n\nEnter the slot number.`,
    );
    const selected = slots[Number(choice) - 1];
    if (!selected) return;
    const notes =
      window.prompt("Add any details the provider should know (optional)") ??
      "";
    const response = await fetch("/api/service-bookings", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        productId: product.id,
        requestedStart: selected.start,
        serviceMode: product.serviceMode,
        notes,
      }),
    });
    if (response.status === 401)
      return (window.location.href = `/login?return_to=${encodeURIComponent(`/stores/${slug}`)}`);
    const result = await response.json();
    if (!response.ok) return window.alert(result.error);
    window.alert(
      `${result.booking.reference} sent to ${product.brand ?? "the provider"} for confirmation.`,
    );
    window.location.href = "/account";
  }
  if (product.itemType === "service") {
    const servicePrice = product.salePrice ?? product.price;
    return (
      <article className="store-product-v2 service-card" aria-labelledby={`product-${product.id}`}>
        <div className="store-product-image">
          {activeImage ? (
            <img src={activeImage} alt={`${product.name} view ${imageIndex + 1}`} />
          ) : (
            <span>Service image coming soon</span>
          )}
          {product.badge && <small>{product.badge}</small>}
          <button
            aria-label={`Save ${product.name} to wishlist`}
            onClick={() =>
              accountAction({ action: "wishlist", productId: product.id })
            }
          >
            ♡
          </button>
        </div>
        {gallery.length > 1 && <div className="store-product-thumbnails" aria-label={`${product.name} images`}>{gallery.map((image, index) => <button className={index === imageIndex ? "active" : ""} key={image} onClick={() => setImageIndex(index)} aria-label={`View image ${index + 1}`}><img src={image} alt="" /></button>)}</div>}
        <div className="store-product-copy">
          <small>
            {product.brand ?? "Local service"}
            {product.collection ? ` · ${product.collection}` : ""}
          </small>
          <h3 id={`product-${product.id}`}>{product.name}</h3>
          <p>{product.description}</p>
          <div className="store-stock-line">
            <span className="in-stock">
              {product.durationMinutes
                ? `${product.durationMinutes} minutes`
                : "Duration confirmed by provider"}
            </span>
            <small>{label(product.serviceMode ?? "at_business")}</small>
          </div>
          <div className="store-product-buy">
            <div>
              <strong>
                {product.pricingModel === "quote" || servicePrice === null
                  ? "Request a quote"
                  : `${product.pricingModel === "from" ? "From " : ""}N$${servicePrice.toFixed(2)}`}
              </strong>
            </div>
            <button onClick={requestService}>
              {product.bookingRequired ? "Request booking" : "Enquire now"}
            </button>
          </div>
          <button className="store-ask-button" onClick={ask}>
            Ask about this service
          </button>
        </div>
      </article>
    );
  }
  return (
    <article className="store-product-v2" aria-labelledby={`product-${product.id}`}>
      <div className="store-product-image">
        {activeImage ? (
          <img src={activeImage} alt={`${product.name} view ${imageIndex + 1}`} />
        ) : (
          <span>Image coming soon</span>
        )}
        {product.badge && <small>{product.badge}</small>}
        <button
          aria-label={`Save ${product.name} to wishlist`}
          onClick={() =>
            accountAction({ action: "wishlist", productId: product.id })
          }
        >
          ♡
        </button>
      </div>
      {gallery.length > 1 && <div className="store-product-thumbnails" aria-label={`${product.name} images`}>{gallery.map((image, index) => <button className={index === imageIndex ? "active" : ""} key={image} onClick={() => setImageIndex(index)} aria-label={`View image ${index + 1}`}><img src={image} alt="" /></button>)}</div>}
      <div className="store-product-copy">
        <small>
          {product.brand ?? "Local brand"}
          {product.collection ? ` · ${product.collection}` : ""}
        </small>
        <h3 id={`product-${product.id}`}>{product.name}</h3>
        <p>{product.description}</p>
        <div className="store-product-fulfillment" aria-label="Fulfilment options">
          {fulfillmentMethods.map((method) => (
            <span key={method}>{method.includes("pickup") ? "Pickup" : "Local delivery"}</span>
          ))}
        </div>
        {product.variants.length > 0 ? (
          <>
            <label>
              Choose option
              <select
                value={variantId}
                onChange={(event) => setVariantId(Number(event.target.value))}
              >
                {product.variants.map((item) => (
                  <option key={item.id} value={item.id} disabled={!purchasable || (!preorder && item.available !== null && item.available < 1)}>
                    {[item.size, item.color].filter(Boolean).join(" / ") ||
                      item.title}
                    {!preorder && item.available !== null && item.available < 1
                      ? " — sold out"
                      : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="store-stock-line">
              <span
                className={
                  variant &&
                  (variant.available === null || variant.available > 0)
                    ? "in-stock"
                    : "out-stock"
                }
              >
                {preorder ? "Preorder only — made or sourced after ordering" : !purchasable ? "Currently unavailable" : variant?.available === null
                  ? "Available — store confirms stock"
                  : variant && variant.available > 0
                    ? `${variant.available} in stock`
                    : "Currently unavailable"}
              </span>
              <small>SKU {variant?.sku}</small>
            </div>
            {preorder && <p className="variant-pending">You can add this item to your bag and place an order. It is not ready for immediate collection or delivery. The merchant will confirm the expected fulfilment date.</p>}
            <div className="store-product-buy">
              <div>
                {variant?.salePrice !== null &&
                  variant?.salePrice !== undefined && (
                    <del>N${variant.price.toFixed(2)}</del>
                  )}
                <strong>
                  {price === undefined
                    ? "Price pending"
                    : `N$${price.toFixed(2)}`}
                </strong>
              </div>
              <button
                disabled={
                  adding ||
                  !variant ||
                  !purchasable ||
                  (!preorder && variant.available !== null && variant.available < 1)
                }
                onClick={async () => {
                  if (!variant) return;
                  setAdding(true);
                  await accountAction({ action: "cart", variantId: variant.id, quantity: 1 });
                  setAdding(false);
                }}
              >
                {adding ? "Adding…" : preorder ? "Preorder · Add to bag" : "Add to bag"}
              </button>
            </div>
          </>
        ) : (
          <p className="variant-pending">
            Options are being prepared by the merchant.
          </p>
        )}
        <button className="store-ask-button" onClick={ask}>
          Ask store about this product
        </button>
      </div>
    </article>
  );
}
