"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type MallAccess = {
  authenticated: boolean;
  user?: { displayName: string; email: string };
  mallAccounts: { id: number; name: string; slug: string; role: string }[];
};

export default function MallManagerPage() {
  const [access, setAccess] = useState<MallAccess | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { fetch("/api/auth/access", { cache: "no-store" }).then((response) => response.json()).then(setAccess); }, []);
  if (!access) return <main className="account-gate"><p>Opening mall management…</p></main>;
  if (!access.authenticated) return <main className="account-gate"><h1>Mall management</h1><p>Sign in with the account invited to manage the digital mall.</p><Link href="/login?account_type=mall&return_to=%2Fmall-manager">Continue to sign in</Link></main>;
  if (!access.mallAccounts.length) return <main className="account-gate"><h1>No mall access assigned</h1><p>This account has not been added to a digital mall management team.</p><Link href="/access">Choose another account type</Link></main>;
  return <main className="mall-manager-home manager-shell" id="main-content">
    <aside className={menuOpen ? "workspace-drawer-open" : ""}>
      <button className="workspace-drawer-close" onClick={() => setMenuOpen(false)} aria-label="Close mall menu">×</button>
      <Link href="/" className="brand"><span>Neuro</span><strong>City</strong></Link>
      <div className="mall-manager-identity"><span>{access.user?.displayName.slice(0,1).toUpperCase()}</span><div><b>{access.user?.displayName}</b><small>Mall management</small></div></div>
      <nav><a className="active" href="#assigned" onClick={() => setMenuOpen(false)}>◇ <span>Assigned malls</span><b>{access.mallAccounts.length}</b></a><Link href="/access">◎ <span>Account centre</span></Link></nav>
      <a className="mall-manager-signout" href="/api/auth/logout?return_to=/">Sign out</a>
    </aside>
    {menuOpen && <button className="workspace-drawer-backdrop" onClick={() => setMenuOpen(false)} aria-label="Close mall menu" />}
    <div className="mall-manager-main">
      <header><button className="workspace-menu-toggle" onClick={() => setMenuOpen(true)} aria-label="Open mall menu" aria-expanded={menuOpen}><i aria-hidden="true"><span/><span/><span/></i><span>Menu</span></button><Link href="/access">Switch workspace</Link></header>
      <section><p className="eyebrow">Mall management</p><h1>Your digital malls</h1><p>Access every mall assigned to your account and review its live customer experience from one workspace.</p></section>
      <div id="assigned" className="mall-manager-list">{access.mallAccounts.map((mall) => <article key={mall.id}><span>◇</span><div><small>{mall.role}</small><h2>{mall.name}</h2><p>Management access active · Public experience available</p></div><Link href={`/malls/${mall.slug}`}>Open mall →</Link></article>)}</div>
    </div>
  </main>;
}
