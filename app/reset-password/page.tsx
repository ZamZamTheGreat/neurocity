"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import TurnstileChallenge from "../components/TurnstileChallenge";

export default function ResetPasswordPage() {
  const token = useSearchParams().get("token");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [complete, setComplete] = useState(false);
  const acceptTurnstile = useCallback((value: string | null) => setTurnstileToken(value), []);
  const checks = useMemo(() => [password.length >= 10, /[A-Za-z]/.test(password), /[^A-Za-z]/.test(password), password === confirmPassword && Boolean(password)], [password, confirmPassword]);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const response = await fetch(token ? "/api/auth/password-reset/complete" : "/api/auth/password-reset/request", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(token ? { token, password } : { email, turnstileToken }) });
      const data = await response.json();
      if (!response.ok) { setMessage(data.error ?? "The request could not be completed."); if (!token) { setTurnstileToken(null); setTurnstileReset((value) => value + 1); } return; }
      setMessage(data.message ?? "Your password has been changed. You can now sign in."); setComplete(true);
    } catch { setMessage("Account recovery is temporarily unavailable. Please try again."); }
    finally { setBusy(false); }
  }

  return <main className="customer-onboarding recovery-page">
    <section className="onboarding-story"><Link href="/" className="brand"><span>Neuro</span><strong>City</strong></Link><div><p className="eyebrow light">Secure account recovery</p><h1>Get back to your NeuroCity account.</h1><ul className="info-list"><li>Reset links expire after 30 minutes.</li><li>Each link can be used once.</li><li>Existing sessions close after your password changes.</li></ul></div><small>NeuroCity account security · Namibia</small></section>
    <section className="onboarding-access">
      <div className="onboarding-mobile-brand"><Link href="/" className="brand"><span>Neuro</span><strong>City</strong></Link><Link href="/login">Back to sign in</Link></div>
      <div className="onboarding-card recovery-card">
        <header><p className="eyebrow">Account recovery</p><h2>{token ? "Choose a new password" : "Reset your password"}</h2><p>{token ? "Create a new password for your account." : "Enter your account email and we’ll send a secure reset link if it matches an account."}</p></header>
        {complete ? <div className="recovery-success" role="status"><b>{token ? "Password updated" : "Check your email"}</b><p>{message}</p>{token && <Link className="auth-submit" href="/login">Continue to sign in</Link>}</div> : <form onSubmit={submit}>
          {token ? <><label>New password<span>At least 10 characters with a letter and a number or symbol</span><div className="password-field"><input required type={showPassword ? "text" : "password"} minLength={10} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? "Hide" : "Show"}</button></div></label><label>Confirm new password<input required type={showPassword ? "text" : "password"} minLength={10} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label><div className="password-checks" aria-label="Password requirements"><span className={checks[0] ? "met" : ""}>{checks[0] ? "✓" : "○"} 10 characters</span><span className={checks[1] ? "met" : ""}>{checks[1] ? "✓" : "○"} A letter</span><span className={checks[2] ? "met" : ""}>{checks[2] ? "✓" : "○"} A number or symbol</span><span className={checks[3] ? "met" : ""}>{checks[3] ? "✓" : "○"} Passwords match</span></div></> : <><label>Email address<span>The email connected to your NeuroCity account</span><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></label><TurnstileChallenge action="password_reset" onToken={acceptTurnstile} resetKey={turnstileReset} /></>}
          {message && <p className="form-error" role="alert">{message}</p>}<button className="auth-submit" disabled={busy || (token ? !checks.every(Boolean) : !turnstileToken)}>{busy ? "Please wait…" : token ? "Change password" : "Send reset link"}</button>
        </form>}
        <div className="auth-switch"><span>Remembered your password?</span><Link href="/login">Return to sign in</Link></div>
      </div>
    </section>
  </main>;
}
