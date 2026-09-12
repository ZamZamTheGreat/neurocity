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
  capturedAt: string | null;
  orderReferences: string[];
  allocations: {
    id: number;
    orderId: number;
    merchantId: number;
    merchantName: string;
    grossAmount: number;
    platformFee: number;
    providerFee: number;
    netAmount: number;
    settlementStatus: string;
    settlementDueAt: string | null;
    settlementReference: string | null;
    settledAt: string | null;
    settlementAccount: {
      bankName: string;
      accountHolder: string;
      accountType: string;
      accountNumber: string;
      branchCode: string;
      complete: boolean;
    };
  }[];
};

export type TransactionSummary = { totalRecords: number; successfulValue: number; pendingCount: number; failedCount: number; unsettledValue: number; dueNowValue?: number; refundRequiredValue?: number };

const money = (value: number, currency = "NAD") => `${currency === "NAD" ? "N$" : `${currency} `}${Number(value).toFixed(2)}`;
const pretty = (value: string) => value.replaceAll("_", " ");
const windhoekDate = (value: string | Date) => {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Africa/Windhoek", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value));
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
};
const csvDownload = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}\r\n`], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = filename; link.click(); URL.revokeObjectURL(url);
};

export default function AdminTransactionLedger({ transactions, summary }: { transactions: AdminTransaction[]; summary: TransactionSummary }) {
  const [now] = useState(() => Date.now());
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [reconciling, setReconciling] = useState(false);
  const [reportDate, setReportDate] = useState(() => windhoekDate(new Date()));
  const [reportView, setReportView] = useState<"transactions" | "merchants">("transactions");
  async function reconcile() {
    setReconciling(true);
    try {
      const response = await fetch("/api/admin/transactions/reconcile", { method: "POST" });
      const result = await response.json();
      if (!response.ok) return setNotice(result.error ?? "PayToday reconciliation failed.");
      setNotice(`Checked ${result.checked} pending PayToday payment${result.checked === 1 ? "" : "s"}; ${result.updated} final status${result.updated === 1 ? "" : "es"} recorded.`);
      if (result.updated) window.setTimeout(() => window.location.reload(), 500);
    } catch {
      setNotice("PayToday could not be reached. The automatic status check will try again.");
    } finally {
      setReconciling(false);
    }
  }
  async function settle(allocationId: number, merchantName: string) {
    const reference = window.prompt(`Enter the bank transfer reference for ${merchantName}:`);
    if (!reference?.trim()) return;
    const response = await fetch("/api/admin/transactions", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ allocationId, action: "mark_settled", reference }) });
    const result = await response.json();
    if (!response.ok) return setNotice(result.error ?? "Settlement could not be recorded.");
    setNotice("Merchant settlement recorded. Refreshing ledger…");
    window.location.reload();
  }
  const methods = [...new Set(transactions.map((row) => row.paymentMethod))];
  const visible = useMemo(() => transactions.filter((row) => {
    const matchesStatus = status === "all" || (status === "successful" ? row.status === "paid" : status === "pending" ? ["created", "creating", "pending"].includes(row.status) : status === "failed" ? ["failed", "cancelled", "expired"].includes(row.status) : row.status === status);
    const matchesMethod = method === "all" || row.paymentMethod === method;
    const haystack = [row.checkoutReference, row.providerReference, row.customerName, row.customerEmail, ...row.orderReferences, ...row.allocations.map((item) => item.merchantName)].filter(Boolean).join(" ").toLowerCase();
    return matchesStatus && matchesMethod && haystack.includes(query.trim().toLowerCase());
  }), [transactions, status, method, query]);
  const merchantBalances = useMemo(() => {
    const balances = new Map<number, { merchantId: number; merchant: string; pendingPayment: number; scheduled: number; dueNow: number; settled: number; refundReview: number }>();
    for (const allocation of transactions.flatMap((row) => row.allocations)) {
      const current = balances.get(allocation.merchantId) ?? { merchantId: allocation.merchantId, merchant: allocation.merchantName, pendingPayment: 0, scheduled: 0, dueNow: 0, settled: 0, refundReview: 0 };
      const amount = Number(allocation.netAmount);
      if (allocation.settlementStatus === "pending_payment") current.pendingPayment += amount;
      else if (allocation.settlementStatus === "settled") current.settled += amount;
      else if (allocation.settlementStatus === "refund_required") current.refundReview += amount;
      else if (["unpaid", "due"].includes(allocation.settlementStatus) || (allocation.settlementStatus === "scheduled" && allocation.settlementDueAt && new Date(allocation.settlementDueAt).getTime() <= now)) current.dueNow += amount;
      else if (["scheduled", "processing"].includes(allocation.settlementStatus)) current.scheduled += amount;
      balances.set(allocation.merchantId, current);
    }
    return [...balances.values()].sort((a, b) => b.dueNow + b.scheduled - a.dueNow - a.scheduled);
  }, [transactions, now]);
  const dailyTransactions = useMemo(() => transactions.filter((row) => {
    const effectiveDate = row.status === "paid" ? row.capturedAt ?? row.updatedAt : row.createdAt;
    return windhoekDate(effectiveDate) === reportDate;
  }), [transactions, reportDate]);
  const dailyMerchantTotals = useMemo(() => {
    const totals = new Map<number, { merchantId: number; merchantName: string; transactionCount: number; gross: number; providerFee: number; platformFee: number; net: number; account: AdminTransaction["allocations"][number]["settlementAccount"] }>();
    for (const allocation of dailyTransactions.filter((row) => row.status === "paid").flatMap((row) => row.allocations)) {
      const current = totals.get(allocation.merchantId) ?? { merchantId: allocation.merchantId, merchantName: allocation.merchantName, transactionCount: 0, gross: 0, providerFee: 0, platformFee: 0, net: 0, account: allocation.settlementAccount };
      current.transactionCount += 1;
      current.gross += Number(allocation.grossAmount);
      current.providerFee += Number(allocation.providerFee);
      current.platformFee += Number(allocation.platformFee);
      current.net += Number(allocation.netAmount);
      current.account = allocation.settlementAccount;
      totals.set(allocation.merchantId, current);
    }
    return [...totals.values()].sort((a, b) => b.net - a.net);
  }, [dailyTransactions]);
  const dailySummary = useMemo(() => ({
    records: dailyTransactions.length,
    paid: dailyTransactions.filter((row) => row.status === "paid").length,
    gross: dailyMerchantTotals.reduce((sum, row) => sum + row.gross, 0),
    providerFees: dailyMerchantTotals.reduce((sum, row) => sum + row.providerFee, 0),
    platformFees: dailyMerchantTotals.reduce((sum, row) => sum + row.platformFee, 0),
    merchantNet: dailyMerchantTotals.reduce((sum, row) => sum + row.net, 0),
  }), [dailyTransactions, dailyMerchantTotals]);
  const reconciliation = useMemo(() => {
    const allocations = transactions.filter((row) => row.source === "gateway").flatMap((row) => row.allocations);
    const gross = allocations.reduce((sum, item) => sum + Number(item.grossAmount), 0);
    const platformFees = allocations.reduce((sum, item) => sum + Number(item.platformFee), 0);
    const providerFees = allocations.reduce((sum, item) => sum + Number(item.providerFee), 0);
    const merchantNet = allocations.reduce((sum, item) => sum + Number(item.netAmount), 0);
    return { gross, platformFees, providerFees, merchantNet, difference: gross - platformFees - providerFees - merchantNet };
  }, [transactions]);
  function downloadReconciliation() {
    const rows = [["Merchant ID", "Merchant", "Pending customer payment", "Scheduled", "Due now", "Settled", "Refund review"], ...merchantBalances.map((item) => [item.merchantId, item.merchant, item.pendingPayment, item.scheduled, item.dueNow, item.settled, item.refundReview])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a"); link.href = url; link.download = `neurocity-merchant-balancing-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  }
  function downloadDailyTransactions() {
    csvDownload(`neurocity-transactions-${reportDate}.csv`, [["Report date", reportDate], ["Timezone", "Africa/Windhoek"], [], ["Captured / created", "Checkout", "Provider reference", "Status", "Method", "Customer", "Amount", "Currency", "Orders", "Merchants"], ...dailyTransactions.map((row) => [row.status === "paid" ? row.capturedAt ?? row.updatedAt : row.createdAt, row.checkoutReference ?? "", row.providerReference ?? "", row.status, row.paymentMethod, row.customerName ?? "", row.amount, row.currency, row.orderReferences.join(" | "), row.allocations.map((item) => item.merchantName).join(" | ")])]);
  }
  function downloadDailyMerchantTotals() {
    csvDownload(`neurocity-merchant-totals-${reportDate}.csv`, [["Report date", reportDate], ["Timezone", "Africa/Windhoek"], [], ["Merchant ID", "Merchant", "Transactions", "Gross", "PayToday fee (2.5%)", "NeuroCity fee (1.5%)", "Merchant net", "Bank", "Account holder", "Account type", "Account number", "Branch code", "Settlement details complete"], ...dailyMerchantTotals.map((row) => [row.merchantId, row.merchantName, row.transactionCount, row.gross.toFixed(2), row.providerFee.toFixed(2), row.platformFee.toFixed(2), row.net.toFixed(2), row.account.bankName, row.account.accountHolder, row.account.accountType, row.account.accountNumber, row.account.branchCode, row.account.complete ? "Yes" : "No"])]);
  }
  return <div className="admin-transaction-ledger">
    <section className="transaction-analytics transaction-ledger-summary">
      <article><span>Records</span><strong>{summary.totalRecords}</strong></article>
      <article><span>Successful value</span><strong>{money(summary.successfulValue)}</strong></article>
      <article><span>Awaiting payment</span><strong>{summary.pendingCount}</strong></article>
      <article><span>Failed / cancelled</span><strong>{summary.failedCount}</strong></article>
      <article><span>Due to merchants</span><strong>{money(summary.unsettledValue)}</strong></article>
      <article><span>Due now</span><strong>{money(summary.dueNowValue ?? 0)}</strong></article>
      <article><span>Refund review</span><strong>{money(summary.refundRequiredValue ?? 0)}</strong></article>
    </section>
    {notice && <p className="workspace-message">{notice}</p>}
    <section className="daily-settlement-report">
      <header><div><small>DAILY FINANCIAL DOCUMENT</small><h3>Daily transaction report</h3><p>Payment activity and merchant revenue grouped by the capture date in Africa/Windhoek.</p></div><label>Report date<input type="date" value={reportDate} max={windhoekDate(new Date())} onChange={(event) => setReportDate(event.target.value)} /></label></header>
      <div className="daily-report-metrics"><article><span>Payment records</span><strong>{dailySummary.records}</strong></article><article><span>Successful payments</span><strong>{dailySummary.paid}</strong></article><article><span>Gross captured</span><strong>{money(dailySummary.gross)}</strong></article><article><span>Merchant net</span><strong>{money(dailySummary.merchantNet)}</strong></article></div>
      <div className="daily-report-tabs"><button className={reportView === "transactions" ? "active" : ""} onClick={() => setReportView("transactions")}>Transactions</button><button className={reportView === "merchants" ? "active" : ""} onClick={() => setReportView("merchants")}>Merchant totals</button><button onClick={reportView === "transactions" ? downloadDailyTransactions : downloadDailyMerchantTotals} disabled={reportView === "transactions" ? !dailyTransactions.length : !dailyMerchantTotals.length}>Download {reportView === "transactions" ? "transactions" : "merchant totals"} CSV</button></div>
      {reportView === "transactions" ? <div className="daily-report-table"><div className="daily-report-head"><span>Time / reference</span><span>Status</span><span>Customer</span><span>Merchant allocation</span><span>Total</span></div>{dailyTransactions.map((row) => <article key={row.recordId}><span><b>{new Date(row.status === "paid" ? row.capturedAt ?? row.updatedAt : row.createdAt).toLocaleTimeString("en-NA", { hour: "2-digit", minute: "2-digit" })}</b><small>{row.checkoutReference ?? row.orderReferences[0]}</small></span><b className={`payment-ledger-status payment-${row.status}`}>{pretty(row.status)}</b><span><b>{row.customerName ?? "Customer"}</b><small>{row.customerEmail ?? ""}</small></span><span>{row.allocations.map((item) => <small key={item.id}>{item.merchantName}: {money(item.netAmount)}</small>)}</span><strong>{money(row.amount, row.currency)}</strong></article>)}</div> : <div className="daily-report-table merchant-daily-table"><div className="daily-report-head"><span>Merchant</span><span>Transactions</span><span>Gross</span><span>Fees</span><span>Net payout</span></div>{dailyMerchantTotals.map((row) => <article key={row.merchantId}><span><b>{row.merchantName}</b><small className={row.account.complete ? "account-ready" : "account-missing"}>{row.account.complete ? `${row.account.bankName} · ${row.account.accountNumber}` : "Settlement details incomplete"}</small></span><b>{row.transactionCount}</b><span>{money(row.gross)}</span><span><small>PayToday {money(row.providerFee)}</small><small>NeuroCity {money(row.platformFee)}</small></span><strong>{money(row.net)}</strong></article>)}</div>}
      {!(reportView === "transactions" ? dailyTransactions.length : dailyMerchantTotals.length) && <p className="daily-report-empty">No {reportView === "transactions" ? "payment activity" : "successful merchant revenue"} was recorded for this date.</p>}
    </section>
    <section className="merchant-balance-summary"><div className="account-panel-title"><div><h3>Merchant balancing sheet</h3><small>Every checkout amount is split into fees and the amount owed to each merchant.</small></div><button type="button" onClick={downloadReconciliation} disabled={!merchantBalances.length}>Download CSV</button></div><div className="transaction-analytics"><article><span>Allocated gross</span><strong>{money(reconciliation.gross)}</strong></article><article><span>Platform fees</span><strong>{money(reconciliation.platformFees)}</strong></article><article><span>Provider fees</span><strong>{money(reconciliation.providerFees)}</strong></article><article><span>Merchant net</span><strong>{money(reconciliation.merchantNet)}</strong></article><article><span>Balance difference</span><strong>{money(reconciliation.difference)}</strong></article></div>{Math.abs(reconciliation.difference) > 0.009 && <p className="transaction-failure" role="alert"><b>Reconciliation mismatch:</b> allocated gross does not equal platform fees + provider fees + merchant net.</p>}<div className="merchant-table"><div className="merchant-table-head"><span>Merchant</span><span>Pending payment</span><span>Scheduled</span><span>Due now</span><span>Settled</span><span>Refund review</span></div>{merchantBalances.map((item) => <article key={item.merchantId}><strong>{item.merchant}</strong><span>{money(item.pendingPayment)}</span><span>{money(item.scheduled)}</span><span>{money(item.dueNow)}</span><span>{money(item.settled)}</span><span>{money(item.refundReview)}</span></article>)}</div>{!merchantBalances.length && <p>No merchant allocations have been recorded yet.</p>}</section>
    <section className="transaction-ledger-tools" aria-label="Transaction filters">
      <label><span>Search records</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Reference, customer or merchant…" /></label>
      <label><span>Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="successful">Successful</option><option value="pending">Awaiting payment</option><option value="failed">Failed / cancelled</option><option value="refunded">Refunded</option></select></label>
      <label><span>Method</span><select value={method} onChange={(event) => setMethod(event.target.value)}><option value="all">All methods</option>{methods.map((item) => <option value={item} key={item}>{pretty(item)}</option>)}</select></label>
      <div><span>Showing</span><strong>{visible.length} record{visible.length === 1 ? "" : "s"}</strong></div><button type="button" onClick={() => void reconcile()} disabled={reconciling}>{reconciling ? "Checking PayToday…" : "Sync PayToday now"}</button>
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
          <section><h4>Merchant allocations</h4>{row.allocations.map((item) => <div className="transaction-allocation" key={`${row.recordId}-${item.orderId}`}><span><b>{item.merchantName}</b><small>NC-{String(item.orderId).padStart(6, "0")}</small></span><span><small>Gross</small><b>{money(item.grossAmount)}</b></span><span><small>PayToday 2.5% · NeuroCity 1.5%</small><b>{money(Number(item.platformFee) + Number(item.providerFee))}</b></span><span><small>Merchant due</small><b>{money(item.netAmount)}</b></span><span><small>{item.settlementDueAt ? `Due ${new Date(item.settlementDueAt).toLocaleDateString("en-NA")}` : item.settlementStatus === "unpaid" ? "Legacy payable" : "Awaiting payment"}</small><b className={`settlement-${item.settlementStatus}`}>{pretty(item.settlementStatus)}</b>{["unpaid", "scheduled", "due", "processing"].includes(item.settlementStatus) && item.id > 0 ? <button onClick={() => settle(item.id, item.merchantName)}>Record payout</button> : null}{item.settlementReference ? <small>Ref: {item.settlementReference}</small> : null}</span></div>)}</section>
        </div>}
      </article>)}
    </div>}
  </div>;
}
