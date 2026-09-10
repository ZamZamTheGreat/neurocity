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
    script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error("Turnstile could not load")); };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

export default function TurnstileChallenge({ action, onToken, resetKey = 0 }: { action: string; onToken: (token: string | null) => void; resetKey?: number }) {
  const container = useRef<HTMLDivElement>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  useEffect(() => { fetch("/api/security/turnstile", { cache: "no-store" }).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => data.enabled && data.siteKey ? setSiteKey(data.siteKey) : setError("Human verification is not configured.")).catch(() => setError("Human verification could not load.")); }, [retryKey]);
  useEffect(() => {
    if (!siteKey || !container.current) return;
    let widget: string | undefined;
    let active = true;
    onToken(null);
    loadScript().then(() => {
      if (!active || !container.current || !window.turnstile) return;
      try {
        widget = window.turnstile.render(container.current, { sitekey: siteKey, action, theme: "auto", size: "flexible", callback: (token: string) => { setError(""); onToken(token); }, "expired-callback": () => onToken(null), "timeout-callback": () => { onToken(null); setError("Human verification timed out. Try again."); }, "error-callback": () => { onToken(null); setError("Human verification failed to load."); } });
      } catch { onToken(null); setError("Human verification could not start."); }
    }).catch(() => setError("Human verification could not load."));
    return () => { active = false; if (widget !== undefined && window.turnstile) window.turnstile.remove(widget); };
  }, [action, onToken, resetKey, retryKey, siteKey]);
  return <div className="turnstile-challenge"><div ref={container} />{error && <p className="form-error" role="alert">{error} <button type="button" onClick={() => { setError(""); setSiteKey(null); setRetryKey((value) => value + 1); }}>Retry verification</button></p>}</div>;
}
