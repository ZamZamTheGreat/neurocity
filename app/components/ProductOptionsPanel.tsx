"use client";

import { useState } from "react";

type Product = {
  id: number;
  itemType?: string;
  name: string;
  sku: string;
  price: number | null;
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
  status: string;
  stock: {
    branchName: string;
    onHand: number;
    reserved: number;
    safetyStock: number;
  }[];
};
type NewVariant = {
  sku: string;
  title: string;
  size: string;
  color: string;
  price: number;
  salePrice: number | null;
  onHand: number;
};

export default function ProductOptionsPanel({
  product,
  variants,
  onVariantChange,
  onVariantSave,
  onVariantCreate,
}: {
  product: Product;
  variants: Variant[];
  onVariantChange: (variant: Variant) => void;
  onVariantSave: (variant: Variant) => Promise<void>;
  onVariantCreate: (values: NewVariant) => Promise<void>;
}) {
  if (product.itemType === "service")
    return (
      <section className="product-options">
        <header>
          <div>
            <small>SERVICE REQUESTS</small>
            <h3>No stock options required</h3>
            <p>
              Customers can request this service directly from the storefront.
              Requests arrive in your Inbox with their preferred date, time and
              details.
            </p>
          </div>
          <span className="option-ready">Booking enabled</span>
        </header>
      </section>
    );
  const active = variants.filter(
    (variant) => variant.status === "active",
  ).length;
  return (
    <section className="product-options">
      <header>
        <div>
          <small>CUSTOMER OPTIONS</small>
          <h3>Sizes, colours, prices and stock</h3>
          <p>
            {active
              ? `${active} active option${active === 1 ? "" : "s"}. Customers can see the price and use Add to bag.`
              : "Add and activate at least one option to show the price and Add to bag."}
          </p>
        </div>
        <span className={active ? "option-ready" : "option-blocked"}>
          {active ? "Storefront ready" : "Action required"}
        </span>
      </header>
      {variants.length > 0 && (
        <div className="product-variant-list">
          {variants.map((variant) => (
            <VariantRow
              key={variant.id}
              variant={variant}
              onChange={onVariantChange}
              onSave={() => onVariantSave(variant)}
            />
          ))}
        </div>
      )}
      <NewVariantForm product={product} onCreate={onVariantCreate} />
    </section>
  );
}

function VariantRow({
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
    <article className="variant-editor compact">
      <header>
        <div>
          <strong>{variant.title}</strong>
          <span>{variant.sku}</span>
        </div>
        <select
          aria-label={`Status for ${variant.title}`}
          value={variant.status}
          onChange={(event) =>
            onChange({ ...variant, status: event.target.value })
          }
        >
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="needs_confirmation">Needs confirmation</option>
          <option value="archived">Archived</option>
        </select>
      </header>
      <div>
        <label>
          Size
          <input
            value={variant.size ?? ""}
            onChange={(event) =>
              onChange({ ...variant, size: event.target.value })
            }
          />
        </label>
        <label>
          Colour
          <input
            value={variant.color ?? ""}
            onChange={(event) =>
              onChange({ ...variant, color: event.target.value })
            }
          />
        </label>
        <label>
          Regular price
          <input
            type="number"
            min="0"
            step="0.01"
            value={variant.price}
            onChange={(event) =>
              onChange({ ...variant, price: Number(event.target.value) })
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
            onChange={(event) =>
              onChange({
                ...variant,
                salePrice:
                  event.target.value === "" ? null : Number(event.target.value),
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
            onChange={(event) =>
              updateStock({ onHand: Number(event.target.value) })
            }
          />
        </label>
        <label>
          Safety stock
          <input
            type="number"
            min="0"
            value={stock.safetyStock}
            onChange={(event) =>
              updateStock({ safetyStock: Number(event.target.value) })
            }
          />
        </label>
        <div className="variant-available">
          <span>AVAILABLE</span>
          <strong>
            {Math.max(0, stock.onHand - stock.reserved - stock.safetyStock)}
          </strong>
        </div>
      </div>
      <footer>
        <button onClick={onSave}>Save option</button>
      </footer>
    </article>
  );
}

function NewVariantForm({
  product,
  onCreate,
}: {
  product: Product;
  onCreate: (values: NewVariant) => Promise<void>;
}) {
  const initial = () => ({
    sku: "",
    title: "",
    size: "",
    color: "",
    price: product.price ?? 0,
    salePrice: null as number | null,
    onHand: 0,
  });
  const [values, setValues] = useState(initial);
  const [open, setOpen] = useState(false);
  const update = (next: Partial<NewVariant>) =>
    setValues((current) => ({ ...current, ...next }));
  async function submit() {
    const title =
      values.title.trim() ||
      [values.size, values.color].filter(Boolean).join(" / ") ||
      "Standard";
    await onCreate({ ...values, title });
    setValues(initial());
    setOpen(false);
  }
  if (!open)
    return (
      <button className="add-option-button" onClick={() => setOpen(true)}>
        + Add size / colour option
      </button>
    );
  return (
    <div className="new-variant-form">
      <div>
        <label>
          Size
          <input
            value={values.size}
            placeholder="e.g. Medium"
            onChange={(event) => update({ size: event.target.value })}
          />
        </label>
        <label>
          Colour
          <input
            value={values.color}
            placeholder="e.g. Black"
            onChange={(event) => update({ color: event.target.value })}
          />
        </label>
        <label>
          Option title
          <input
            value={values.title}
            placeholder="Generated automatically"
            onChange={(event) => update({ title: event.target.value })}
          />
        </label>
        <label>
          Unique SKU
          <input
            value={values.sku}
            placeholder={`${product.sku}-M-BLK`}
            onChange={(event) =>
              update({ sku: event.target.value.toUpperCase() })
            }
          />
        </label>
        <label>
          Regular price (N$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={(event) => update({ price: Number(event.target.value) })}
          />
        </label>
        <label>
          Sale price (N$)
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.salePrice ?? ""}
            onChange={(event) =>
              update({
                salePrice:
                  event.target.value === "" ? null : Number(event.target.value),
              })
            }
          />
        </label>
        <label>
          Stock on hand
          <input
            type="number"
            min="0"
            value={values.onHand}
            onChange={(event) => update({ onHand: Number(event.target.value) })}
          />
        </label>
      </div>
      <footer>
        <button className="secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          disabled={!values.sku.trim() || !Number.isFinite(values.price)}
          onClick={submit}
        >
          Create active option
        </button>
      </footer>
    </div>
  );
}
