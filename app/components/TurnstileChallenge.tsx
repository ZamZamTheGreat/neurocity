"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: { render: (element: HTMLElement, options: Record<string, unknown>) => string; remove: (id: string) => void };
  }
}

let scriptPromise: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile could not load"));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function TurnstileChallenge({ action, onToken, resetKey = 0 }: { action: string; onToken: (token: string | null) => void; resetKey?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/security/turnstile").then((r) => r.json()).then((data) => data.enabled && data.siteKey ? setSiteKey(data.siteKey) : setError("Human verification is not configured.")).catch(() => setError("Human verification could not load.")); }, []);
  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widget: string | undefined;
    let active = true;
    onToken(null);
    loadScript().then(() => {
      if (!active || !container.current || !window.turnstile) return;
      widget = window.turnstile.render(container.current, { sitekey: siteKey, action, theme: "auto", size: "flexible", callback: (token: string) => onToken(token), "expired-callback": () => onToken(null), "error-callback": () => { onToken(null); setError("Human verification failed to load."); } });
    }).catch(() => setError("Human verification could not load."));
    return () => { active = false; if (widget && window.turnstile) window.turnstile.remove(widget); };
  }, [action, onToken, resetKey, siteKey]);
  return <div className="turnstile-challenge"><div ref={container} />{error && <p className="form-error">{error}</p>}</div>;
}
