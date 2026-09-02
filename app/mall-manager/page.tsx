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
  useEffect(() => { fetch("/api/auth/access", { cache: "no-store" }).then((response) => response.json()).then(setAccess); }, []);
  if (!access) return <main className="account-gate"><p>Opening mall management…</p></main>;
  if (!access.authenticated) return <main className="account-gate"><h1>Mall management</h1><p>Sign in with the account invited to manage the digital mall.</p><Link href="/login?account_type=mall&return_to=%2Fmall-manager">Continue to sign in</Link></main>;
  if (!access.mallAccounts.length) return <main className="account-gate"><h1>No mall access assigned</h1><p>This account has not been added to a digital mall management team.</p><Link href="/access">Choose another account type</Link></main>;
  return <main className="mall-manager-home" id="main-content"><header><Link href="/access">← Account centre</Link><a href="/api/auth/logout?return_to=/">Sign out</a></header><section><p className="eyebrow">Mall management</p><h1>Your digital malls</h1><p>Choose a mall to review its live public experience. Operational management tools will appear here as they are enabled for your role.</p></section><div>{access.mallAccounts.map((mall) => <article key={mall.id}><span>◇</span><div><small>{mall.role}</small><h2>{mall.name}</h2><p>Digital mall access is active.</p></div><Link href={`/malls/${mall.slug}`}>Open mall →</Link></article>)}</div></main>;
}
