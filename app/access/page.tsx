"use client";

import { useCallback, useEffect, useState } from "react";

type Access = {
  authenticated: boolean;
  user?: { displayName: string; email: string; platformRole: string };
  merchantAccounts: { id: number; name: string; slug: string; role: string }[];
  mallAccounts: { id: number; name: string; slug: string; role: string }[];
};

const accountTypes = [
  {
    id: "customer",
    icon: "◎",
    eyebrow: "Personal",
    title: "Customer account",
    description: "Shop, book services, track orders, save stores and chat with Selma.",
    destination: "/account",
  },
  {
    id: "merchant",
    icon: "▦",
    eyebrow: "Business",
    title: "Merchant workspace",
    description: "Manage your storefront, catalogue, orders, bookings, inventory and settlements.",
    destination: "/marketplace?workspace=merchant",
  },
  {
    id: "mall",
    icon: "◇",
    eyebrow: "Digital mall",
    title: "Mall management",
    description: "Access the malls assigned to you and manage their connected commerce presence.",
    destination: "/mall-manager",
  },
  {
    id: "administrator",
    icon: "✦",
    eyebrow: "Platform",
    title: "NeuroCity administration",
    description: "Review merchants, manage malls, orders, transactions and platform operations.",
    destination: "/admin",
  },
] as const;

export default function AccessPage() {
  const [access, setAccess] = useState<Access | null>(null);
  const [failed, setFailed] = useState(false);

  const loadAccess = useCallback(() => {
    setFailed(false);
    fetch("/api/auth/access", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("access_unavailable");
        return response.json();
      })
      .then(setAccess)
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    loadAccess();
  }, [loadAccess]);

  function available(id: (typeof accountTypes)[number]["id"]) {
    if (!access?.authenticated) return true;
    if (id === "customer") return true;
    if (id === "merchant") return access.merchantAccounts.length > 0;
    if (id === "mall") return access.mallAccounts.length > 0;
    return access.user?.platformRole === "administrator";
  }

  function href(type: (typeof accountTypes)[number]) {
    if (access?.authenticated) return type.destination;
    return `/login?account_type=${type.id}&return_to=${encodeURIComponent(type.destination)}`;
  }

  return (
    <main className="account-access" id="main-content">
      <header>
        <a href="/" className="network-brand">
          <img src="/branding/neurocity-malls-mark.png" alt="" />
          <span><b className="network-wordmark">Neuro<span>City</span></b><small>One identity · every workspace</small></span>
        </a>
        <nav className="account-centre-nav" aria-label="NeuroCity navigation">
          <a href="/">Network</a>
          <a href="/marketplace">Marketplace</a>
          <a href="/malls">Digital malls</a>
          <a href="/access" aria-current="page">Account centre</a>
        </nav>
        <a className="account-centre-shop" href="/marketplace">Start shopping <span>→</span></a>
      </header>

      <section className="access-intro">
        <p className="eyebrow">Account centre</p>
        <h1>{access?.authenticated ? `Welcome, ${access.user?.displayName.split(" ")[0]}` : "How are you using NeuroCity?"}</h1>
        <p>
          {access?.authenticated
            ? "Choose where you want to continue. Your permissions and information stay connected to one secure sign-in."
            : "Choose an account type and we’ll take you through the right sign-in and workspace."}
        </p>
        {access?.authenticated && <div className="access-identity"><span>{access.user?.displayName.slice(0, 1).toUpperCase()}</span><div><b>{access.user?.displayName}</b><small>{access.user?.email}</small></div><a href="/api/auth/logout?return_to=/">Sign out</a></div>}
        {access && !access.authenticated && (
          <div className="access-entry-actions">
            <span>Already have an account? Choose a workspace below to sign in.</span>
            <a href="/join">Create an account</a>
          </div>
        )}
      </section>

      {failed ? (
        <div className="access-error" role="alert"><span>We couldn’t check your account access.</span><button type="button" onClick={loadAccess}>Try again</button></div>
      ) : !access ? (
        <div className="access-loading">Checking your account access…</div>
      ) : (
        <section className="account-type-grid" aria-label="Choose account type">
          {accountTypes.map((type) => {
            const enabled = available(type.id);
            const detail = type.id === "merchant" && access.merchantAccounts.length
              ? access.merchantAccounts.map((item) => item.name).join(", ")
              : type.id === "mall" && access.mallAccounts.length
                ? access.mallAccounts.map((item) => item.name).join(", ")
                : null;
            const contents = <>
              <div className="account-type-icon" aria-hidden="true">{type.icon}</div>
              <small className={`account-access-state ${access.authenticated && enabled ? "ready" : "restricted"}`}>
                {!access.authenticated
                  ? "Sign-in required"
                  : enabled
                    ? "Ready to open"
                    : type.id === "merchant"
                      ? "Application required"
                      : "Access not assigned"}
              </small>
              <p>{type.eyebrow}</p>
              <h2>{type.title}</h2>
              <span>{type.description}</span>
              {detail && <small className="access-role-detail">Access: {detail}</small>}
            </>;
            if (enabled)
              return (
                <a
                  className="account-type-card"
                  href={href(type)}
                  key={type.id}
                  aria-label={`${access.authenticated ? "Open" : "Sign in to"} ${type.title}`}
                >
                  {contents}
                  <span className="account-card-action">
                    {access.authenticated ? "Open workspace" : "Continue to sign in"}<b>→</b>
                  </span>
                </a>
              );
            if (type.id === "merchant" && access.authenticated)
              return (
                <a
                  className="account-type-card account-type-application"
                  href="/apply"
                  key={type.id}
                  aria-label="Apply for a NeuroCity Marketplace merchant storefront"
                >
                  {contents}
                  <small className="access-role-detail">No merchant workspace is connected yet.</small>
                  <span className="account-card-action">
                    Apply to NeuroCity Marketplace<b>→</b>
                  </span>
                </a>
              );
            return (
              <article className="unavailable" key={type.id}>
                {contents}
                <div className="access-unavailable"><span>Not assigned to this account</span></div>
              </article>
            );
          })}
        </section>
      )}
      {access?.authenticated && (
        <nav className="access-quick-actions" aria-label="Account shortcuts">
          <div><b>Business shortcuts</b><span>Grow your NeuroCity presence from the same account.</span></div>
          <a href="/apply">Apply for another storefront</a>
          <a href="/application-status">Track an application</a>
        </nav>
      )}
      <footer>
        <b>One NeuroCity account</b>
        <span>A merchant or mall manager can still use the same account to shop as a customer.</span>
      </footer>
    </main>
  );
}
