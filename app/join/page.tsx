import Link from "next/link";

export default function JoinPage() {
  return (
    <main className="join-neurocity" id="main-content">
      <header><Link href="/" className="network-brand"><img src="/branding/neurocity-malls-mark.png" alt="" /><span><b className="network-wordmark">Neuro<span>City</span></b><small>Namibia&apos;s connected shopping network</small></span></Link><Link href="/access">Already registered? Sign in</Link></header>
      <section className="join-intro"><p className="eyebrow">Join NeuroCity</p><h1>What would you like to create?</h1><p>Start with one secure identity. A merchant can use the same login for business and personal shopping.</p></section>
      <section className="join-options" aria-label="Account creation options">
        <Link href="/login?mode=register&account_type=customer&return_to=%2Faccount%3Fwelcome%3D1"><span className="join-option-icon">◎</span><small>For shoppers</small><h2>Create a customer account</h2><p>Save products and stores, manage your bag, place orders, book services and personalise Selma.</p><ul><li>Free customer account</li><li>Created immediately</li><li>Automatic sign-in</li></ul><strong>Create customer account <b>→</b></strong></Link>
        <Link href="/apply"><span className="join-option-icon">▦</span><small>For businesses</small><h2>Apply for a merchant account</h2><p>Submit your business details, create login credentials and upload the documents needed for approval.</p><ul><li>Products or services</li><li>Application tracking</li><li>Dashboard after approval</li></ul><strong>Start merchant application <b>→</b></strong></Link>
      </section>
      <footer><Link href="/access">← Return to Account Centre</Link><span>Mall-manager and administrator access is assigned by NeuroCity.</span></footer>
    </main>
  );
}
