"use client";

import { useMemo, useState } from "react";

export type AdminTransaction = {
  recordId: string;
  checkoutReference: string | null;
  provider: string;
  providerReference: string | null;
  paymentMethod: string;
  amount: number;
  currency: string;
  status: string;
  source: string;
  customerName: string | null;
  customerEmail: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  lastCheckedAt: string | null;
  orderReferences: string[];
  allocations: {
    orderId: number;
    merchantName: string;
    grossAmount: number;
    platformFee: number;
    providerFee: number;
    netAmount: number;
    settlementStatus: string;
    settledAt: string | null;
  }[];
};

export type TransactionSummary = { totalRecords: number; successfulValue: number; pendingCount: number; failedCount: number; unsettledValue: number };

const money = (value: number, currency = "NAD") => `${currency === "NAD" ? "N$" : `${currency} `}${Number(value).toFixed(2)}`;
const pretty = (value: string) => value.replaceAll("_", " ");

export default function AdminTransactionLedger({ transactions, summary }: { transactions: AdminTransaction[]; summary: TransactionSummary }) {
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const methods = [...new Set(transactions.map((row) => row.paymentMethod))];
  const visible = useMemo(() => transactions.filter((row) => {
    const matchesStatus = status === "all" || (status === "successful" ? row.status === "paid" : status === "pending" ? ["created", "creating", "pending"].includes(row.status) : status === "failed" ? ["failed", "cancelled", "expired"].includes(row.status) : row.status === status);
    const matchesMethod = method === "all" || row.paymentMethod === method;
    const haystack = [row.checkoutReference, row.providerReference, row.customerName, row.customerEmail, ...row.orderReferences, ...row.allocations.map((item) => item.merchantName)].filter(Boolean).join(" ").toLowerCase();
    return matchesStatus && matchesMethod && haystack.includes(query.trim().toLowerCase());
  }), [transactions, status, method, query]);
  return <div className="admin-transaction-ledger">
    <section className="transaction-analytics transaction-ledger-summary">
      <article><span>Records</span><strong>{summary.totalRecords}</strong></article>
      <article><span>Successful value</span><strong>{money(summary.successfulValue)}</strong></article>
      <article><span>Awaiting payment</span><strong>{summary.pendingCount}</strong></article>
      <article><span>Failed / cancelled</span><strong>{summary.failedCount}</strong></article>
      <article><span>Due to merchants</span><strong>{money(summary.unsettledValue)}</strong></article>
    </section>
    <section className="transaction-ledger-tools" aria-label="Transaction filters">
      <label><span>Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, customer or merchant…" /></label>
      <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="successful">Successful</option><option value="pending">Awaiting payment</option><option value="failed">Failed / cancelled</option><option value="refunded">Refunded</option></select></label>
      <label><span>Method</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="all">All methods</option>{methods.map((item) => <option value={item} key={item}>{pretty(item)}</option>)}</select></label>
      <div><span>Showing</span><strong>{visible.length} record{visible.length === 1 ? "" : "s"}</strong></div>
    </section>
    {!visible.length ? <div className="admin-empty"><span>NC</span><h3>No matching transactions</h3><p>Change the filters or search terms to see more records.</p></div> : <div className="transaction-ledger-list">
      {visible.map((row) => <article className="transaction-ledger-row" key={row.recordId}>
        <button className="transaction-ledger-main" onClick={() => setExpanded(expanded === row.recordId ? null : row.recordId)} aria-expanded={expanded === row.recordId}>
          <span className={`payment-ledger-status payment-${row.status}`}>{pretty(row.status)}</span>
          <span><b>{row.checkoutReference ?? row.orderReferences[0]}</b><small>{row.orderReferences.join(" · ")}</small></span>
          <span><b>{pretty(row.paymentMethod)}</b><small>{row.source === "gateway" ? "Online gateway" : "Recorded from order"}</small></span>
          <span><b>{row.customerName ?? "Customer"}</b><small>{row.customerEmail ?? "No email"}</small></span>
          <span><b>{money(row.amount, row.currency)}</b><small>{new Date(row.createdAt).toLocaleString("en-NA")}</small></span>
          <span className="ledger-chevron">{expanded === row.recordId ? "−" : "+"}</span>
        </button>
        {expanded === row.recordId && <div className="transaction-ledger-detail">
          <div><span>Provider reference</span><b>{row.providerReference ?? "Not issued"}</b></div>
          <div><span>Last gateway check</span><b>{row.lastCheckedAt ? new Date(row.lastCheckedAt).toLocaleString("en-NA") : "Not checked"}</b></div>
          {row.failureMessage && <p className="transaction-failure"><b>Payment issue:</b> {row.failureMessage}</p>}
          <section><h4>Merchant allocations</h4>{row.allocations.map((item) => <div className="transaction-allocation" key={`${row.recordId}-${item.orderId}`}><span><b>{item.merchantName}</b><small>NC-{String(item.orderId).padStart(6, "0")}</small></span><span><small>Gross</small><b>{money(item.grossAmount)}</b></span><span><small>Fees</small><b>{money(Number(item.platformFee) + Number(item.providerFee))}</b></span><span><small>Merchant due</small><b>{money(item.netAmount)}</b></span><span className={`settlement-${item.settlementStatus}`}>{pretty(item.settlementStatus)}</span></div>)}</section>
        </div>}
      </article>)}
    </div>}
  </div>;
}
