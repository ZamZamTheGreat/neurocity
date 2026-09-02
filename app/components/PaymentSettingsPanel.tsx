"use client";

export type PaymentSettings = { payOnCollectionEnabled: boolean; eftEnabled: boolean; bankName: string; accountHolder: string; accountType: string; accountNumber: string; branchCode: string; referenceInstructions: string };
export type MerchantSettlement = { id: number; orderId: number; grossAmount: number; platformFee: number; providerFee: number; netAmount: number; status: string; dueAt: string | null; settledAt: string | null; reference: string | null; orderCreatedAt: string };

export default function PaymentSettingsPanel({ settings, setSettings, settlements, settlementSummary, setMessage }: { settings: PaymentSettings; setSettings: (settings: PaymentSettings) => void; settlements: MerchantSettlement[]; settlementSummary: { awaitingSettlement: number; settled: number }; setMessage: (message: string) => void }) {
  async function save() {
    const response = await fetch("/api/merchant/payments", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(settings) });
    const data = await response.json();
    if (!response.ok) return setMessage(data.error);
    setSettings(data.settings); setMessage("Settlement bank account saved securely.");
  }
  return <section className="payment-settings-panel">
    <header><div><p className="eyebrow">Getting paid</p><h2>NeuroCity settlements</h2><ul className="info-list"><li>Customers pay the complete bag total to NeuroCity through PayToday.</li><li>Your share is recorded per order and becomes due on a T+2 business-day basis.</li></ul></div><span>PayToday · T+2</span></header>
    <div className="transaction-analytics"><article><span>Awaiting settlement</span><strong>N${Number(settlementSummary.awaitingSettlement).toFixed(2)}</strong></article><article><span>Settled to date</span><strong>N${Number(settlementSummary.settled).toFixed(2)}</strong></article></div>
    <div className="payment-fields">
      <label>Bank<select value={settings.bankName} onChange={(event) => setSettings({ ...settings, bankName: event.target.value })}><option value="">Choose bank</option><option>FNB Namibia</option><option>Nedbank Namibia</option><option>Bank Windhoek</option><option>Standard Bank Namibia</option><option>Letshego Bank Namibia</option><option>Other</option></select></label>
      <label>Account holder<input value={settings.accountHolder} onChange={(event) => setSettings({ ...settings, accountHolder: event.target.value })} /></label>
      <label>Account type<input placeholder="e.g. Business cheque" value={settings.accountType} onChange={(event) => setSettings({ ...settings, accountType: event.target.value })} /></label>
      <label>Account number<input inputMode="numeric" value={settings.accountNumber} onChange={(event) => setSettings({ ...settings, accountNumber: event.target.value })} /></label>
      <label>Branch code<input inputMode="numeric" value={settings.branchCode} onChange={(event) => setSettings({ ...settings, branchCode: event.target.value })} /></label>
    </div>
    <footer><button onClick={save}>Save settlement account</button></footer>
    <div className="account-list"><h3>Settlement history</h3>{settlements.slice(0, 10).map((item) => <article className="account-order" key={item.id}><div><span>NC-{String(item.orderId).padStart(6, "0")}</span><strong>N${Number(item.netAmount).toFixed(2)}</strong></div><div><span className="order-status">{item.status.replaceAll("_", " ")}</span><small>{item.settledAt ? `Paid ${new Date(item.settledAt).toLocaleDateString("en-NA")}` : item.dueAt ? `Due ${new Date(item.dueAt).toLocaleDateString("en-NA")}` : "Waiting for customer payment"}</small>{item.reference && <small>Bank ref: {item.reference}</small>}</div></article>)}{!settlements.length && <p>No paid-order settlements yet.</p>}</div>
  </section>;
}
