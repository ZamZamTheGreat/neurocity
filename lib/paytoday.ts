import { jwtVerify } from "jose";

const API_VERSION = "12.12.2024";
const SANDBOX_URL = "https://admin.today-ww.net";
const LIVE_URL = "https://admin.today.com.na";

type PayTodayTokenData = {
  authorization?: { access_token?: string };
  payment_url?: string;
  payment_token?: string;
  token?: string;
  id?: string;
  payment_id?: string;
  status?: string;
  reference?: string;
  intent?: { transaction_status?: string; reference?: string };
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

async function verifyToken(token: string, privateKey: string) {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(privateKey), { algorithms: ["HS256"] });
  return (payload.data ?? {}) as PayTodayTokenData;
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
  const data = await verifyToken(response.token, config.privateKey);
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
  const data = await verifyToken(response.token, config.privateKey);
  const paymentToken = data.payment_token ?? data.token ?? data.id ?? data.payment_id;
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
  return verifyToken(response.token, config.privateKey);
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
