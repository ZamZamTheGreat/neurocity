"use client";
import { FormEvent, useState } from "react";
type Status = {
  reference: string;
  tradingName: string;
  status: string;
  submittedAt: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
};
export default function StatusPage() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Status | null>(null);
  const [message, setMessage] = useState("");
  async function lookup(event: FormEvent) {
    event.preventDefault();
    const response = await fetch(
      `/api/applications?reference=${encodeURIComponent(reference)}&email=${encodeURIComponent(email)}`,
    );
    const data = await response.json();
    if (!response.ok) {
      setResult(null);
      return setMessage(data.error);
    }
    setResult(data.application);
    setMessage("");
  }
  return (
    <main className="admin-auth application-status-page">
      <header className="platform-public-header">
        <a href="/" className="brand"><span>Neuro</span><strong>City</strong></a>
        <nav className="platform-nav" aria-label="Primary navigation">
          <a href="/">Network</a><a href="/marketplace">Marketplace</a><a href="/malls">Digital malls</a>
        </nav>
        <div className="platform-header-actions"><a href="/apply">Apply</a><a className="platform-account-action" href="/login">Account</a></div>
      </header>
      <form onSubmit={lookup}>
        <p className="eyebrow">Merchant applications</p>
        <h1>Track your application</h1>
        <label>
          Application reference
          <input
            required
            placeholder="NCA-2026-…"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
          />
        </label>
        <label>
          Application email
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button>Check status</button>
        {message && <p className="form-error">{message}</p>}
        {result && (
          <section className="status-result">
            <small>{result.reference}</small>
            <h2>{result.tradingName}</h2>
            <strong>{result.status.replaceAll("_", " ")}</strong>
            {result.reviewNotes && <p>{result.reviewNotes}</p>}
            {result.status === "approved" && (
              <a href="/login">Create merchant account →</a>
            )}
          </section>
        )}
        <a href="/apply">Submit a new application</a>
      </form>
    </main>
  );
}
