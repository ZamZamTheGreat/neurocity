"use client";
import { useState } from "react";
const required = [
  { type: "business_registration", label: "Business registration document" },
  {
    type: "representative_identification",
    label: "Representative identification",
  },
  { type: "proof_of_business_address", label: "Proof of business address" },
  { type: "bank_confirmation_letter", label: "Bank confirmation letter" },
];
export default function DocumentsPage() {
  const [reference, setReference] = useState("");
  const [states, setStates] = useState<Record<string, string>>({});
  async function upload(type: string, file?: File) {
    if (!file || !reference.trim())
      return setStates((s) => ({
        ...s,
        [type]: "Enter your application reference and choose a file.",
      }));
    setStates((s) => ({ ...s, [type]: "Preparing secure upload…" }));
    const response = await fetch("/api/applications/documents/upload-url", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        reference,
        documentType: type,
        filename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });
    const data = await response.json();
    if (!response.ok) return setStates((s) => ({ ...s, [type]: data.error }));
    const put = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!put.ok)
      return setStates((s) => ({
        ...s,
        [type]: "Storage upload failed. Check R2 CORS configuration.",
      }));
    const complete = await fetch("/api/applications/documents/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference, documentType: type }),
    });
    const completed = await complete.json();
    setStates((s) => ({
      ...s,
      [type]: complete.ok ? "Uploaded securely ✓" : completed.error,
    }));
  }
  return (
    <main className="application-page">
      <header>
        <a href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <nav className="platform-nav" aria-label="Primary navigation">
          <a href="/">Network</a>
          <a href="/marketplace">Marketplace</a>
          <a href="/malls">Digital malls</a>
        </nav>
        <div className="platform-header-actions">
          <a href="/application-status">Application status</a>
          <a className="platform-account-action" href="/login">Account</a>
        </div>
      </header>
      <section className="application-intro">
        <p className="eyebrow">Private document submission</p>
        <h1>Complete your merchant application</h1>
        <ul className="info-list">
          <li>Files upload directly to NeuroCity’s private storage.</li>
          <li>Documents are available only to authorised reviewers.</li>
        </ul>
      </section>
      <section className="document-upload-page">
        <label>
          Application reference
          <input
            placeholder="NCA-2026-…"
            value={reference}
            onChange={(e) => setReference(e.target.value.toUpperCase())}
          />
        </label>
        <ul className="info-list">
          <li>Sign in with the email address used on the application.</li>
          <li>Upload PDF, JPG or PNG files only.</li>
          <li>Each file can be up to 10 MB.</li>
        </ul>
        {required.map((item) => (
          <article key={item.type}>
            <div>
              <h2>{item.label}</h2>
              <p>{states[item.type] ?? "Required before final approval"}</p>
            </div>
            <label className="file-button">
              Choose file
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(e) => upload(item.type, e.target.files?.[0])}
              />
            </label>
          </article>
        ))}
        <a className="login-link" href="/login">
          Sign in or create an application account →
        </a>
      </section>
    </main>
  );
}
