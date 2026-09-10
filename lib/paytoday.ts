import { decodeJwt, decodeProtectedHeader } from "jose";

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
  amount?: number | string;
  invoice_number?: string;
  status?: string;
  reference?: string;
  intent?: {
    transaction_status?: string;
    payment_token?: string;
    amount?: number | string;
    invoice_number?: string;
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

function decodeProviderToken(token: string) {
  if (token.length > 100_000 || token.split(".").length !== 3) throw new Error("PayToday returned an invalid token.");
  const header = decodeProtectedHeader(token);
  if (!header.alg || header.alg.toLowerCase() === "none") throw new Error("PayToday returned an unsigned token.");
  const payload = decodeJwt(token);
  if (typeof payload.exp === "number" && payload.exp * 1000 <= Date.now()) throw new Error("PayToday returned an expired token.");
  if (!payload.data || typeof payload.data !== "object") throw new Error("PayToday returned an incomplete token.");
  // PayToday's official SDK decodes this payload without a merchant-side
  // verification key. This parser is used only on tokens returned by our
  // direct HTTPS request to a fixed PayToday service URL. Payment completion
  // is separately bound to NeuroCity's token, invoice and amount on lookup.
  return payload.data as PayTodayTokenData;
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
  const data = decodeProviderToken(response.token);
  if (!data.authorization?.access_token) throw new Error("PayToday authorization response was incomplete.");
  return data.authorization.access_token;
}

export async function createPayTodayPayment(input: PayTodayPaymentInput) {
  const config = settings();
  const email = input.email.trim().toLowerCase();
  const phone = input.phone.trim().replace(/[\s()-]/g, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new Error("PayToday requires a valid customer email address.");
  if (!/^\+?\d{7,15}$/.test(phone)) throw new Error("PayToday requires a valid customer mobile number.");
  const accessToken = await createAccessToken();
  const response = await requestJson(`${config.baseUrl}/web/create/payment/intent/`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json", authorization: `Bearer ${accessToken}`, "user-agent": "NeuroCity/1.0" },
    body: JSON.stringify({
      handle: config.shopHandle,
      amount: input.amount,
      invoice_number: input.invoiceNumber,
      user_first_name: input.firstName,
      user_last_name: input.lastName,
      user_email: email,
      user_phone_number: phone,
      return_url: input.returnUrl,
    }),
  });
  if (typeof response.token !== "string") throw new Error("PayToday did not return a payment token response.");
  const data = decodeProviderToken(response.token);
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
  return decodeProviderToken(response.token);
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
