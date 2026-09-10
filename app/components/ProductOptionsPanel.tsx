"use client";

import { useState } from "react";
import ImageCropper from "./ImageCropper";
import { ManagedImage } from "./ManagedImage";
import { sizeOptionsForCategory } from "../../lib/product-size-options";

type Product = {
  id: number;
  itemType?: string;
  name: string;
  sku: string;
  price: number | null;
  salePrice?: number | null;
  category?: string | null;
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
type NewVariant = {
  sizes: string[];
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
  onVariantUpload,
}: {
  product: Product;
  variants: Variant[];
  onVariantChange: (variant: Variant) => void;
  onVariantSave: (variant: Variant) => Promise<void>;
  onVariantCreate: (values: NewVariant) => Promise<void>;
  onVariantUpload: (variants: Variant[], file?: File) => Promise<boolean>;
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
  const colourways = [...new Map(variants.map((variant) => [variant.color?.trim() || "Standard", variants.filter((row) => (row.color?.trim() || "Standard") === (variant.color?.trim() || "Standard"))])).values()];
  return (
    <section className="product-options">
      <header>
        <div>
          <small>CUSTOMER OPTIONS</small>
          <h3>Colourways, sizes and stock</h3>
          <p>
            {active
              ? `${active} active option${active === 1 ? "" : "s"}. Prices follow the product unless a colourway has its own price.`
              : "Add and activate at least one option to show the price and Add to bag."}
          </p>
        </div>
        <span className={active ? "option-ready" : "option-blocked"}>
          {active ? "Storefront ready" : "Action required"}
        </span>
      </header>
      {variants.length > 0 && (
        <div className="product-variant-list">
          {colourways.map((colourway) => (
            <ColourwayRow
              key={colourway[0].color ?? "Standard"}
              variants={colourway}
              onChange={onVariantChange}
              onSave={onVariantSave}
              onUpload={(file) => onVariantUpload(colourway, file)}
            />
          ))}
        </div>
      )}
      <NewVariantForm product={product} onCreate={onVariantCreate} />
    </section>
  );
}

function ColourwayRow({ variants, onChange, onSave, onUpload }: { variants: Variant[]; onChange: (variant: Variant) => void; onSave: (variant: Variant) => Promise<void>; onUpload: (file?: File) => Promise<boolean> }) {
  const [crop, setCrop] = useState<File | null>(null);
  const first = variants[0];
  const image = variants.find((variant) => variant.imageUrl)?.imageUrl ?? null;
  const color = first.color?.trim() || "Standard";
  const updateAll = (values: Partial<Variant>) => variants.forEach((variant) => onChange({ ...variant, ...values }));
  return <article className="colourway-editor">
    <header>
      <div className="variant-image">{image ? <ManagedImage src={image} alt={`${color} colourway`} /> : <span>No image</span>}<label>{image ? "Replace" : "Add image"}<input aria-label={`${image ? "Replace" : "Add"} ${color} colourway image`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setCrop(file); event.currentTarget.value = ""; }} /></label></div>
      <div><small>COLOURWAY</small><h4>{color}</h4><span>{variants.length} size{variants.length === 1 ? "" : "s"}</span></div>
      <select aria-label={`Status for ${color}`} value={variants.every((variant) => variant.status === first.status) ? first.status : "draft"} onChange={(event) => updateAll({ status: event.target.value })}><option value="active">Active</option><option value="draft">Draft</option><option value="needs_confirmation">Needs confirmation</option><option value="archived">Archived</option></select>
    </header>
    <div className="colourway-shared-fields">
      <label>Regular price<input type="number" min="0" step="0.01" value={first.price} onChange={(event) => updateAll({ price: Number(event.target.value), usesProductPrice: false })} /></label>
      <label>Sale price<input type="number" min="0" step="0.01" value={first.salePrice ?? ""} onChange={(event) => updateAll({ salePrice: event.target.value === "" ? null : Number(event.target.value), usesProductSalePrice: false })} /></label>
    </div>
    <div className="colourway-size-grid">{variants.map((variant) => { const stock = variant.stock[0] ?? { branchName: "Primary branch", onHand: 0, reserved: 0, safetyStock: 0 }; return <label key={variant.id}><b>{variant.size ?? "One size"}</b><span>{variant.sku}</span><input aria-label={`${color} ${variant.size ?? "One size"} stock`} type="number" min="0" value={stock.onHand} onChange={(event) => onChange({ ...variant, stock: [{ ...stock, onHand: Number(event.target.value) }] })} /><small>{Math.max(0, stock.onHand - stock.reserved - stock.safetyStock)} available</small></label>; })}</div>
    <details className="colourway-advanced"><summary>Advanced settings by size</summary><div>{variants.map((variant) => <VariantRow key={variant.id} variant={variant} onChange={onChange} onSave={() => onSave(variant)} onUpload={onUpload} />)}</div></details>
    <footer><button onClick={() => void Promise.all(variants.map(onSave))}>Save colourway</button></footer>
    {crop && <ImageCropper file={crop} aspect={4 / 5} width={1200} title={`Crop ${color} picture`} onCancel={() => setCrop(null)} onApply={async (file) => { if (await onUpload(file)) setCrop(null); }} />}
  </article>;
}

function VariantRow({
  variant,
  onChange,
  onSave,
  onUpload,
}: {
  variant: Variant;
  onChange: (variant: Variant) => void;
  onSave: () => void;
  onUpload: (file?: File) => Promise<boolean>;
}) {
  const [crop, setCrop] = useState<File | null>(null);
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
        <div className="variant-image">
          {variant.imageUrl ? <ManagedImage src={variant.imageUrl} alt={`${variant.title} variant`} /> : <span>No image</span>}
          <label>{variant.imageUrl ? "Replace" : "Add image"}<input aria-label={`${variant.imageUrl ? "Replace" : "Add"} ${variant.title} image`} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) setCrop(file); event.currentTarget.value = ""; }} /></label>
        </div>
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
              onChange({ ...variant, price: Number(event.target.value), usesProductPrice: false })
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
                usesProductSalePrice: false,
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
      {crop && <ImageCropper file={crop} aspect={4 / 5} width={1200} title={`Crop ${variant.title} picture`} onCancel={() => setCrop(null)} onApply={async (file) => { if (await onUpload(file)) setCrop(null); }} />}
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
    sizes: [] as string[],
    color: "",
    price: product.price ?? 0,
    salePrice: product.salePrice ?? null,
    onHand: 0,
  });
  const [values, setValues] = useState(initial);
  const [open, setOpen] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const sizeOptions = sizeOptionsForCategory(product.category);
  const update = (next: Partial<NewVariant>) =>
    setValues((current) => ({ ...current, ...next }));
  async function submit() {
    await onCreate(values);
    setValues(initial());
    setCustomSize("");
    setOpen(false);
  }
  if (!open)
    return (
      <button className="add-option-button" onClick={() => { setValues(initial()); setOpen(true); }}>
        + Add colourway and sizes
      </button>
    );
  return (
    <div className="new-variant-form">
      <div>
        <label>
          Colourway
          <input
            value={values.color}
            placeholder="e.g. Maroon"
            onChange={(event) => update({ color: event.target.value })}
          />
        </label>
        <fieldset className="size-multiselect">
          <legend>Available sizes</legend>
          <details>
            <summary>{values.sizes.length ? `${values.sizes.length} size${values.sizes.length === 1 ? "" : "s"} selected` : "Choose sizes"}</summary>
            <div>
              {sizeOptions.map((size) => <label key={size}><input type="checkbox" checked={values.sizes.includes(size)} onChange={() => update({ sizes: values.sizes.includes(size) ? values.sizes.filter((item) => item !== size) : [...values.sizes, size] })} />{size}</label>)}
              {values.sizes.filter((size) => !sizeOptions.includes(size)).map((size) => <label key={size}><input type="checkbox" checked onChange={() => update({ sizes: values.sizes.filter((item) => item !== size) })} />{size}</label>)}
              <div className="custom-size"><input value={customSize} placeholder="Custom size" onChange={(event) => setCustomSize(event.target.value)} /><button type="button" onClick={() => { const size = customSize.trim(); if (size && !values.sizes.includes(size)) update({ sizes: [...values.sizes, size] }); setCustomSize(""); }}>Add</button></div>
            </div>
          </details>
          <small>{product.category === "Shoes & Accessories" ? "European shoe sizes" : product.category === "Fashion & Clothing" ? "Clothing sizes" : `Suggested for ${product.category ?? "this category"}`}. You can add a custom size.</small>
        </fieldset>
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
          Starting stock per size
          <input
            type="number"
            min="0"
            value={values.onHand}
            onChange={(event) => update({ onHand: Number(event.target.value) })}
          />
        </label>
      </div>
      <p className="generated-sku-note">Prices are prefilled from the product and applied to every selected size. Change them here only when this colourway has a different price. NeuroCity will create one inventory option and a unique SKU for every selected size.</p>
      <footer>
        <button className="secondary" onClick={() => setOpen(false)}>
          Cancel
        </button>
        <button
          disabled={!values.color.trim() || values.sizes.length === 0 || !Number.isFinite(values.price)}
          onClick={submit}
        >
          Create {values.sizes.length || ""} size option{values.sizes.length === 1 ? "" : "s"}
        </button>
      </footer>
    </div>
  );
}
