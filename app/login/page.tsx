"use client";

import { FormEvent, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const requestedReturn = searchParams.get("return_to") ?? "/";
  const returnTo = requestedReturn.startsWith("/") && !requestedReturn.startsWith("//") ? requestedReturn : "/";
  const [mode, setMode] = useState<"login" | "register">(searchParams.get("mode") === "register" ? "register" : "login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const passwordChecks = useMemo(() => [
    { label: "10 characters", met: form.password.length >= 10 },
    { label: "A letter", met: /[A-Za-z]/.test(form.password) },
    { label: "A number or symbol", met: /[^A-Za-z]/.test(form.password) },
  ], [form.password]);

  function changeMode(next: "login" | "register") { setMode(next); setMessage(""); setShowPassword(false); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage(""); setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error); return; }
      window.location.href = mode === "register" && returnTo === "/" ? "/account?welcome=1" : returnTo;
    } catch { setMessage("Account access is temporarily unavailable. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="customer-onboarding"><section className="onboarding-story"><Link href="/" className="brand"><span>Neuro</span><strong>City</strong></Link><div><p className="eyebrow light">Your mall, personalised</p><h1>Shop Windhoek with a companion who knows your journey.</h1><p>Create one secure customer account for your shopping bag, orders, favourite stores and personal companion.</p><ol><li><span>01</span><div><b>Discover with James</b><small>Search live local catalogues by product, colour, size or budget.</small></div></li><li><span>02</span><div><b>Keep everything together</b><small>Your bag, saved products, delivery addresses and orders follow you across devices.</small></div></li><li><span>03</span><div><b>Stay in control</b><small>You choose what your companion may remember when personal memory launches.</small></div></li></ol></div><small>Secure customer access · Windhoek, Namibia</small></section><section className="onboarding-access"><div className="onboarding-mobile-brand"><Link href="/" className="brand"><span>Neuro</span><strong>City</strong></Link><Link href="/">Back to mall</Link></div><div className="onboarding-card"><div className="auth-tabs" role="tablist" aria-label="Account access"><button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}>Sign in</button><button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}>Create account</button></div><header><p className="eyebrow">{mode === "login" ? "Welcome back" : "Join NeuroCity"}</p><h2>{mode === "login" ? "Continue your shopping journey" : "Create your customer account"}</h2><p>{mode === "login" ? "Use the email and password connected to your account." : "It takes less than a minute. You’ll be signed in automatically."}</p></header><form onSubmit={submit}>{mode === "register" && <label>Full name<span>Used for your account and order confirmations</span><input required autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Your full name" /></label>}<label>Email address<span>{mode === "register" ? "Your receipts and order updates will come here" : "The email used when creating your account"}</span><input required type="email" autoComplete="email" inputMode="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="you@example.com" /></label><label>Password<span>{mode === "register" ? "Create a secure password" : "At least 10 characters"}</span><div className="password-field"><input required type={showPassword ? "text" : "password"} minLength={10} autoComplete={mode === "register" ? "new-password" : "current-password"} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={mode === "register" ? "Create a password" : "Enter your password"} /><button type="button" onClick={() => setShowPassword(!showPassword)}>{showPassword ? "Hide" : "Show"}</button></div></label>{mode === "register" && <div className="password-checks" aria-label="Password requirements">{passwordChecks.map((check) => <span className={check.met ? "met" : ""} key={check.label}>{check.met ? "✓" : "○"} {check.label}</span>)}</div>}{message && <p className="form-error" role="alert">{message}</p>}<button className="auth-submit" disabled={busy || (mode === "register" && !passwordChecks.every((check) => check.met))}>{busy ? (mode === "login" ? "Signing in…" : "Creating your account…") : (mode === "login" ? "Sign in securely" : "Create account and continue")}</button></form><div className="auth-switch"><span>{mode === "login" ? "New to NeuroCity?" : "Already have an account?"}</span><button onClick={() => changeMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create your account" : "Sign in instead"}</button></div><aside><b>Merchant too?</b><p>Use the same account. Approved merchant access will appear automatically in your dashboard.</p></aside></div><p className="onboarding-privacy">NeuroCity uses your account information to provide shopping, order and merchant services. We never store raw passwords.</p></section></main>;
}
