import { ManagedImage } from "../components/ManagedImage";

export default function ShopChooserPage() {
  return <main id="main-content" className="shop-chooser-page">
    <header className="shop-chooser-header"><a href="/" className="network-brand"><ManagedImage src="/branding/neurocity-malls-mark.png" alt="" width={180} height={180} /><span><b className="network-wordmark">Neuro<span>City</span></b><small>Namibia&apos;s connected shopping network</small></span></a><a href="/access">Account</a></header>
    <section className="shop-chooser-intro"><p className="eyebrow">CHOOSE HOW TO SHOP</p><h1>Where would you like to start?</h1><p>Explore every participating store together, or enter the online version of a mall you know.</p></section>
    <section className="shop-choice-grid" aria-label="Shopping destinations">
      <a href="/marketplace"><span className="shop-choice-number">01</span><div><small>ALL STORES AND PRODUCTS</small><h2>Marketplace</h2><p>Search across NeuroCity&apos;s complete network of approved stores, products and services.</p><b>Open marketplace →</b></div><i aria-hidden="true">▦</i></a>
      <a href="/malls"><span className="shop-choice-number">02</span><div><small>SHOP BY LOCATION</small><h2>Digital malls</h2><p>Choose a participating physical mall and browse its stores through one online destination.</p><b>Choose a mall →</b></div><i aria-hidden="true">◇</i></a>
    </section>
    <p className="shop-chain-route">Looking for a franchise with multiple locations? <a href="/chains">Browse chain stores →</a></p>
  </main>;
}
