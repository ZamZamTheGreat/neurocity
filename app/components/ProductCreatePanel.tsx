"use client";
import { useEffect, useRef, useState } from "react";

export type NewProduct = {
  itemType: "product" | "service";
  name: string;
  sku: string;
  category: string;
  brand: string;
  collection: string;
  description: string;
  price: number | null;
  salePrice: number | null;
  pricingModel: "fixed" | "from" | "quote";
  durationMinutes: number | null;
  serviceMode: "at_business" | "at_customer" | "remote";
  bookingRequired: boolean;
  badge: string;
};
const empty = (): NewProduct => ({
  itemType: "product",
  name: "",
  sku: "",
  category: "",
  brand: "",
  collection: "",
  description: "",
  price: null,
  salePrice: null,
  pricingModel: "fixed",
  durationMinutes: null,
  serviceMode: "at_business",
  bookingRequired: true,
  badge: "",
});

export default function ProductCreatePanel({
  open,
  busy,
  onClose,
  onCreate,
}: {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onCreate: (product: NewProduct, addAnother?: boolean) => Promise<boolean>;
}) {
  const [product, setProduct] = useState(empty);
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) window.setTimeout(() => nameRef.current?.focus(), 50);
  }, [open]);
  if (!open) return null;
  const service = product.itemType === "service";
  const update = (values: Partial<NewProduct>) =>
    setProduct((current) => ({ ...current, ...values }));
  const priceValid =
    product.pricingModel === "quote" ||
    (product.price !== null && product.price >= 0);
  const valid =
    product.name.trim() &&
    product.sku.trim() &&
    product.category.trim() &&
    product.description.trim() &&
    priceValid &&
    (product.salePrice === null ||
      (product.price !== null && product.salePrice < product.price));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (valid && (await onCreate(product))) setProduct(empty());
  }
  async function saveAndAddAnother() {
    if (valid && (await onCreate(product, true))) {
      setProduct(empty());
      window.setTimeout(() => nameRef.current?.focus(), 50);
    }
  }
  return (
    <div
      className="product-create-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <form className="product-create-panel" onSubmit={submit}>
        <header>
          <div>
            <small>NEW CATALOGUE ITEM</small>
            <h2>Add a {service ? "service" : "product"}</h2>
            <p>
              Create something customers can discover and{" "}
              {service ? "request or book" : "add to their bag"}.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close catalogue form"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        <div className="product-create-progress">
          <span className="active">
            <b>1</b>Details
          </span>
          <i />
          <span>
            <b>2</b>
            {service ? "Booking" : "Images & options"}
          </span>
          <i />
          <span>
            <b>3</b>Publish
          </span>
        </div>
        <div className="product-create-fields">
          <label className="wide">
            What are you adding?
            <select
              value={product.itemType}
              onChange={(event) =>
                update({
                  itemType: event.target.value as NewProduct["itemType"],
                  pricingModel:
                    event.target.value === "service" ? "from" : "fixed",
                })
              }
            >
              <option value="product">Physical or digital product</option>
              <option value="service">Bookable or quoted service</option>
            </select>
          </label>
          <label className="wide">
            {service ? "Service name" : "Product name"}
            <input
              ref={nameRef}
              required
              value={product.name}
              placeholder={
                service
                  ? "e.g. 60-minute haircut"
                  : "e.g. Crown V1 Cuffed Tracksuit"
              }
              onChange={(event) => update({ name: event.target.value })}
            />
          </label>
          <label>
            {service ? "Service reference" : "Product SKU"}
            <input
              required
              value={product.sku}
              placeholder={service ? "e.g. CUT-60" : "e.g. LW-CROWN-V1"}
              onChange={(event) =>
                update({
                  sku: event.target.value.toUpperCase().replace(/\s+/g, "-"),
                })
              }
            />
          </label>
          <label>
            Category
            <input
              required
              value={product.category}
              placeholder={service ? "e.g. Hair services" : "e.g. Tracksuits"}
              onChange={(event) => update({ category: event.target.value })}
            />
          </label>
          <label>
            Brand or provider
            <input
              value={product.brand}
              onChange={(event) => update({ brand: event.target.value })}
            />
          </label>
          <label>
            Collection or service group
            <input
              value={product.collection}
              onChange={(event) => update({ collection: event.target.value })}
            />
          </label>
          {service && (
            <>
              <label>
                Pricing
                <select
                  value={product.pricingModel}
                  onChange={(event) =>
                    update({
                      pricingModel: event.target
                        .value as NewProduct["pricingModel"],
                      price:
                        event.target.value === "quote" ? null : product.price,
                    })
                  }
                >
                  <option value="fixed">Fixed price</option>
                  <option value="from">Starting from</option>
                  <option value="quote">Quote required</option>
                </select>
              </label>
              <label>
                Duration (minutes)
                <input
                  type="number"
                  min="5"
                  max="10080"
                  value={product.durationMinutes ?? ""}
                  placeholder="e.g. 60"
                  onChange={(event) =>
                    update({
                      durationMinutes: event.target.value
                        ? Number(event.target.value)
                        : null,
                    })
                  }
                />
              </label>
              <label>
                Service delivered
                <select
                  value={product.serviceMode}
                  onChange={(event) =>
                    update({
                      serviceMode: event.target
                        .value as NewProduct["serviceMode"],
                    })
                  }
                >
                  <option value="at_business">At the business</option>
                  <option value="at_customer">At the customer</option>
                  <option value="remote">Online / remotely</option>
                </select>
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={product.bookingRequired}
                  onChange={(event) =>
                    update({ bookingRequired: event.target.checked })
                  }
                />{" "}
                Appointment or request required
              </label>
            </>
          )}
          {product.pricingModel !== "quote" && (
            <label>
              {product.pricingModel === "from"
                ? "Starting price (N$)"
                : "Regular price (N$)"}
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={product.price ?? ""}
                onChange={(event) =>
                  update({
                    price:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>
          )}
          {!service && (
            <label>
              Sale price (optional)
              <input
                type="number"
                min="0"
                step="0.01"
                value={product.salePrice ?? ""}
                onChange={(event) =>
                  update({
                    salePrice:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
              />
            </label>
          )}
          <label className="wide">
            Description
            <textarea
              required
              value={product.description}
              placeholder={
                service
                  ? "Explain what is included, who it is for and anything customers should prepare."
                  : "Describe the product, materials, fit and key details."
              }
              onChange={(event) => update({ description: event.target.value })}
            />
          </label>
          <label className="wide">
            Storefront badge (optional)
            <input
              value={product.badge}
              placeholder={
                service ? "e.g. Same-day appointments" : "e.g. New arrival"
              }
              onChange={(event) => update({ badge: event.target.value })}
            />
          </label>
        </div>
        <aside>
          <b>Saved safely as a draft</b>
          <span>
            The {service ? "service" : "product"} remains private until an image
            is added and it is published.
          </span>
        </aside>
        <footer>
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={onClose}
          >
            Cancel
          </button>
          <button type="button" className="secondary" disabled={!valid || busy} onClick={() => void saveAndAddAnother()}>
            Save & add another
          </button>
          <button type="submit" disabled={!valid || busy}>
            {busy
              ? "Creating…"
              : `Create ${service ? "service" : "product"} & continue`}
          </button>
        </footer>
      </form>
    </div>
  );
}
