"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const fields = { legalName: "", tradingName: "", registrationNumber: "", businessType: "", category: "", description: "", representativeName: "", representativeRole: "", email: "", phone: "", physicalAddress: "", website: "", socialProfiles: "", branchCount: 1, branchLocations: "", productSummary: "", estimatedProductCount: 1, pickupAvailable: false, deliveryAvailable: false, deliveryDetails: "", returnsPolicy: "", termsAccepted: false, privacyAccepted: false };
const requiredDocuments = [
  { type: "business_registration", label: "Business registration document" },
  { type: "representative_identification", label: "Owner or representative identification" },
  { type: "proof_of_business_address", label: "Proof of business address" },
  { type: "bank_confirmation_letter", label: "Bank confirmation letter" },
];

export default function ApplyPage() {
  const searchParams = useSearchParams();
  const resumedReference = searchParams.get("reference")?.trim().toUpperCase() ?? "";
  const [form, setForm] = useState(fields);
  const [reference, setReference] = useState(resumedReference);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const update = (name: string, value: string | number | boolean) => setForm((current) => ({ ...current, [name]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setResult("");
    const response = await fetch("/api/applications", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    if (response.ok) { setReference(data.application.reference); window.history.replaceState(null, "", `/apply?reference=${encodeURIComponent(data.application.reference)}`); }
    else setResult(data.error ?? "Application could not be submitted.");
    setBusy(false);
  }

  return <main className="application-page"><header><a href="/" className="brand"><span>Neuro</span><strong>City</strong></a><a href="/">Return to mall</a></header><section className="application-intro"><p className="eyebrow">Sell with NeuroCity</p><h1>Apply for a merchant storefront</h1><p>Submit your business information and required documents in one secure application.</p><div><span>1 · Business</span><span>2 · Operations</span><span>3 · Documents</span><span>4 · Review</span></div></section>{reference ? <ApplicationDocuments reference={reference} /> : <form className="application-form" onSubmit={submit}><h2>Business identity</h2><Field label="Registered business name" value={form.legalName} onChange={(v) => update("legalName", v)} /><Field label="Trading name" value={form.tradingName} onChange={(v) => update("tradingName", v)} /><Field label="Registration number" value={form.registrationNumber} onChange={(v) => update("registrationNumber", v)} /><Field label="Business type" value={form.businessType} onChange={(v) => update("businessType", v)} placeholder="CC, company, sole proprietor…" /><Field label="Category" value={form.category} onChange={(v) => update("category", v)} placeholder="Fashion, beauty, gifts…" /><Field label="Business description" value={form.description} onChange={(v) => update("description", v)} wide />
  <h2>Authorised representative</h2><Field label="Full name" value={form.representativeName} onChange={(v) => update("representativeName", v)} /><Field label="Role" value={form.representativeRole} onChange={(v) => update("representativeRole", v)} /><Field label="Email" type="email" value={form.email} onChange={(v) => update("email", v)} /><Field label="Phone" value={form.phone} onChange={(v) => update("phone", v)} /><Field label="Physical business address" value={form.physicalAddress} onChange={(v) => update("physicalAddress", v)} wide /><Field label="Website" value={form.website} onChange={(v) => update("website", v)} /><Field label="Social profiles" value={form.socialProfiles} onChange={(v) => update("socialProfiles", v)} />
  <h2>Stores and fulfilment</h2><Field label="Number of branches" type="number" value={String(form.branchCount)} onChange={(v) => update("branchCount", Number(v))} /><Field label="Branch locations" value={form.branchLocations} onChange={(v) => update("branchLocations", v)} /><Field label="Products and brands" value={form.productSummary} onChange={(v) => update("productSummary", v)} wide /><Field label="Estimated product count" type="number" value={String(form.estimatedProductCount)} onChange={(v) => update("estimatedProductCount", Number(v))} /><label className="check"><input type="checkbox" checked={form.pickupAvailable} onChange={(e) => update("pickupAvailable", e.target.checked)} />Customer pickup available</label><label className="check"><input type="checkbox" checked={form.deliveryAvailable} onChange={(e) => update("deliveryAvailable", e.target.checked)} />Merchant delivery available</label><Field label="Delivery areas, fees and timing" value={form.deliveryDetails} onChange={(v) => update("deliveryDetails", v)} wide /><Field label="Returns and exchange policy" value={form.returnsPolicy} onChange={(v) => update("returnsPolicy", v)} wide />
  <h2>Documents you will upload next</h2><div className="document-list">{requiredDocuments.map((document) => <span key={document.type}>{document.label}</span>)}<p>After submitting these details, you will upload each file here. PDF, JPG and PNG files up to 10 MB are accepted.</p></div><label className="check wide"><input type="checkbox" checked={form.termsAccepted} onChange={(e) => update("termsAccepted", e.target.checked)} />I confirm that the information is accurate and accept the NeuroCity merchant terms.</label><label className="check wide"><input type="checkbox" checked={form.privacyAccepted} onChange={(e) => update("privacyAccepted", e.target.checked)} />I consent to NeuroCity processing this information and the uploaded documents for application review.</label>{result && <p className="form-error">{result}</p>}<button className="submit-application" disabled={busy}>{busy ? "Creating secure application…" : "Continue to secure document uploads"}</button></form>}</main>;
}

function ApplicationDocuments({ reference }: { reference: string }) {
  const [states, setStates] = useState<Record<string, string>>({});
  const [authRequired, setAuthRequired] = useState(false);
  const completed = useMemo(() => requiredDocuments.filter((item) => states[item.type] === "Uploaded securely ✓").length, [states]);
  async function upload(type: string, file?: File) {
    if (!file) return;
    setStates((state) => ({ ...state, [type]: "Preparing secure upload…" }));
    const response = await fetch("/api/applications/documents/upload-url", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference, documentType: type, filename: file.name, mimeType: file.type, sizeBytes: file.size }) });
    const data = await response.json();
    if (response.status === 401) setAuthRequired(true);
    if (!response.ok) return setStates((state) => ({ ...state, [type]: data.error ?? "Upload could not be started." }));
    const put = await fetch(data.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
    if (!put.ok) return setStates((state) => ({ ...state, [type]: "Storage upload failed. Please try again." }));
    const confirmation = await fetch("/api/applications/documents/complete", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reference, documentType: type }) });
    const confirmed = await confirmation.json();
    setStates((state) => ({ ...state, [type]: confirmation.ok ? "Uploaded securely ✓" : confirmed.error ?? "Upload could not be verified." }));
  }
  const returnTo = `/apply?reference=${encodeURIComponent(reference)}`;
  return <section className="document-upload-page integrated-documents"><p className="eyebrow">Application created</p><h2>Upload your required documents</h2><p className="application-reference">Reference <strong>{reference}</strong></p><p>Your business details are saved. Sign in or create an account using the same email address entered in the application, then upload all four files.</p>{authRequired && <div className="upload-auth-notice"><strong>Secure sign-in required</strong><span>Your account email must match the application email.</span><a href={`/login?return_to=${encodeURIComponent(returnTo)}`}>Sign in or create an account</a></div>}{requiredDocuments.map((item) => <article key={item.type}><div><h3>{item.label}</h3><p>{states[item.type] ?? "Required before final approval"}</p></div><label className="file-button">Choose file<input type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => upload(item.type, event.target.files?.[0])} /></label></article>)}<div className="upload-progress"><strong>{completed} of 4 documents uploaded</strong>{completed === 4 ? <><span>Your application is complete and ready for review.</span><a href="/application-status">Track application status →</a></> : <span>You can safely return later using this reference.</span>}</div></section>;
}

function Field({ label, value, onChange, type = "text", placeholder, wide = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; wide?: boolean }) { return <label className={wide ? "wide" : ""}>{label}{wide ? <textarea required value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /> : <input required type={type} min={type === "number" ? 1 : undefined} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />}</label>; }
