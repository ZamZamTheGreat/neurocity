"use client";
import { useEffect, useRef, useState } from "react";
import { merchantCategoryNames } from "../../lib/merchant-categories";
import { productTemplateForCategory } from "../../lib/product-category-templates";

export type NewProduct = {
  itemType: "product" | "service"; name: string; sku: string; category: string; brand: string; collection: string; description: string;
  price: number | null; salePrice: number | null; pricingModel: "fixed" | "from" | "quote"; durationMinutes: number | null;
  serviceMode: "at_business" | "at_customer" | "remote"; bookingRequired: boolean; badge: string; colours: string[]; sizes: string[];
};
const empty = (): NewProduct => ({ itemType: "product", name: "", sku: "", category: "", brand: "", collection: "", description: "", price: null, salePrice: null, pricingModel: "fixed", durationMinutes: null, serviceMode: "at_business", bookingRequired: true, badge: "", colours: [], sizes: [] });

export default function ProductCreatePanel({ open, busy, onClose, onCreate }: { open: boolean; busy: boolean; onClose: () => void; onCreate: (product: NewProduct, addAnother?: boolean) => Promise<boolean> }) {
  const [product, setProduct] = useState(empty);
  const [step, setStep] = useState(1);
  const [colourEntry, setColourEntry] = useState("");
  const [sizeEntry, setSizeEntry] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) { setStep(1); window.setTimeout(() => nameRef.current?.focus(), 50); } }, [open]);
  if (!open) return null;
  const service = product.itemType === "service";
  const template = productTemplateForCategory(product.category);
  const update = (values: Partial<NewProduct>) => setProduct((current) => ({ ...current, ...values }));
  const detailsValid = Boolean(product.name.trim() && product.sku.trim() && product.category.trim() && product.description.trim());
  const priceValid = product.pricingModel === "quote" || (product.price !== null && product.price >= 0);
  const saleValid = product.salePrice === null || (product.price !== null && product.salePrice >= 0 && product.salePrice < product.price);
  const variantCount = service ? 0 : Math.max(1, product.colours.length) * Math.max(1, product.sizes.length);
  const configurationValid = priceValid && saleValid && variantCount <= 100;
  const valid = detailsValid && configurationValid;
  const canContinue = step === 1 ? detailsValid : step === 2 ? configurationValid : valid;
  function setColours(value: string) { setColourEntry(value); update({ colours: [...new Set(value.split(",").map((colour) => colour.trim()).filter(Boolean))].slice(0, 20) }); }
  function toggleSize(size: string) { update({ sizes: product.sizes.includes(size) ? product.sizes.filter((item) => item !== size) : [...product.sizes, size] }); }
  function addCustomSize() { const value = sizeEntry.trim(); if (value && !product.sizes.includes(value)) update({ sizes: [...product.sizes, value].slice(0, 20) }); setSizeEntry(""); }
  function changeType(itemType: NewProduct["itemType"]) { update({ itemType, pricingModel: itemType === "service" ? "from" : "fixed", salePrice: null, colours: [], sizes: [] }); setColourEntry(""); }
  async function submit(event: React.FormEvent) { event.preventDefault(); if (step < 3) { if (canContinue) setStep(step + 1); return; } if (valid && await onCreate(product)) { setProduct(empty()); setColourEntry(""); setStep(1); } }
  async function saveAndAddAnother() { if (valid && await onCreate(product, true)) { setProduct(empty()); setColourEntry(""); setStep(1); window.setTimeout(() => nameRef.current?.focus(), 50); } }
  const stepLabels = service ? ["Details", "Booking & pricing", "Review & create"] : ["Details", "Pricing & options", "Review & create"];

  return <div className="product-create-backdrop" role="button" tabIndex={0} aria-label="Close catalogue form" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }} onKeyDown={(event) => { if (event.key === "Escape" && !busy) onClose(); }}>
    <form className="product-create-panel" onSubmit={submit}>
      <header><div><small>NEW CATALOGUE ITEM · STEP {step} OF 3</small><h2>Add a {service ? "service" : "product"}</h2><p>{step === 1 ? "Start with the information customers need to understand it." : step === 2 ? service ? "Set how customers book and what they should expect to pay." : "Set the price and choices customers can select." : "Check the draft before NeuroCity creates it."}</p></div><button type="button" aria-label="Close catalogue form" disabled={busy} onClick={onClose}>×</button></header>
      <div className="product-create-progress" aria-label={`Step ${step} of 3`}>{stepLabels.map((label, index) => <span key={label} className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} aria-current={step === index + 1 ? "step" : undefined}><b>{step > index + 1 ? "✓" : index + 1}</b>{label}{index < 2 && <i />}</span>)}</div>

      {step === 1 && <div className="product-create-fields product-create-step">
        <label className="wide">What are you adding?<select value={product.itemType} onChange={(event) => changeType(event.target.value as NewProduct["itemType"])}><option value="product">Physical or digital product</option><option value="service">Bookable or quoted service</option></select></label>
        <label className="wide">{service ? "Service name" : "Product name"}<input ref={nameRef} required value={product.name} placeholder={service ? "e.g. 60-minute haircut" : "e.g. Crown V1 Cuffed Tracksuit"} onChange={(event) => update({ name: event.target.value })} /></label>
        <label>{service ? "Service reference" : "Product SKU"}<input required value={product.sku} placeholder={service ? "e.g. CUT-60" : "e.g. LW-CROWN-V1"} onChange={(event) => update({ sku: event.target.value.toUpperCase().replace(/\s+/g, "-") })} /></label>
        <label>Category{service ? <input required value={product.category} placeholder="e.g. Hair services" onChange={(event) => update({ category: event.target.value })} /> : <select required value={product.category} onChange={(event) => { update({ category: event.target.value, colours: [], sizes: [] }); setColourEntry(""); setSizeEntry(""); }}><option value="">Choose a product category</option>{merchantCategoryNames.filter((name) => name !== "Services").map((name) => <option key={name} value={name}>{name}</option>)}</select>}</label>
        <label>Brand or provider<input value={product.brand} onChange={(event) => update({ brand: event.target.value })} /></label>
        <label>Collection or service group<input value={product.collection} onChange={(event) => update({ collection: event.target.value })} /></label>
        <label className="wide">Description<textarea required value={product.description} placeholder={service ? "Explain what is included, who it is for and anything customers should prepare." : "Describe the product, materials, fit and key details."} onChange={(event) => update({ description: event.target.value })} /></label>
        <label className="wide">Storefront badge (optional)<input value={product.badge} placeholder={service ? "e.g. Same-day appointments" : "e.g. New arrival"} onChange={(event) => update({ badge: event.target.value })} /></label>
      </div>}

      {step === 2 && <div className="product-create-fields product-create-step">
        {service ? <>
          <label>Pricing<select value={product.pricingModel} onChange={(event) => update({ pricingModel: event.target.value as NewProduct["pricingModel"], price: event.target.value === "quote" ? null : product.price })}><option value="fixed">Fixed price</option><option value="from">Starting from</option><option value="quote">Quote required</option></select></label>
          {product.pricingModel !== "quote" && <label>{product.pricingModel === "from" ? "Starting price (N$)" : "Regular price (N$)"}<input required type="number" min="0" step="0.01" value={product.price ?? ""} onChange={(event) => update({ price: event.target.value === "" ? null : Number(event.target.value) })} /></label>}
          <label>Duration (minutes)<input type="number" min="5" max="10080" value={product.durationMinutes ?? ""} placeholder="e.g. 60" onChange={(event) => update({ durationMinutes: event.target.value ? Number(event.target.value) : null })} /></label>
          <label>Service delivered<select value={product.serviceMode} onChange={(event) => update({ serviceMode: event.target.value as NewProduct["serviceMode"] })}><option value="at_business">At the business</option><option value="at_customer">At the customer</option><option value="remote">Online / remotely</option></select></label>
          <label className="check wide"><input type="checkbox" checked={product.bookingRequired} onChange={(event) => update({ bookingRequired: event.target.checked })} /> Appointment or request required</label>
        </> : <>
          <label>Regular price (N$)<input required type="number" min="0" step="0.01" value={product.price ?? ""} onChange={(event) => update({ price: event.target.value === "" ? null : Number(event.target.value) })} /></label>
          <label>Sale price (optional)<input type="number" min="0" step="0.01" value={product.salePrice ?? ""} onChange={(event) => update({ salePrice: event.target.value === "" ? null : Number(event.target.value) })} /><small>Must be lower than the regular price.</small></label>
          <label className="wide">{template.optionLabel}<input value={colourEntry} placeholder={template.optionPlaceholder} onChange={(event) => setColours(event.target.value)} /><small>{template.optionHelp} Separate entries with commas; leave empty for a single product.</small></label>
          <fieldset className="wide product-size-picker"><legend>{template.choiceLabel}</legend><small>{template.choiceHelp} Leave empty when no second choice is needed.</small><div>{template.choices.map((size) => <label key={size} className={product.sizes.includes(size) ? "selected" : ""}><input type="checkbox" checked={product.sizes.includes(size)} onChange={() => toggleSize(size)} /><span>{size}</span></label>)}</div><label className="product-custom-option"><span>Exact or custom value</span><input value={sizeEntry} placeholder="Type a value" onChange={(event) => setSizeEntry(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addCustomSize(); } }} /><button type="button" onClick={addCustomSize}>Add</button></label></fieldset>
          <div className={`wide variant-plan ${variantCount > 100 ? "invalid" : ""}`} aria-live="polite"><b>{variantCount} stock item{variantCount === 1 ? "" : "s"} will be prepared</b><span>{product.colours.length ? product.colours.join(" · ") : "Single option"} × {product.sizes.length ? product.sizes.join(" · ") : "No second choice"}</span>{variantCount > 100 && <strong>Reduce the choices to 100 variants or fewer.</strong>}</div>
        </>}
        {!priceValid && <p className="form-error wide" role="alert">Enter a valid non-negative price, or choose quote required.</p>}{!saleValid && <p className="form-error wide" role="alert">The sale price must be lower than the regular price.</p>}
      </div>}

      {step === 3 && <div className="product-create-review product-create-step">
        <div><small>{service ? "SERVICE" : "PRODUCT"}</small><h3>{product.name}</h3><p>{product.sku} · {product.category}</p></div>
        <dl><div><dt>Price</dt><dd>{product.pricingModel === "quote" ? "Quote required" : `N$${Number(product.price).toFixed(2)}`}{product.salePrice !== null ? ` · Sale N$${product.salePrice.toFixed(2)}` : ""}</dd></div><div><dt>{service ? "Delivery" : "Options"}</dt><dd>{service ? product.serviceMode.replaceAll("_", " ") : `${variantCount} variant${variantCount === 1 ? "" : "s"}`}</dd></div><div><dt>Description</dt><dd>{product.description}</dd></div></dl>
        <aside><b>Created privately as a draft</b><span>After creation, add product and option images, confirm stock, review the generated SKUs, and publish when ready.</span></aside>
      </div>}

      <footer><button type="button" className="secondary" disabled={busy} onClick={onClose}>Cancel</button>{step > 1 && <button type="button" className="secondary" disabled={busy} onClick={() => setStep(step - 1)}>← Back</button>}{step === 3 && <button type="button" className="secondary" disabled={!valid || busy} onClick={() => void saveAndAddAnother()}>Save & add another</button>}<button type="submit" disabled={!canContinue || busy}>{busy ? "Creating…" : step < 3 ? "Continue →" : `Create ${service ? "service" : "product"} draft`}</button></footer>
    </form>
  </div>;
}
