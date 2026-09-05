"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import TurnstileChallenge from "../components/TurnstileChallenge";

export default function LoginPage() {
  const searchParams = useSearchParams();
  const accountType = searchParams.get("account_type") ?? "customer";
  const accountContext =
    {
      customer: { label: "Customer account", title: "Continue your shopping journey" },
      merchant: { label: "Merchant workspace", title: "Continue to your business workspace" },
      mall: { label: "Mall management", title: "Continue to your digital mall" },
      administrator: { label: "NeuroCity administration", title: "Continue to platform operations" },
    }[accountType] ?? { label: "NeuroCity account", title: "Continue to NeuroCity" };
  const requestedReturn = searchParams.get("return_to") ?? "/";
  const returnTo =
    requestedReturn.startsWith("/") && !requestedReturn.startsWith("//")
      ? requestedReturn
      : "/";
  const [mode, setMode] = useState<"login" | "register">(
    searchParams.get("mode") === "register" ? "register" : "login",
  );
  const [form, setForm] = useState({ name: "", email: "", password: "", mfaCode: "", privacyAccepted: false, termsAccepted: false });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const acceptTurnstile = useCallback((token: string | null) => setTurnstileToken(token), []);
  const passwordChecks = useMemo(
    () => [
      { label: "10 characters", met: form.password.length >= 10 },
      { label: "A letter", met: /[A-Za-z]/.test(form.password) },
      { label: "A number or symbol", met: /[^A-Za-z]/.test(form.password) },
    ],
    [form.password],
  );
  useEffect(() => {
    fetch("/api/auth/providers").then((response) => response.json()).then((providers) => setGoogleAvailable(providers.google === true)).catch(() => undefined);
  }, []);
  useEffect(() => {
    const oauthError = searchParams.get("oauth_error");
    if (oauthError) setMessage(oauthError === "account_not_found" ? "No NeuroCity account uses that Google email. Create an account with Google first." : oauthError === "administrator_password_required" ? "Administrators must sign in with their password and authenticator code." : "Google sign-in could not be completed. Please try again.");
  }, [searchParams]);

  function changeMode(next: "login" | "register") {
    setMode(next);
    setMessage("");
    setShowPassword(false);
    setTurnstileToken(null);
    setTurnstileReset((value) => value + 1);
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, turnstileToken }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error);
        setTurnstileToken(null);
        setTurnstileReset((value) => value + 1);
        return;
      }
      window.location.href =
        mode === "register" && returnTo === "/"
          ? "/account?welcome=1"
          : returnTo;
    } catch {
      setMessage(
        "Account access is temporarily unavailable. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="customer-onboarding">
      <section className="onboarding-story">
        <Link href="/" className="brand">
          <span>Neuro</span>
          <strong>City</strong>
        </Link>
        <div>
          <p className="eyebrow light">Your mall, personalised</p>
            <h1>Shop Namibia with a companion who knows your journey.</h1>
          <ul className="info-list">
            <li>Keep your shopping bag and orders in one secure account.</li>
            <li>Save favourite stores.</li>
            <li>Use your personal shopping companion.</li>
          </ul>
          <ol>
            <li>
              <span>01</span>
              <div>
                <b>Discover with Selma</b>
                <small>
                  Search live local catalogues by product, colour, size or
                  budget.
                </small>
              </div>
            </li>
            <li>
              <span>02</span>
              <div>
                <b>Keep everything together</b>
                <small>
                  Your bag, saved products, delivery addresses and orders follow
                  you across devices.
                </small>
              </div>
            </li>
            <li>
              <span>03</span>
              <div>
                <b>Stay in control</b>
                <small>
                  You choose what your companion may remember when personal
                  memory launches.
                </small>
              </div>
            </li>
          </ol>
        </div>
        <small>Secure customer access · NeuroCity Namibia</small>
      </section>
      <section className="onboarding-access">
        <div className="onboarding-mobile-brand">
          <Link href="/" className="brand">
            <span>Neuro</span>
            <strong>City</strong>
          </Link>
          <Link href="/">Back to mall</Link>
        </div>
        <div className="onboarding-card">
          <div className="login-account-context">
            <Link href="/access">← Change account type</Link>
            <span>{accountContext.label}</span>
          </div>
          <div className="auth-tabs" role="tablist" aria-label="Account access">
            <button
              role="tab"
              aria-selected={mode === "login"}
              className={mode === "login" ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Sign in
            </button>
            <button
              role="tab"
              aria-selected={mode === "register"}
              className={mode === "register" ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              Create account
            </button>
          </div>
          <header>
            <p className="eyebrow">
              {mode === "login" ? "Welcome back" : "Join NeuroCity"}
            </p>
            <h2>
              {mode === "login"
                ? accountContext.title
                : "Create your customer account"}
            </h2>
            <ul className="info-list">
              <li>{mode === "login" ? "Use the email and password connected to your account." : "Registration takes less than a minute."}</li>
              {mode === "register" ? <li>You’ll be signed in automatically.</li> : null}
            </ul>
          </header>
          {googleAvailable && (
            <div className="google-auth-option">
              <a href={`/api/auth/google?return_to=${encodeURIComponent(returnTo)}${mode === "register" ? "&create=1" : ""}`}>
                <span aria-hidden="true">G</span>{mode === "register" ? "Create account with Google" : "Continue with Google"}
              </a>
              {mode === "register" && <small>By continuing, you accept the <Link href="/privacy" target="_blank">Privacy Notice</Link> and <Link href="/terms" target="_blank">Terms &amp; Conditions</Link>.</small>}
              <div><span>or continue with email</span></div>
            </div>
          )}
          <form onSubmit={submit}>
            {mode === "register" && (
              <label>
                Full name
                <span>Used for your account and order confirmations</span>
                <input
                  required
                  autoComplete="name"
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Your full name"
                />
              </label>
            )}
            <label>
              Email address
              <span>
                {mode === "register"
                  ? "Your receipts and order updates will come here"
                  : "The email used when creating your account"}
              </span>
              <input
                required
                type="email"
                autoComplete="email"
                inputMode="email"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <span>
                {mode === "register"
                  ? "Create a secure password"
                  : "At least 10 characters"}
              </span>
              <div className="password-field">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  minLength={10}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  value={form.password}
                  onChange={(event) =>
                    setForm({ ...form, password: event.target.value })
                  }
                  placeholder={
                    mode === "register"
                      ? "Create a password"
                      : "Enter your password"
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            {mode === "login" && accountType === "administrator" && (
              <label>
                Authenticator code
                <span>Enter the current six-digit code from your authenticator app</span>
                <input required name="one-time-code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={form.mfaCode} onChange={(event) => setForm({ ...form, mfaCode: event.target.value.replace(/\D/g, "").slice(0, 6) })} placeholder="000000" />
              </label>
            )}
            {mode === "register" && (
              <div
                className="password-checks"
                aria-label="Password requirements"
              >
                {passwordChecks.map((check) => (
                  <span className={check.met ? "met" : ""} key={check.label}>
                    {check.met ? "✓" : "○"} {check.label}
                  </span>
                ))}
              </div>
            )}
            {mode === "register" && (
              <label className="check wide">
                <input required type="checkbox" checked={form.privacyAccepted} onChange={(event) => setForm({ ...form, privacyAccepted: event.target.checked })} />
                <span>I have read and accept the <Link href="/privacy" target="_blank">NeuroCity privacy notice</Link>.</span>
              </label>
            )}
            {mode === "register" && (
              <label className="check wide">
                <input required type="checkbox" checked={form.termsAccepted} onChange={(event) => setForm({ ...form, termsAccepted: event.target.checked })} />
                <span>I agree to the <Link href="/terms" target="_blank">NeuroCity Terms &amp; Conditions</Link>.</span>
              </label>
            )}
            {message && (
              <p className="form-error" role="alert">
                {message}
              </p>
            )}
            <TurnstileChallenge action={mode} onToken={acceptTurnstile} resetKey={turnstileReset} />
            <button
              className="auth-submit"
              disabled={
                busy || !turnstileToken ||
                (mode === "register" &&
                  (!passwordChecks.every((check) => check.met) || !form.privacyAccepted || !form.termsAccepted))
              }
            >
              {busy
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating your account…"
                : mode === "login"
                  ? "Sign in securely"
                  : "Create account and continue"}
            </button>
          </form>
          <div className="auth-switch">
            {mode === "login" && accountType !== "customer" ? (
              <>
                <span>Need access to this workspace?</span>
                <Link href="/join">Choose how to join</Link>
              </>
            ) : (
              <>
                <span>{mode === "login" ? "New to NeuroCity?" : "Already have an account?"}</span>
                <button onClick={() => changeMode(mode === "login" ? "register" : "login")}>
                  {mode === "login" ? "Create your customer account" : "Sign in instead"}
                </button>
              </>
            )}
          </div>
          <div className="new-account-route">
            <span>Need a different type of NeuroCity account?</span>
            <Link href="/join">View account creation options →</Link>
          </div>
          <aside>
            <b>Merchant too?</b>
            <ul className="info-list">
              <li>Use the same account for customer and merchant access.</li>
              <li>Approved merchant access appears automatically in your dashboard.</li>
            </ul>
          </aside>
        </div>
        <p className="onboarding-privacy">
          NeuroCity uses your account information to provide shopping, order and
          merchant services. We never store raw passwords. <Link href="/privacy">Privacy notice</Link>
        </p>
      </section>
    </main>
  );
}
