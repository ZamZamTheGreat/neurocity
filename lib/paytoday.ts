import { decodeProtectedHeader, jwtVerify } from "jose";

const API_VERSION = "12.12.2024";
const SANDBOX_URL = "https://admin.today-ww.net";
const LIVE_URL = "https://admin.today.com.na";

type PayTodayTokenData = {
  authorization?: { access_token?: string };
  payment_url?: string;
  payment_intent_token?: string;
  payment_token?: string;
  token?: string;
  id?: string;
  payment_id?: string;
  status?: string;
  reference?: string;
  intent?: {
    transaction_status?: string;
    reference?: string;
    transaction_data?: { payment_reference?: string; status?: string; reason?: string; time_stamp?: string };
  };
};

export type PayTodayPaymentInput = {
  amount: number;
  invoiceNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  returnUrl: string;
};

function settings() {
  const environment = process.env.PAYTODAY_ENVIRONMENT === "live" ? "live" : "sandbox";
  return {
    environment,
    baseUrl: environment === "live" ? LIVE_URL : SANDBOX_URL,
    shopKey: process.env.PAYTODAY_SHOP_KEY?.trim() ?? "",
    shopHandle: process.env.PAYTODAY_SHOP_HANDLE?.trim() ?? "",
    privateKey: process.env.PAYTODAY_PRIVATE_KEY?.trim() ?? "",
  };
}

export function getPayTodayAvailability() {
  const config = settings();
  const configured = Boolean(config.shopKey && config.shopHandle && config.privateKey);
  return { configured, environment: config.environment } as const;
}

async function requestJson(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(15_000) });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) throw new Error(`PayToday request failed (${response.status}).`);
  if (!body) throw new Error("PayToday returned an unreadable response.");
  return body;
}

function payTodayVerificationKeys(privateKey: string) {
  const keys: Uint8Array[] = [new TextEncoder().encode(privateKey)];
  if (/^[a-f\d]+$/i.test(privateKey) && privateKey.length >= 32 && privateKey.length % 2 === 0) keys.push(new Uint8Array(Buffer.from(privateKey, "hex")));
  if (/^[A-Za-z\d+/_-]+={0,2}$/.test(privateKey) && privateKey.length >= 32) {
    const normalized = privateKey.replaceAll("-", "+").replaceAll("_", "/");
    keys.push(new Uint8Array(Buffer.from(normalized, "base64")));
  }
  return keys.filter((candidate, index) => candidate.length >= 16 && keys.findIndex((other) => Buffer.from(other).equals(Buffer.from(candidate))) === index);
}

async function verifyProviderToken(token: string, privateKey: string) {
  if (token.length > 100_000 || token.split(".").length !== 3) throw new Error("PayToday returned an invalid token.");
  const header = decodeProtectedHeader(token);
  if (header.alg !== "HS256") throw new Error(`PayToday returned an unsupported token algorithm (${header.alg ?? "missing"}).`);
  for (const key of payTodayVerificationKeys(privateKey)) {
    try {
      const { payload } = await jwtVerify(token, key, { algorithms: ["HS256"] });
      if (!payload.data || typeof payload.data !== "object") throw new Error("PayToday returned an incomplete token.");
      return payload.data as PayTodayTokenData;
    } catch { /* Try the provider key's next documented/common byte encoding. */ }
  }
  throw new Error("PayToday token signature verification failed.");
}

async function createAccessToken() {
  const config = settings();
  if (!getPayTodayAvailability().configured) throw new Error("PayToday is not configured.");
  const response = await requestJson(`${config.baseUrl}/web/configuration/intent/`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", "user-agent": "NeuroCity/1.0" },
    body: JSON.stringify({ v: API_VERSION, handle: config.shopHandle, key: config.shopKey }),
  });
  if (typeof response.token !== "string") throw new Error("PayToday did not return an authorization token.");
  const data = await verifyProviderToken(response.token, config.privateKey);
  if (!data.authorization?.access_token) throw new Error("PayToday authorization response was incomplete.");
  return data.authorization.access_token;
}

export async function createPayTodayPayment(input: PayTodayPaymentInput) {
  const config = settings();
  const accessToken = await createAccessToken();
  const response = await requestJson(`${config.baseUrl}/web/create/payment/intent/`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${accessToken}`, "user-agent": "NeuroCity/1.0" },
    body: JSON.stringify({
      v: API_VERSION,
      handle: config.shopHandle,
      amount: input.amount.toFixed(2),
      invoice_number: input.invoiceNumber,
      user_first_name: input.firstName,
      user_last_name: input.lastName,
      user_email: input.email,
      user_phone_number: input.phone,
      return_url: input.returnUrl,
    }),
  });
  if (typeof response.token !== "string") throw new Error("PayToday did not return a payment token response.");
  const data = await verifyProviderToken(response.token, config.privateKey);
  const paymentToken = data.payment_intent_token ?? data.payment_token ?? data.token ?? data.id ?? data.payment_id;
  if (!data.payment_url || !paymentToken) throw new Error("PayToday payment response was incomplete.");
  const checkoutUrl = new URL(data.payment_url);
  if (checkoutUrl.protocol !== "https:") throw new Error("PayToday returned an invalid checkout URL.");
  return { checkoutUrl: checkoutUrl.toString(), paymentToken, providerReference: data.reference ?? null };
}

export async function lookupPayTodayPayment(paymentToken: string) {
  const config = settings();
  const accessToken = await createAccessToken();
  const response = await requestJson(`${config.baseUrl}/web/payment/lookup/${encodeURIComponent(paymentToken)}/`, {
    method: "GET",
    headers: { accept: "application/json", authorization: `Bearer ${accessToken}`, "user-agent": "NeuroCity/1.0" },
  });
  if (typeof response.token !== "string") throw new Error("PayToday did not return a signed payment status.");
  return verifyProviderToken(response.token, config.privateKey);
}

export function normalizePayTodayStatus(status: string | undefined) {
  switch (status?.trim().toLowerCase()) {
    case "paid": case "completed": case "complete": case "successful": case "success": return "paid";
    case "failed": case "declined": return "failed";
    case "cancelled": case "canceled": return "cancelled";
    case "expired": return "expired";
    default: return "pending";
  }
}
