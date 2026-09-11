"use client";

import { useEffect, useMemo, useState } from "react";
import { ManagedImage } from "../components/ManagedImage";

type Branch = { id: number; name: string; address: string; city: string; pickupEnabled: boolean; deliveryEnabled: boolean };
type Chain = { id: number; name: string; slug: string; category: string; tagline: string | null; description: string | null; logoUrl: string | null; bannerUrl: string | null; branchCount: number; branches: Branch[] };

export default function ChainStoresPage() {
  const [chains, setChains] = useState<Chain[]>([]); const [loading, setLoading] = useState(true); const [query, setQuery] = useState("");
  useEffect(() => { fetch("/api/chains").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setChains(data.chains ?? []); }).catch(() => setChains([])).finally(() => setLoading(false)); }, []);
  const visible = useMemo(() => chains.filter((chain) => `${chain.name} ${chain.category} ${chain.branches.map((branch) => `${branch.name} ${branch.city}`).join(" ")}`.toLowerCase().includes(query.toLowerCase())), [chains, query]);
  return <main id="main-content" className="chain-directory">
    <header className="network-header"><a href="/" className="network-brand"><ManagedImage src="/branding/neurocity-malls-mark.png" alt="" width={180} height={180} /><span><b className="network-wordmark">Neuro<span>City</span></b><small>Namibia&apos;s connected shopping network</small></span></a><nav><a href="/">Home</a><a href="/marketplace">Marketplace</a><a href="/malls">Shop by mall</a><a className="active" href="/chains">Chain stores</a></nav><div><a href="/access">Account</a></div></header>
    <section className="chain-hero"><div><p className="eyebrow">SHOP BY BRAND</p><h1>One chain.<br /><em>Every participating location.</em></h1><p>Choose a franchise or chain-store brand to browse its catalogue, compare availability and see all participating branches in one place.</p></div><label><span>Search chain stores or locations</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. pharmacy or Windhoek" /></label></section>
    <section className="chain-results"><header><div><p className="eyebrow">CHAIN STORE DIRECTORY</p><h2>Participating brands</h2></div><span>{visible.length} {visible.length === 1 ? "chain" : "chains"}</span></header>
      {loading ? <div className="chain-empty">Loading chain stores…</div> : visible.length ? <div className="chain-grid">{visible.map((chain) => <article key={chain.id}><a href={`/stores/${chain.slug}#locations`}><div className="chain-cover">{chain.bannerUrl && <ManagedImage src={chain.bannerUrl} alt="" />}<span>{chain.logoUrl ? <ManagedImage src={chain.logoUrl} alt={`${chain.name} logo`} /> : chain.name.slice(0, 2)}</span></div><div><small>{chain.category}</small><h3>{chain.name}</h3><p>{chain.tagline ?? chain.description}</p><ul>{chain.branches.slice(0, 3).map((branch) => <li key={branch.id}>{branch.name} · {branch.city}</li>)}</ul><b>View all {chain.branchCount} locations →</b></div></a></article>)}</div> : <div className="chain-empty"><strong>No matching chain stores</strong><p>{chains.length ? "Try another store name, category or location." : "Participating franchise and chain-store brands will appear here once multiple locations are live."}</p></div>}
    </section>
  </main>;
}
