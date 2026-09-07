"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CONSENT_KEY = "neurocity_analytics_consent_v1";
const GA_ID = "G-5GWSF5V0R2";

function enableAnalytics() {
  if (document.querySelector(`script[data-neurocity-analytics="${GA_ID}"]`)) return;
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  script.dataset.neurocityAnalytics = GA_ID;
  document.head.appendChild(script);
  window.dataLayer = window.dataLayer || [];
  const gtag = (...args: unknown[]) => window.dataLayer.push(args);
  gtag("js", new Date());
  gtag("config", GA_ID, { anonymize_ip: true });
}

function disableAnalytics() {
  for (const name of document.cookie.split(";").map((item) => item.trim().split("=")[0]).filter((name) => name === "_ga" || name.startsWith("_ga_"))) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

declare global { interface Window { dataLayer: unknown[]; } }

export function CookieConsent() {
  const [choice, setChoice] = useState<string | null>(null);
  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    setChoice(stored);
    if (stored === "accepted") enableAnalytics();
    const openChoices = () => setChoice(null);
    window.addEventListener("neurocity:privacy-choices", openChoices);
    return () => window.removeEventListener("neurocity:privacy-choices", openChoices);
  }, []);
  function decide(next: "accepted" | "rejected") {
    localStorage.setItem(CONSENT_KEY, next); setChoice(next);
    if (next === "accepted") enableAnalytics();
    else disableAnalytics();
  }
  if (choice) return <button className="cookie-preferences" onClick={() => setChoice(null)}>Privacy choices</button>;
  return <aside className="cookie-consent" aria-label="Analytics cookie choice"><div><b>Your privacy choice</b><p>NeuroCity uses necessary storage for sign-in, security and features you request. With your permission, Google Analytics helps us understand general site use.</p><Link href="/privacy">Read the privacy notice</Link></div><div><button onClick={() => decide("rejected")}>Reject analytics</button><button onClick={() => decide("accepted")}>Accept analytics</button></div></aside>;
}
