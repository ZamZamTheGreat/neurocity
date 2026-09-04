"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { merchantCategories } from "../../lib/merchant-categories";

const fields = {
  legalName: "",
  tradingName: "",
  registrationNumber: "",
  businessType: "",
  category: "",
  offeringType: "",
  locationType: "physical_store",
  mainOperatingArea: "",
  description: "",
  representativeName: "",
  representativeRole: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  physicalAddress: "",
  website: "",
  socialProfiles: "",
  pickupAvailable: false,
  deliveryAvailable: false,
  deliveryDetails: "",
  termsAccepted: false,
  privacyAccepted: false,
};
const requiredDocuments = [
  { type: "business_registration", label: "Business registration document" },
  {
    type: "representative_identification",
    label: "Owner or representative identification",
  },
  { type: "proof_of_business_address", label: "Proof of business address" },
  { type: "bank_confirmation_letter", label: "Bank confirmation letter" },
];

export default function ApplyPage({ mallSlug }: { mallSlug?: string } = {}) {
  const searchParams = useSearchParams();
  const resumedReference =
    searchParams.get("reference")?.trim().toUpperCase() ?? "";
  const [form, setForm] = useState(fields);
  const [reference, setReference] = useState(resumedReference);
  const [result, setResult] = useState("");
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<{ displayName: string; email: string } | null>(null);
  const [mallName, setMallName] = useState(
    mallSlug ? "" : "NeuroCity Marketplace",
  );
  const update = (name: string, value: string | number | boolean) =>
    setForm((current) => ({ ...current, [name]: value }));

  useEffect(() => {
    if (!mallSlug) return;
    fetch(`/api/platform?mall=${encodeURIComponent(mallSlug)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data) => setMallName(data.platform?.name ?? ""))
      .catch(() => setMallName(""));
  }, [mallSlug]);

  useEffect(() => {
    fetch("/api/auth/access")
      .then((response) => response.json())
      .then((data) => {
        if (!data.authenticated || !data.user) return;
        setAccount({ displayName: data.user.displayName, email: data.user.email });
        setForm((current) => ({
          ...current,
          representativeName: current.representativeName || data.user.displayName,
          email: data.user.email,
        }));
      })
      .catch(() => undefined);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult("");
    const response = await fetch("/api/applications", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...form, mallSlug }),
    });
    const data = await response.json();
    if (response.ok) {
      setReference(data.application.reference);
      window.history.replaceState(
        null,
        "",
        `/apply?reference=${encodeURIComponent(data.application.reference)}`,
      );
    } else setResult(data.error ?? "Application could not be submitted.");
    setBusy(false);
  }

  const selectedCategory = merchantCategories.find(
    (category) => category.name === form.category,
  );
  return (
    <main className={`application-page ${mallSlug ? "mall-application-page" : ""}`}>
      <header>
        <a
          href={mallSlug ? `/malls/${mallSlug}` : "/marketplace"}
          className="brand"
        >
          <span>Neuro</span>
          <strong>City</strong>
        </a>
        <nav className="platform-nav" aria-label="Primary navigation">
          <a href="/">Network</a>
          <a href="/marketplace">Marketplace</a>
          <a href="/malls">Digital malls</a>
        </nav>
        <div className="platform-header-actions">
          <a href="/application-status">Track application</a>
          <a className="platform-account-action" href="/access">Account</a>
        </div>
      </header>
      <section className="application-intro">
        <p className="eyebrow">Join {mallName || "this digital mall"}</p>
        <h1>Apply as a merchant or service provider</h1>
        <ul className="info-list">
          <li>Apply to operate a digital storefront in {mallName || "this mall"}.</li>
          <li>Tell us who you are and how your business operates.</li>
          <li>Complete catalogue and storefront setup after approval.</li>
        </ul>
        <div>
          <span>1 · Business</span>
          <span>2 · Operations</span>
          <span>3 · Documents</span>
          <span>4 · Review</span>
        </div>
      </section>
      {reference ? (
        <ApplicationDocuments reference={reference} />
      ) : (
        <form className="application-form" onSubmit={submit}>
          <h2>Business identity</h2>
          <div className="document-list wide">
            <strong>Applying to {mallName || "digital mall"}</strong>
            <ul className="info-list">
              <li>Your application will be reviewed for participation in {mallSlug ? "this mall" : "the national marketplace"}.</li>
              <li>An approved business will be linked to its storefront network.</li>
            </ul>
          </div>
          <Field
            label="Registered business name"
            value={form.legalName}
            onChange={(v) => update("legalName", v)}
          />
          <Field
            label="Trading name"
            value={form.tradingName}
            onChange={(v) => update("tradingName", v)}
          />
          <Field
            label="Registration number"
            value={form.registrationNumber}
            onChange={(v) => update("registrationNumber", v)}
          />
          <label>
            Business type
            <select
              required
              value={form.businessType}
              onChange={(event) => update("businessType", event.target.value)}
            >
              <option value="" disabled>
                Select business type
              </option>
              <option value="Sole proprietor">Sole proprietor</option>
              <option value="Close corporation">Close corporation (CC)</option>
              <option value="Private company">Private company</option>
              <option value="Public company">Public company</option>
              <option value="Partnership">Partnership</option>
              <option value="Non-profit organisation">
                Non-profit organisation
              </option>
              <option value="Other registered entity">
                Other registered entity
              </option>
            </select>
          </label>
          <label className="category-field">
            Main category
            <select
              required
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
            >
              <option value="" disabled>
                Select the best match
              </option>
              {merchantCategories.map((category) => (
                <option key={category.name} value={category.name}>
                  {category.icon} {category.name}
                </option>
              ))}
            </select>
            {selectedCategory && <small>{selectedCategory.includes}</small>}
          </label>
          <label>
            What will you offer?
            <select
              required
              value={form.offeringType}
              onChange={(event) => update("offeringType", event.target.value)}
            >
              <option value="" disabled>
                Select offering type
              </option>
              <option value="products">Products</option>
              <option value="services">Services</option>
              <option value="both">Products and services</option>
            </select>
            <small>
              This prepares the correct catalogue tools after approval.
            </small>
          </label>
          <Field
            label="Short business description"
            value={form.description}
            onChange={(v) => update("description", v)}
            wide
            helper="Briefly explain what the business does. Product and service listings will be added later."
          />
          <h2>Authorised representative</h2>
          {account && (
            <div className="document-list wide">
              <strong>Using your NeuroCity account</strong>
              <span>{account.displayName} · {account.email}</span>
              <small>Your approved storefront will be added to this account alongside your customer account.</small>
            </div>
          )}
          <Field
            label="Full name"
            value={form.representativeName}
            onChange={(v) => update("representativeName", v)}
          />
          <Field
            label="Role or relationship to the business"
            value={form.representativeRole}
            onChange={(v) => update("representativeRole", v)}
          />
          <Field
            label="Business email"
            type="email"
            value={form.email}
            onChange={(v) => update("email", v)}
            disabled={Boolean(account)}
            helper={account ? "This verified account email will own the merchant workspace." : undefined}
          />
          <Field
            label="Business phone or WhatsApp number"
            type="tel"
            value={form.phone}
            onChange={(v) => update("phone", v)}
          />
          <Field
            label="Website (optional)"
            value={form.website}
            onChange={(v) => update("website", v)}
            required={false}
            placeholder="https://yourbusiness.com"
          />
          <Field
            label="Social media and messaging profiles (optional)"
            value={form.socialProfiles}
            onChange={(v) => update("socialProfiles", v)}
            required={false}
            wide
            placeholder={
              "Instagram: https://instagram.com/yourbusiness\nFacebook: https://facebook.com/yourbusiness\nWhatsApp: +264 81 000 0000"
            }
            helper="Add only the profiles customers should use. Enter one profile or contact per line; Instagram, Facebook, TikTok, LinkedIn and WhatsApp are supported."
          />
          <h2>Secure application access</h2>
          {account ? (
            <div className="document-list wide">
              <strong>You are already signed in</strong>
              <span>No new password is needed. Continue with your existing NeuroCity account.</span>
            </div>
          ) : <><label>
            Create password
            <input
              required
              type="password"
              minLength={10}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
            />
            <small>
              At least 10 characters. You will use this email and password to
              upload documents and track the application.
            </small>
          </label>
          <label>
            Confirm password
            <input
              required
              type="password"
              minLength={10}
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={(event) =>
                update("confirmPassword", event.target.value)
              }
            />
          </label></>}
          <h2>Location and operations</h2>
          <Field
            label="Registered business address"
            value={form.physicalAddress}
            onChange={(v) => update("physicalAddress", v)}
            wide
            helper="This should match the proof of business address uploaded in the next step."
          />
          <label>
            How customers access this business
            <select
              required
              value={form.locationType}
              onChange={(event) => update("locationType", event.target.value)}
            >
              <option value="physical_store">Physical store or premises</option>
              <option value="service_area">
                Mobile or service-area business
              </option>
              <option value="both">Physical premises and service area</option>
              <option value="remote">Online or remote business</option>
            </select>
            <small>
              This controls how your location will be presented to customers.
            </small>
          </label>
          <Field
            label="Main town, suburb or area of operation"
            value={form.mainOperatingArea}
            onChange={(v) => update("mainOperatingArea", v)}
            placeholder="e.g. Pioneerspark, Windhoek or Windhoek and surrounding areas"
            wide
          />
          <div className="document-list wide">
            <strong>Detailed setup happens after approval</strong>
            <ul className="info-list">
              <li>Add branches and opening hours.</li>
              <li>Manage catalogue items, prices and images.</li>
              <li>Set fulfilment rules and customer policies.</li>
            </ul>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={form.pickupAvailable}
              onChange={(e) => update("pickupAvailable", e.target.checked)}
            />
            Customers can collect from my premises
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={form.deliveryAvailable}
              onChange={(e) => update("deliveryAvailable", e.target.checked)}
            />
            We deliver products or travel to customers
          </label>
          {form.deliveryAvailable && (
            <Field
              label="Current delivery or service coverage (optional)"
              value={form.deliveryDetails}
              onChange={(v) => update("deliveryDetails", v)}
              required={false}
              wide
              placeholder="e.g. Windhoek and surrounding areas"
              helper="You can configure detailed zones, fees and timing after approval."
            />
          )}
          <h2>Documents you will upload next</h2>
          <div className="document-list">
            {requiredDocuments.map((document) => (
              <span key={document.type}>{document.label}</span>
            ))}
            <ul className="info-list">
              <li>Submit these details before uploading the required files.</li>
              <li>Use PDF, JPG or PNG files up to 10 MB each.</li>
            </ul>
          </div>
          <label className="check wide">
            <input
              type="checkbox"
              checked={form.termsAccepted}
              onChange={(e) => update("termsAccepted", e.target.checked)}
            />
            I confirm that the information is accurate and accept the <a href="/terms" target="_blank">NeuroCity Terms &amp; Conditions</a>, including the merchant provisions.
          </label>
          <label className="check wide">
            <input
              type="checkbox"
              checked={form.privacyAccepted}
              onChange={(e) => update("privacyAccepted", e.target.checked)}
            />
            I have read the <a href="/privacy" target="_blank">NeuroCity privacy notice</a> and consent to processing this information and the uploaded documents for application review.
          </label>
          {result && <p className="form-error">{result}</p>}
          <button className="submit-application" disabled={busy}>
            {busy
              ? "Creating secure application…"
              : "Continue to secure document uploads"}
          </button>
        </form>
      )}
    </main>
  );
}

function ApplicationDocuments({ reference }: { reference: string }) {
  const [states, setStates] = useState<Record<string, string>>({});
  const [authRequired, setAuthRequired] = useState(false);
  const completed = useMemo(
    () =>
      requiredDocuments.filter(
        (item) => states[item.type] === "Uploaded securely ✓",
      ).length,
    [states],
  );
  async function upload(type: string, file?: File) {
    if (!file) return;
    setStates((state) => ({ ...state, [type]: "Preparing secure upload…" }));
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
    if (response.status === 401) setAuthRequired(true);
    if (!response.ok)
      return setStates((state) => ({
        ...state,
        [type]: data.error ?? "Upload could not be started.",
      }));
    const put = await fetch(data.uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!put.ok)
      return setStates((state) => ({
        ...state,
        [type]: "Storage upload failed. Please try again.",
      }));
    const confirmation = await fetch("/api/applications/documents/complete", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ reference, documentType: type }),
    });
    const confirmed = await confirmation.json();
    setStates((state) => ({
      ...state,
      [type]: confirmation.ok
        ? "Uploaded securely ✓"
        : (confirmed.error ?? "Upload could not be verified."),
    }));
  }
  const returnTo = `/apply?reference=${encodeURIComponent(reference)}`;
  return (
    <section className="document-upload-page integrated-documents">
      <p className="eyebrow">Application created</p>
      <h2>Upload your required documents</h2>
      <p className="application-reference">
        Reference <strong>{reference}</strong>
      </p>
      <ul className="info-list">
        <li>Your account is active and you are signed in.</li>
        <li>Upload all four documents to complete the application.</li>
      </ul>
      {authRequired && (
        <div className="upload-auth-notice">
          <strong>Your session has ended</strong>
          <span>
            Sign in again using the application email and password you created.
          </span>
          <a href={`/login?return_to=${encodeURIComponent(returnTo)}`}>
            Sign in to continue
          </a>
        </div>
      )}
      {requiredDocuments.map((item) => (
        <article key={item.type}>
          <div>
            <h3>{item.label}</h3>
            <p>{states[item.type] ?? "Required before final approval"}</p>
          </div>
          <label className="file-button">
            Choose file
            <input
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              onChange={(event) => upload(item.type, event.target.files?.[0])}
            />
          </label>
        </article>
      ))}
      <div className="upload-progress">
        <strong>{completed} of 4 documents uploaded</strong>
        {completed === 4 ? (
          <>
            <span>Your application is complete and ready for review.</span>
            <a href="/application-status">Track application status →</a>
          </>
        ) : (
          <span>You can safely return later using this reference.</span>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  helper,
  wide = false,
  required = true,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  helper?: string;
  wide?: boolean;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className={wide ? "wide" : ""}>
      {label}
      {wide ? (
        <textarea
          required={required}
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          required={required}
          disabled={disabled}
          type={type}
          min={type === "number" ? 1 : undefined}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {helper && <small>{helper}</small>}
    </label>
  );
}
