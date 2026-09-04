import Link from "next/link";
import { PRIVACY_CONTACT_EMAIL, PRIVACY_NOTICE_VERSION } from "../../lib/privacy";

export const metadata = { title: "Privacy notice | NeuroCity", description: "How NeuroCity collects, uses and protects personal information." };

export default function PrivacyPage() {
  return <main className="legal-page">
    <nav><Link href="/" className="brand"><span>Neuro</span><strong>City</strong></Link><span><Link href="/terms">Terms</Link> · <Link href="/account">Privacy controls</Link></span></nav>
    <article>
      <p className="eyebrow">Privacy at NeuroCity</p>
      <h1>Your information should work for you—not travel farther than it needs to.</h1>
      <p className="legal-updated">Notice version {PRIVACY_NOTICE_VERSION} · Last updated 4 September 2026</p>
      <section><h2>Who is responsible</h2><p>NeuroCity operates this Namibian shopping, services and digital-mall platform. Questions and privacy requests can be sent to <a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>{PRIVACY_CONTACT_EMAIL}</a>.</p></section>
      <section><h2>Information we collect</h2><p>Depending on how you use NeuroCity, we process account and contact details; saved stores, wishlists and addresses; orders, bookings, messages and fulfilment details; payment status and customer-uploaded proof of payment; merchant application, representative, business and verification documents; and limited technical and security records.</p><p>NeuroCity does not store your raw password. Passwords are one-way hashed. Card or wallet credentials entered on a payment provider's hosted service are handled by that provider, not stored by NeuroCity.</p></section>
      <section><h2>Why we use it</h2><ul><li>To create accounts, operate carts, orders, bookings and merchant services.</li><li>To verify merchants, prevent fraud and protect the platform.</li><li>To send service messages such as application, order and booking updates.</li><li>To meet accounting, tax, dispute and other applicable legal obligations.</li><li>To personalise Selma only where a signed-in customer enables persistent memory. Public guest chat remains in that browser session.</li></ul></section>
      <section><h2>Who receives it</h2><p>We disclose only what is needed to the relevant merchant for an order, booking or enquiry. We also use vetted infrastructure, private file storage, email and payment service providers to run NeuroCity. When you choose Selma&apos;s visual search, your selected image is sent to OpenAI to identify the item and produce catalogue search terms. NeuroCity does not save that image to your account or chat history. Avoid uploading images containing people, identity documents or other sensitive information. We do not sell personal information. Providers may process information outside Namibia; we limit access by role and contractual/service controls.</p></section>
      <section><h2>Retention</h2><p>We keep active account information while the account is used. Cart and preference information remains until cleared or the account is deleted. Merchant verification files, orders, transaction records and disputes may be retained for the period needed for review, fraud prevention, accounting, tax or another applicable obligation. When information is no longer required, it is deleted or de-identified.</p></section>
      <section><h2>Your choices and rights</h2><p>You may ask to access, correct, export or delete your personal information, object to certain uses, or withdraw optional consent. Some records cannot be deleted immediately where they are needed for a transaction, legal obligation, fraud prevention or a dispute. Signed-in customers can download an account copy or submit a deletion request from Account → Privacy.</p></section>
      <section><h2>Security</h2><p>NeuroCity uses encrypted HTTPS transport, private object storage with short-lived document links, hashed passwords and session tokens, role-based access, restricted file types and sizes, and browser security controls. No online system can promise absolute security; please use a unique password and report suspicious activity promptly.</p></section>
      <section><h2>Children and changes</h2><p>Customer accounts are intended for people able to enter a valid transaction, or those using the service with a parent or guardian. We will update this page and its version date when the notice materially changes.</p></section>
      <div className="legal-actions"><Link href="/account">Open account privacy controls</Link><a href={`mailto:${PRIVACY_CONTACT_EMAIL}`}>Contact privacy support</a></div>
    </article>
  </main>;
}
