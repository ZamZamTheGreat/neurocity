import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_CONTACT_EMAIL } from "../../lib/privacy";
import { siteUrl } from "../../lib/site-url";

const deletionPath = "/account?tab=Privacy";
const signInPath = `/login?return_to=${encodeURIComponent(deletionPath)}`;

export const metadata: Metadata = {
  title: "Delete your NeuroCity account",
  description: "Request deletion of your NeuroCity account and associated personal information.",
  alternates: { canonical: `${siteUrl()}/account-deletion` },
};

export default function AccountDeletionPage() {
  return (
    <main id="main-content" className="deletion-page">
      <nav>
        <Link href="/" className="network-brand">
          <span className="deletion-mark" aria-hidden="true">NC</span>
          <span><b className="network-wordmark">Neuro<span>City</span></b><small>Account and data controls</small></span>
        </Link>
        <Link href="/privacy">Privacy notice</Link>
      </nav>

      <section className="deletion-hero">
        <div>
          <p className="eyebrow"><span /> YOUR ACCOUNT</p>
          <h1>Delete your NeuroCity account</h1>
          <p>You can request deletion from the web, even if you normally use NeuroCity through the Android app. Sign in to verify that the account belongs to you, then submit the request from your privacy controls.</p>
          <div className="deletion-actions">
            <Link href={signInPath}>Sign in and request deletion <span>→</span></Link>
            <a href={`mailto:${PRIVACY_CONTACT_EMAIL}?subject=NeuroCity%20account%20deletion`}>Contact privacy support</a>
          </div>
        </div>
        <aside aria-label="Deletion steps">
          <p>HOW IT WORKS</p>
          <ol>
            <li><b>1</b><span><strong>Verify your account</strong><small>Sign in using your NeuroCity email and password or Google account.</small></span></li>
            <li><b>2</b><span><strong>Open Privacy</strong><small>You will be taken directly to the account privacy controls.</small></span></li>
            <li><b>3</b><span><strong>Submit the request</strong><small>Select “Request account deletion” and confirm your choice.</small></span></li>
          </ol>
        </aside>
      </section>

      <section className="deletion-details">
        <article><span>01</span><h2>What is deleted</h2><p>Your account profile, saved addresses, shopping preferences, cart, wishlist, saved stores and optional Selma-AI profile are deleted or de-identified after the request is approved.</p></article>
        <article><span>02</span><h2>What may be retained</h2><p>Order, payment, refund, fraud-prevention, dispute, tax or security records may be retained only where a legal or operational obligation requires it.</p></article>
        <article><span>03</span><h2>What happens next</h2><p>NeuroCity reviews the request, completes the permitted deletion, and records the outcome. Privacy support will contact you if identity or retention details need clarification.</p></article>
      </section>

      <section className="deletion-help">
        <div><p className="eyebrow"><span /> NEED HELP?</p><h2>Cannot access your account?</h2></div>
        <p>Email <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a> from the address connected to your account. Include only the information needed to identify the account; never send your password, authenticator code or payment credentials.</p>
      </section>

      <footer><span>© {new Date().getFullYear()} NeuroCity · Namibia</span><nav><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/">Home</Link></nav></footer>
    </main>
  );
}
