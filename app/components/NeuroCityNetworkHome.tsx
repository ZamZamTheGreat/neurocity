"use client";

import { type CSSProperties, useEffect, useState } from "react";
import { NeuroConcierge } from "./NeuroConcierge";

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

export default function NeuroCityNetworkHome({
  directoryOnly = false,
}: {
  directoryOnly?: boolean;
}) {
  const [malls, setMalls] = useState<Mall[]>([]);
  const [loading, setLoading] = useState(true);
  const [selmaOpen, setSelmaOpen] = useState(false);
  const [selmaPrompt, setSelmaPrompt] = useState({ text: "", key: 0 });
  const askSelma = (text = "") => {
    if (text) setSelmaPrompt({ text, key: Date.now() });
    setSelmaOpen(true);
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
  return (
    <main id="main-content" className="network-home digital-malls-home">
      <header className="network-header">
        <a href="/" className="network-brand">
          <img src="/branding/neurocity-malls-mark.png" alt="" />
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
            Digital malls
          </a>
          <a href="/marketplace#stores">Stores</a>
        </nav>
        <div>
          <button onClick={() => askSelma()}>✦ Ask Selma</button>
          <a href="/account">Account</a>
        </div>
      </header>
      {!directoryOnly && (
        <>
          <section className="network-hero">
            <div>
              <p className="eyebrow">
                <span /> ONE NETWORK · MANY DESTINATIONS
              </p>
              <h1>
                Namibia&apos;s shopping world, <em>connected.</em>
              </h1>
              <ul className="info-list"><li>Discover independent local stores.</li><li>Shop the NeuroCity Marketplace.</li><li>Enter digital versions of Namibia&apos;s malls.</li></ul>
              <div>
                <a className="primary" href="/marketplace">
                  Shop the marketplace <span>→</span>
                </a>
                <a href="/malls">Explore digital malls</a>
              </div>
              <ul>
                <li>One customer account</li>
                <li>Live local catalogues</li>
                <li>Selma across the network</li>
              </ul>
            </div>
            <aside>
              <div className="network-map">
                <i className="pulse p1" />
                <i className="pulse p2" />
                <i className="pulse p3" />
                <span className="network-node main">
                  <img src="/branding/neurocity-malls-mark.png" alt="" />
                  <b>NeuroCity</b>
                  <small>Commerce network</small>
                </span>
                <span className="network-node market">
                  <b>Marketplace</b>
                  <small>Namibian stores</small>
                </span>
                <span className="network-node malls">
                  <b>Digital malls</b>
                  <small>{malls.length || "New"} destinations</small>
                </span>
                <span className="network-node james">
                  <b>Selma</b>
                  <small>Local discovery</small>
                </span>
              </div>
            </aside>
          </section>
          <section className="network-paths">
            <article>
              <span>01</span>
              <div>
                <small>SHOP ACROSS NAMIBIA</small>
                <h2>NeuroCity Marketplace</h2>
                <ul className="info-list"><li>Browse products.</li><li>Discover independent merchants in one national marketplace.</li></ul>
                <a href="/marketplace">Enter marketplace →</a>
              </div>
            </article>
            <article>
              <span>02</span>
              <div>
                <small>ENTER A DESTINATION</small>
                <h2>Digital malls</h2>
                <ul className="info-list"><li>Visit participating shopping centres online.</li><li>Explore each centre’s identity and stores.</li></ul>
                <a href="/malls">Browse digital malls →</a>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <small>ASK NATURALLY</small>
                <h2>Selma</h2>
                <ul className="info-list"><li>Search live Namibian catalogues across the network.</li><li>Shop naturally by product, N$ budget, colour, size or occasion.</li></ul>
                <button onClick={() => setSelmaOpen(true)}>
                  Start a conversation →
                </button>
              </div>
            </article>
          </section>
        </>
      )}
      <section
        className={`network-malls ${directoryOnly ? "directory-page" : ""}`}
      >
        <header>
          <div>
            <p className="eyebrow">
              <span /> DIGITAL DESTINATIONS
            </p>
            <h2>
              {directoryOnly
                ? "Explore Namibia’s digital malls."
                : "The mall experience, extended online."}
            </h2>
          </div>
          <p>
            {directoryOnly
              ? "Enter a participating mall to browse its stores, products and services through a dedicated digital experience."
              : "Every mall keeps its own identity while connecting customers to the wider NeuroCity network."}
          </p>
        </header>
        {loading ? (
          <div className="mall-directory-empty">Loading digital malls…</div>
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
                      <img src={mall.markUrl} alt="" />
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
                  <span>NEUROCITY DIGITAL MALL</span>
                  <h3>{mall.name}</h3>
                  <p>{mall.tagline ?? `Discover ${mall.name} online.`}</p>
                  <ul>
                    <li>
                      {mall.storeCount}{" "}
                      {mall.storeCount === 1 ? "store" : "stores"} live
                    </li>
                    <li>
                      {mall.domain
                        ? "Custom domain connected"
                        : "NeuroCity preview"}
                    </li>
                  </ul>
                  <a href={`/malls/${mall.slug}`}>
                    Enter digital mall <b>→</b>
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mall-directory-empty">
            <b>Digital malls are being prepared.</b>
            <ul className="info-list centered"><li>New destinations will appear here as partnerships launch.</li></ul>
          </div>
        )}
        {!directoryOnly && (
          <a className="all-malls-link" href="/malls">
            View all digital malls →
          </a>
        )}
      </section>
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
            <ul className="info-list"><li>Search live Namibian stores.</li><li>Compare local options and prices in N$.</li><li>Focus on a specific digital mall.</li></ul>
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
      <footer className="network-footer">
        <div className="network-brand">
          <img src="/branding/neurocity-malls-mark.png" alt="" />
          <span>
            <b className="network-wordmark">Neuro<span>City</span></b>
          </span>
        </div>
        <p>Namibia&apos;s connected commerce and digital-mall network.</p>
        <nav>
          <a href="/marketplace">Marketplace</a>
          <a href="/malls">Digital malls</a>
          <a href="/apply">Become a merchant</a>
          <a href="/admin">Administration</a>
          <a href="/privacy">Privacy</a>
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
      <NeuroConcierge
        open={selmaOpen}
        onClose={() => setSelmaOpen(false)}
        initialPrompt={selmaPrompt.text}
        promptKey={selmaPrompt.key}
      />
    </main>
  );
}
