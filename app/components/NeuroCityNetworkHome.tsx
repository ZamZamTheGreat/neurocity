"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { openConcierge } from "../../lib/concierge-events";
import { ManagedImage } from "./ManagedImage";

type Mall = {
  id: number;
  name: string;
  slug: string;
  city: string | null;
  country: string;
  tagline: string | null;
  logoUrl: string | null;
  markUrl: string | null;
  theme: { primary?: string; surface?: string };
  storeCount: number;
  domain: string | null;
};
type FeaturedProduct = { id: number; name: string; imageUrl: string | null; price: number | null; salePrice: number | null; badge: string | null };
type FeaturedMerchant = { name: string; slug: string; pickupLocation: string | null };

export default function NeuroCityNetworkHome({
  directoryOnly = false,
}: {
  directoryOnly?: boolean;
}) {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [featured, setFeatured] = useState<{ merchant: FeaturedMerchant; products: FeaturedProduct[] } | null>(null);
  const askSelma = (text = "") => openConcierge({ initialPrompt: text });
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": "https://neurocity.city/#organization",
        name: "NeuroCity",
        url: "https://neurocity.city/",
        logo: "https://neurocity.city/branding/neurocity-logo.png",
        description: "A connected marketplace for discovering and shopping from Namibian businesses.",
        areaServed: { "@type": "Country", name: "Namibia" },
      },
      {
        "@type": "WebSite",
        "@id": "https://neurocity.city/#website",
        url: "https://neurocity.city/",
        name: "NeuroCity",
        publisher: { "@id": "https://neurocity.city/#organization" },
        inLanguage: "en-NA",
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is NeuroCity?",
            acceptedAnswer: { "@type": "Answer", text: "NeuroCity is a Namibian online marketplace that connects shoppers with approved local stores, products, services and participating malls." },
          },
          {
            "@type": "Question",
            name: "Can I shop from different Namibian stores in one place?",
            acceptedAnswer: { "@type": "Answer", text: "Yes. NeuroCity lets shoppers browse participating stores through the main marketplace or enter the online space for a participating mall." },
          },
          {
            "@type": "Question",
            name: "How can a Namibian business join NeuroCity?",
            acceptedAnswer: { "@type": "Answer", text: "A local business can submit a merchant application through NeuroCity. Approved merchants receive a storefront and tools for managing products, inventory and orders." },
          },
        ],
      },
    ],
  };
  useEffect(() => {
    fetch("/api/malls")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setMalls(data.malls ?? []);
      })
      .catch(() => setMalls([]))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (directoryOnly) return;
    fetch("/api/catalogue").then(async (response) => { const data = await response.json(); if (response.ok) setFeatured({ merchant: data.merchant, products: (data.products ?? []).slice(0, 4) }); }).catch(() => undefined);
  }, [directoryOnly]);
  return (
    <main id="main-content" className="network-home digital-malls-home">
      {!directoryOnly && <link rel="canonical" href="https://neurocity.city/" />}
      {!directoryOnly && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replaceAll("<", "\\u003c") }} />}
      <header className="network-header">
        <a href="/" className="network-brand">
          <ManagedImage src="/branding/neurocity-malls-mark.png" alt="" width={180} height={180} />
          <span>
            <b className="network-wordmark">Neuro<span>City</span></b>
            <small>Namibia&apos;s connected shopping network</small>
          </span>
        </a>
        <nav>
          <a className={!directoryOnly ? "active" : ""} href="/">
            Home
          </a>
          <a href="/marketplace">Marketplace</a>
          <a className={directoryOnly ? "active" : ""} href="/malls">
            Shop by mall
          </a>
          <a href="/marketplace#stores">Stores</a>
        </nav>
        <div>
          <button onClick={() => askSelma()}>✦ Ask Selma</button>
          <a href="/access">Account</a>
        </div>
      </header>
      {!directoryOnly && (
        <>
          <section className="network-hero">
            <div>
              <p className="eyebrow">
                <span /> SHOP LOCAL · ACROSS NAMIBIA
              </p>
              <h1>
                Shop local Namibian businesses <em>in one place.</em>
              </h1>
              <p className="network-lede">Browse real products and services, compare local options and buy from approved merchants through one account.</p>
              <div>
                <a className="primary" href="/marketplace">
                  Browse products and stores <span>→</span>
                </a>
                <button className="network-selma-link" onClick={() => askSelma()}>Ask Selma</button>
              </div>
              <ul>
                <li>Approved local stores</li>
                <li>Live catalogue information</li>
                <li>Pickup and delivery choices</li>
              </ul>
            </div>
            <aside>
              <div className="network-shopping-card">
                <p>ASK SELMA</p>
                <h2>What can we help you find?</h2>
                {["A birthday gift under N$500", "Black formal shoes in size 9", "Something I can collect today"].map((prompt) => (
                  <button key={prompt} onClick={() => askSelma(prompt)}>
                    <span>{prompt}</span><b>→</b>
                  </button>
                ))}
                <small>Results come from participating merchants&apos; live catalogues.</small>
              </div>
            </aside>
          </section>
          <section className="network-language-guide" aria-labelledby="network-guide-title">
            <header>
              <p className="eyebrow"><span /> ONE CONNECTED NETWORK</p>
              <h2 id="network-guide-title">One account. Three ways to find what you need.</h2>
              <p>NeuroCity connects every shopping route, so your account and experience travel with you.</p>
            </header>
            <div>
              <article><small>01</small><b>Browse everything</b><span>Search products, services and stores across the complete NeuroCity marketplace.</span><a href="/marketplace">Open Marketplace →</a></article>
              <article><small>02</small><b>Shop by place</b><span>Enter the online version of a participating physical mall and browse its tenants.</span><a href="/malls">Choose a mall →</a></article>
              <article><small>03</small><b>Ask Selma</b><span>Describe your budget, size, colour or occasion and get relevant local options.</span><button onClick={() => askSelma()}>Start a search →</button></article>
            </div>
          </section>
          {featured?.products.length ? <section className="network-featured-products">
            <header><div><p className="eyebrow"><span /> AVAILABLE NOW</p><h2>Start with what&apos;s in the marketplace.</h2></div><a href="/marketplace">Browse everything →</a></header>
            <div>{featured.products.map((product) => <article key={product.id}><a href={`/stores/${featured.merchant.slug}`}><div><ManagedImage src={product.imageUrl ?? "/branding/neurocity-malls-mark.png"} alt={product.name} />{product.badge && <span>{product.badge}</span>}</div><small>{featured.merchant.name}</small><h3>{product.name}</h3><p>{product.salePrice != null ? `N$${product.salePrice.toFixed(2)}` : product.price != null ? `N$${product.price.toFixed(2)}` : "Price confirmed by store"}</p><b>View in store →</b></a></article>)}</div>
            {featured.merchant.pickupLocation && <p className="featured-pickup">Collection available from {featured.merchant.pickupLocation}.</p>}
          </section> : null}
          <section className="network-paths">
            <article>
              <span>01</span>
              <div>
                <small>START SHOPPING</small>
                <h2>Browse the marketplace</h2>
                <ul className="info-list"><li>Search products, services and approved local storefronts.</li></ul>
                <a href="/marketplace">Enter marketplace →</a>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <small>{malls.length ? "SHOP BY PLACE" : "LOCAL STORES"}</small>
                <h2>{malls.length ? "Visit a mall online" : "Meet approved stores"}</h2>
                <ul className="info-list"><li>{malls.length ? "Browse participating shopping centres and their stores." : "Visit verified Namibian storefronts and their live catalogues."}</li></ul>
                <a href={malls.length ? "/malls" : "/marketplace#stores"}>{malls.length ? "Shop by mall" : "Browse stores"} →</a>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <small>NEED A HAND?</small>
                <h2>Ask Selma</h2>
                <ul className="info-list"><li>Describe your budget, size, colour, location or occasion.</li></ul>
                <button onClick={() => askSelma()}>
                  Start a conversation →
                </button>
              </div>
            </article>
          </section>
          <section className="network-local-commerce" aria-labelledby="local-commerce-title">
            <div>
              <p className="eyebrow"><span /> BUILT FOR NAMIBIAN SHOPPING</p>
              <h2 id="local-commerce-title">Find local products without searching store by store.</h2>
            </div>
            <div className="network-local-copy">
              <p>NeuroCity brings participating Namibian businesses into one searchable marketplace. Browse fashion, gifts, services and everyday essentials, then check each store&apos;s available collection and delivery options.</p>
              <p>Shopping for something specific? Tell Selma the item, size, colour, budget or location you have in mind. Results are drawn from live merchant catalogues so you can compare relevant local options.</p>
              <div><a href="/marketplace">Explore the marketplace →</a><a href="/apply">List your business →</a></div>
            </div>
          </section>
        </>
      )}
      {(directoryOnly || loading || malls.length > 0) && <section
        className={`network-malls ${directoryOnly ? "directory-page" : ""}`}
      >
        <header>
          <div>
            <p className="eyebrow">
              <span /> SHOP BY MALL
            </p>
            <h2>
              {directoryOnly
                ? "Visit your favourite malls online."
                : "Your local mall, open online."}
            </h2>
          </div>
          <p>
            {directoryOnly
              ? "Choose a mall to browse its participating stores, products and services in one place."
              : "Choose a mall below to shop its participating stores. You can still use the main marketplace to browse everything across NeuroCity."}
          </p>
        </header>
        <div className="mall-explainer" aria-label="How online malls work">
          <div><b>1</b><span><strong>Choose a mall</strong><small>Enter the online space for a mall you know.</small></span></div>
          <div><b>2</b><span><strong>Browse its stores</strong><small>See products and services from participating tenants.</small></span></div>
          <div><b>3</b><span><strong>Shop through NeuroCity</strong><small>Use the same account, bag and checkout across the network.</small></span></div>
        </div>
        {loading ? (
          <div className="mall-directory-empty">Loading participating malls…</div>
        ) : malls.length ? (
          <div className="network-mall-grid">
            {malls.map((mall) => (
              <article
                key={mall.id}
                style={
                  {
                    "--mall-primary": "#d4af37",
                    "--mall-surface": "#080808",
                  } as CSSProperties
                }
              >
                <div className="mall-cover">
                  <span>
                    {mall.markUrl ? (
                      <ManagedImage src={mall.markUrl} alt="" />
                    ) : (
                      mall.name
                        .split(" ")
                        .map((word) => word[0])
                        .join("")
                        .slice(0, 2)
                    )}
                  </span>
                  <small>{mall.city ?? mall.country}</small>
                </div>
                <div>
                  <span>ONLINE MALL</span>
                  <h3>{mall.name}</h3>
                  <p>{mall.tagline ?? `Discover ${mall.name} online.`}</p>
                  <ul>
                    <li>
                      {mall.storeCount}{" "}
                      {mall.storeCount === 1 ? "store" : "stores"} live
                    </li>
                    <li>
                      {mall.domain
                        ? "Official mall website"
                        : "Hosted on NeuroCity"}
                    </li>
                  </ul>
                  <a href={`/malls/${mall.slug}`}>
                    Shop this mall <b>→</b>
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mall-directory-empty">
            <b>Online mall shopping is coming soon.</b>
            <ul className="info-list centered"><li>Participating malls will appear here as their stores come online.</li></ul>
          </div>
        )}
        {!directoryOnly && (
          <a className="all-malls-link" href="/malls">
            View all malls →
          </a>
        )}
      </section>}
      {!directoryOnly && (
        <section className="network-james">
          <div>
            <span>S</span>
            <i className="james-online" />
          </div>
          <article>
            <p className="eyebrow">SELMA · YOUR LOCAL SHOPPING COMPANION</p>
            <h2>
              One question.
              <br />
              The whole network.
            </h2>
            <ul className="info-list"><li>Search live Namibian stores.</li><li>Compare local options and prices in N$.</li><li>Focus on stores from a specific mall.</li></ul>
            <button onClick={() => askSelma()}>
              Ask Selma what you need →
            </button>
          </article>
          <aside>
            {[
              "Find a local birthday gift under N$800.",
              "Show me an outfit for a Windhoek weekend under N$2,000.",
              "What can I collect from a local store today?",
            ].map((question) => (
              <button key={question} onClick={() => askSelma(question)}>
                “{question}” <span>Ask →</span>
              </button>
            ))}
          </aside>
        </section>
      )}
      {!directoryOnly && <section className="network-faq" aria-labelledby="network-faq-title">
        <header><p className="eyebrow"><span /> QUESTIONS</p><h2 id="network-faq-title">Shopping on NeuroCity</h2></header>
        <div>
          <details><summary>What is NeuroCity?</summary><p>NeuroCity is a Namibian online marketplace that connects shoppers with approved local stores, products, services and participating malls.</p></details>
          <details><summary>Can I shop from different stores in one place?</summary><p>Yes. Browse the whole NeuroCity marketplace or enter the online space for a participating mall to see its stores together.</p></details>
          <details><summary>How does Selma help me shop?</summary><p>Describe what you need, including your budget, size, colour or location. Selma searches participating merchants&apos; catalogues for relevant local options.</p></details>
          <details><summary>How can my business join?</summary><p>Submit a merchant application with your business details. Approved merchants receive a storefront and tools for managing products, inventory and orders.</p></details>
        </div>
      </section>}
      <footer className="network-footer">
        <div className="network-brand">
          <ManagedImage src="/branding/neurocity-malls-mark.png" alt="" width={180} height={180} />
          <span>
            <b className="network-wordmark">Neuro<span>City</span></b>
          </span>
        </div>
        <p>Namibia&apos;s connected commerce and digital-mall network.</p>
        <nav>
          <a href="/marketplace">Marketplace</a>
          <a href="/malls">Shop by mall</a>
          <a href="/apply">Become a merchant</a>
          <a href="/admin">Administration</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
        </nav>
        <small>© {new Date().getFullYear()} NeuroCity · Namibia</small>
      </footer>
      <button
        className="network-james-fab"
        onClick={() => askSelma()}
        aria-label="Open Selma"
      >
        ✦
      </button>
    </main>
  );
}
