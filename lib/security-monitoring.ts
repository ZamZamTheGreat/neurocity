import { createHash } from "node:crypto";
import { sendMail } from "./mail";

type Severity = "info" | "warning" | "critical";
type Detail = string | number | boolean | null;
const lastAlert = new Map<string, number>();

function safeDetails(details: Record<string, Detail>) {
  return Object.fromEntries(Object.entries(details).slice(0, 20).map(([key, value]) => {
    const name = key.slice(0, 64);
    const redacted = /(password|secret|token|cookie|authorization|email|address|request|body)/i.test(name);
    return [name, redacted ? "[redacted]" : typeof value === "string" ? value.slice(0, 240) : value];
  }));
}

export function securityFingerprint(value: string) {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export async function securityAlert(event: string, severity: Severity, details: Record<string, Detail> = {}, cooldownKey?: string) {
  const now = Date.now();
  const key = `${event}:${cooldownKey ?? "global"}`;
  const cooldownMs = 10 * 60_000;
  if (now - (lastAlert.get(key) ?? 0) < cooldownMs) return;
  lastAlert.set(key, now);
  const payload = { source: "neurocity", event: event.slice(0, 100), severity, occurredAt: new Date(now).toISOString(), environment: process.env.NODE_ENV ?? "unknown", details: safeDetails(details) };
  console.warn(JSON.stringify({ type: "security_alert", ...payload }));
  const email = process.env.SECURITY_ALERT_EMAIL?.trim() || process.env.ADMIN_EMAIL?.trim();
  const emailDelivery = email && process.env.SMTP_USER && process.env.SMTP_PASS
    ? sendMail({
        to: email,
        subject: `[NeuroCity security] ${severity.toUpperCase()}: ${payload.event}`,
        text: `NeuroCity security alert\n\nSeverity: ${severity}\nEvent: ${payload.event}\nTime: ${payload.occurredAt}\nEnvironment: ${payload.environment}\nDetails: ${JSON.stringify(payload.details, null, 2)}\n`,
      }).catch((error) => console.error("security alert email delivery failed", error instanceof Error ? error.message : "unknown error"))
    : Promise.resolve();
  const configured = process.env.SECURITY_ALERT_WEBHOOK_URL?.trim();
  const webhookDelivery = configured ? (async () => {
    try {
      const url = new URL(configured);
      if (url.protocol !== "https:") throw new Error("Security alert webhook must use HTTPS.");
      const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload), signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error(`Security alert receiver returned ${response.status}.`);
    } catch (error) {
      console.error("security alert webhook delivery failed", error instanceof Error ? error.message : "unknown error");
    }
  })() : Promise.resolve();
  await Promise.allSettled([emailDelivery, webhookDelivery]);
}
