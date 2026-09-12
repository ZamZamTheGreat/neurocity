"use client";

import { useState } from "react";
import { ManagedImage } from "./ManagedImage";

export type AdvertisingCampaign = { id: number; merchantId: number; productId: number | null; merchantName: string; merchantSlug: string; bannerUrl: string | null; productName: string | null; productImageUrl: string | null; placement: "home" | "marketplace" | "home_featured"; headline: string; description: string | null; callToAction: string; status: string; sortOrder: number; startsAt: string | null; endsAt: string | null };
export type AdvertisingMerchant = { id: number; name: string; slug: string; bannerUrl: string | null };
export type AdvertisingProduct = { id: number; merchantId: number; name: string; itemType: "product" | "service"; imageUrl: string | null };
const scheduledDate = (value: string) => value ? new Date(value).toISOString() : null;
const displayDate = (value: string | null) => value ? new Intl.DateTimeFormat("en-NA", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : null;

export default function AdminAdvertisingManager({ campaigns, merchants, products, reload, notify }: { campaigns: AdvertisingCampaign[]; merchants: AdvertisingMerchant[]; products: AdvertisingProduct[]; reload: () => Promise<void>; notify: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ merchantId: "", productId: "", placement: "home", headline: "", description: "", callToAction: "Visit store", startsAt: "", endsAt: "", sortOrder: "0", status: "draft" });
  const isFeaturedProduct = form.placement === "home_featured";
  const availableProducts = products.filter((product) => product.merchantId === Number(form.merchantId));
  async function create(event: React.FormEvent) {
    event.preventDefault(); setSaving(true); notify("");
    const response = await fetch("/api/admin/advertisements", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...form, merchantId: Number(form.merchantId), productId: isFeaturedProduct ? Number(form.productId) : null, sortOrder: Number(form.sortOrder), startsAt: scheduledDate(form.startsAt), endsAt: scheduledDate(form.endsAt) }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return notify(data.error ?? "The advertisement could not be saved.");
    setForm({ merchantId: "", productId: "", placement: "home", headline: "", description: "", callToAction: "Visit store", startsAt: "", endsAt: "", sortOrder: "0", status: "draft" });
    notify("Advertising campaign saved."); await reload();
  }
  async function update(id: number, status?: string, action?: string) {
    const response = await fetch("/api/admin/advertisements", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status, action }) });
    const data = await response.json();
    if (!response.ok) return notify(data.error ?? "The campaign could not be updated.");
    notify(action === "delete" ? "Campaign removed." : `Campaign ${status}.`); await reload();
  }
  return <div className="advertising-admin">
    <form className="advertising-form" onSubmit={create}>
      <header><div><small>NEW CAMPAIGN</small><h3>Manage banners and featured products</h3></div><span>Choose exactly what customers see and when it appears.</span></header>
      <div className="advertising-form-grid">
        <label>Store<select required value={form.merchantId} onChange={(event) => setForm({ ...form, merchantId: event.target.value, productId: "" })}><option value="">Choose a store</option>{merchants.map((merchant) => <option key={merchant.id} value={merchant.id}>{merchant.name}</option>)}</select></label>
        <label>Advertisement type<select value={form.placement} onChange={(event) => { const placement = event.target.value; setForm({ ...form, placement, productId: "", callToAction: placement === "home_featured" ? "View in store" : "Visit store" }); }}><option value="home">Homepage banner</option><option value="marketplace">Marketplace banner</option><option value="home_featured">Homepage featured product</option></select></label>
        {isFeaturedProduct && <label className="wide">Featured product or service<select required value={form.productId} disabled={!form.merchantId} onChange={(event) => setForm({ ...form, productId: event.target.value })}><option value="">{form.merchantId ? "Choose a published item" : "Choose a store first"}</option>{availableProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.itemType}</option>)}</select><small>Only published items from the selected store are available.</small></label>}
        {!isFeaturedProduct && <label className="wide">Headline<input required maxLength={180} value={form.headline} onChange={(event) => setForm({ ...form, headline: event.target.value })} placeholder="A clear reason to visit this store" /></label>}
        {!isFeaturedProduct && <label className="wide">Supporting text<textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Optional offer, collection or campaign detail" /></label>}
        {!isFeaturedProduct && <label>Button text<input maxLength={60} value={form.callToAction} onChange={(event) => setForm({ ...form, callToAction: event.target.value })} /></label>}
        <label>Display priority<input type="number" min="0" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} /></label>
        <label>Starts<input type="datetime-local" value={form.startsAt} onChange={(event) => setForm({ ...form, startsAt: event.target.value })} /></label>
        <label>Ends<input type="datetime-local" value={form.endsAt} onChange={(event) => setForm({ ...form, endsAt: event.target.value })} /></label>
        <label>Status<select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}><option value="draft">Draft</option><option value="active">Active</option><option value="paused">Paused</option></select></label>
      </div>
      <button className="primary-action" disabled={saving}>{saving ? "Saving…" : "Create campaign"}</button>
    </form>
    <section className="advertising-campaign-list">
      {campaigns.length ? campaigns.map((campaign) => <article key={campaign.id}>
        <div className="advertising-campaign-image">{(campaign.productImageUrl || campaign.bannerUrl) && <ManagedImage src={campaign.productImageUrl?.startsWith("r2://") && campaign.productId ? `/api/stores/${encodeURIComponent(campaign.merchantSlug)}/media?type=product&productId=${campaign.productId}` : campaign.productImageUrl || (campaign.bannerUrl!.startsWith("r2://") ? `/api/stores/${encodeURIComponent(campaign.merchantSlug)}/media?type=banner` : campaign.bannerUrl!)} alt="" />}</div>
        <div><small>{campaign.placement === "home_featured" ? "homepage featured product" : `${campaign.placement} banner`} · priority {campaign.sortOrder}</small><h3>{campaign.productName ?? campaign.headline}</h3><p>{campaign.merchantName}{campaign.description ? ` · ${campaign.description}` : ""}</p><p className="advertising-campaign-schedule">{campaign.startsAt ? `Starts ${displayDate(campaign.startsAt)}` : "Starts immediately"} · {campaign.endsAt ? `Ends ${displayDate(campaign.endsAt)}` : "No end date"}</p><span className={`review-status status-${campaign.status}`}>{campaign.status}</span></div>
        <div className="merchant-actions">{campaign.status !== "active" && <button onClick={() => update(campaign.id, "active")}>Activate</button>}{campaign.status === "active" && <button onClick={() => update(campaign.id, "paused")}>Pause</button>}<button className="danger-text" onClick={() => update(campaign.id, undefined, "delete")}>Remove</button></div>
      </article>) : <div className="admin-empty"><span>AD</span><h3>No campaigns yet</h3><p>Create a banner or select a homepage featured product above.</p></div>}
    </section>
  </div>;
}
