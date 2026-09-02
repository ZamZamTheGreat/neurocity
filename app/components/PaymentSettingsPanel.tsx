"use client";

import { useMemo, useState } from "react";

export type PaymentSettings = { payOnCollectionEnabled: boolean; eftEnabled: boolean; bankName: string; accountHolder: string; accountType: string; accountNumber: string; branchCode: string; referenceInstructions: string };
export type MerchantSettlement = { id: number; orderId: number; grossAmount: number; platformFee: number; providerFee: number; netAmount: number; status: string; effectiveStatus?: string; dueAt: string | null; settledAt: string | null; reference: string | null; orderCreatedAt: string };

export default function PaymentSettingsPanel({ settings, setSettings, settlements, settlementSummary, setMessage }: { settings: PaymentSettings; setSettings: (settings: PaymentSettings) => void; settlements: MerchantSettlement[]; settlementSummary: { pendingCustomerPayment: number; scheduled: number; dueNow: number; processing: number; awaitingSettlement: number; settled: number; refundAdjustment: number; grossSales: number }; setMessage: (message: string) => void }) {
  const [statusFilter, setStatusFilter] = useState("all");
  const visible = useMemo(() => settlements.filter((item) => statusFilter === "all" || (item.effectiveStatus ?? item.status) === statusFilter), [settlements, statusFilter]);
  const money = (value: number) => `N$${Number(value).toFixed(2)}`;
  function downloadStatement() {
    const rows = [["Order", "Order date", "Gross", "Platform fee", "Provider fee", "Net due", "Status", "Due date", "Settled date", "Bank reference"], ...settlements.map((item) => [`NC-${String(item.orderId).padStart(6, "0")}`, new Date(item.orderCreatedAt).toISOString(), item.grossAmount, item.platformFee, item.providerFee, item.netAmount, item.effectiveStatus ?? item.status, item.dueAt ?? "", item.settledAt ?? "", item.reference ?? ""])];
    const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `neurocity-settlement-statement-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  async function save() {
    const response = await fetch("/api/merchant/payments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setSettings(data.settings); setMessage("Settlement bank account saved securely.");
  }
  return <section className="payment-settings-panel">
    <header><div><p className="eyebrow">Getting paid</p><h2>NeuroCity settlements</h2><ul className="info-list"><li>Customers pay the complete bag total to NeuroCity through PayToday.</li><li>Your share is recorded per order and becomes due on a T+2 business-day basis.</li></ul></div><span>PayToday · T+2</span></header>
    <div className="transaction-analytics"><article><span>Gross recorded sales</span><strong>{money(settlementSummary.grossSales)}</strong></article><article><span>Pending customer payment</span><strong>{money(settlementSummary.pendingCustomerPayment)}</strong></article><article><span>Scheduled T+2</span><strong>{money(settlementSummary.scheduled)}</strong></article><article><span>Due now</span><strong>{money(settlementSummary.dueNow)}</strong></article><article><span>Processing</span><strong>{money(settlementSummary.processing)}</strong></article><article><span>Settled to date</span><strong>{money(settlementSummary.settled)}</strong></article>{settlementSummary.refundAdjustment > 0 && <article><span>Refund adjustment</span><strong>{money(settlementSummary.refundAdjustment)}</strong></article>}</div>
    <div className="payment-fields">
      <label>Bank<select value={settings.bankName} onChange={(event) => setSettings({ ...settings, bankName: event.target.value })}><option value="">Choose bank</option><option>FNB Namibia</option><option>Nedbank Namibia</option><option>Bank Windhoek</option><option>Standard Bank Namibia</option><option>Letshego Bank Namibia</option><option>Other</option></select></label>
      <label>Account holder<input value={settings.accountHolder} onChange={(event) => setSettings({ ...settings, accountHolder: event.target.value })} /></label>
      <label>Account type<input placeholder="e.g. Business cheque" value={settings.accountType} onChange={(event) => setSettings({ ...settings, accountType: event.target.value })} /></label>
      <label>Account number<input inputMode="numeric" value={settings.accountNumber} onChange={(event) => setSettings({ ...settings, accountNumber: event.target.value })} /></label>
      <label>Branch code<input inputMode="numeric" value={settings.branchCode} onChange={(event) => setSettings({ ...settings, branchCode: event.target.value })} /></label>
    </div>
    <footer><button onClick={save}>Save settlement account</button></footer>
    <div className="account-list"><div className="account-panel-title"><div><h3>Settlement statement</h3><small>Every customer order allocated to your business.</small></div><div><select aria-label="Filter settlement status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All entries</option><option value="pending_payment">Pending customer payment</option><option value="scheduled">Scheduled T+2</option><option value="due">Due now</option><option value="processing">Processing</option><option value="settled">Settled</option><option value="refund_required">Refund adjustment</option><option value="cancelled">Cancelled</option></select><button onClick={downloadStatement} disabled={!settlements.length}>Download CSV</button></div></div>{visible.map((item) => <article className="account-order expanded" key={item.id}><div><span>NC-{String(item.orderId).padStart(6, "0")}</span><strong>{money(item.netAmount)}</strong><small>Order {new Date(item.orderCreatedAt).toLocaleDateString("en-NA")}</small></div><div><span className="order-status">{(item.effectiveStatus ?? item.status).replaceAll("_", " ")}</span><small>Gross {money(item.grossAmount)} · Fees {money(Number(item.platformFee) + Number(item.providerFee))}</small><small>{item.settledAt ? `Paid ${new Date(item.settledAt).toLocaleDateString("en-NA")}` : item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString("en-NA")}` : "Waiting for customer payment"}</small>{item.reference && <small>Bank ref: {item.reference}</small>}</div></article>)}{!visible.length && <p>No statement entries match this status.</p>}</div>
  </section>;
}
