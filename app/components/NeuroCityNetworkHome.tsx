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
                <small>SHOP BY PLACE</small>
                <h2>Visit a digital mall</h2>
                <ul className="info-list"><li>Browse participating shopping centres and their stores.</li></ul>
                <a href="/malls">Browse digital malls →</a>
              </div>
            </article>
            <article>
              <span>03</span>
              <div>
                <small>NEED A HAND?</small>
                <h2>Ask Selma</h2>
                <ul className="info-list"><li>Describe your budget, size, colour, location or occasion.</li></ul>
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
      <NeuroConcierge
        open={selmaOpen}
        onClose={() => setSelmaOpen(false)}
        initialPrompt={selmaPrompt.text}
        promptKey={selmaPrompt.key}
      />
    </main>
  );
}
