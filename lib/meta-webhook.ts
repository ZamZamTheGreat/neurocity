import { createHmac, timingSafeEqual } from "node:crypto";

export function verifyMetaWebhookSignature(body: Uint8Array, signature: string | null) {
  const secret = process.env.META_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("hex"), "utf8");
  const supplied = Buffer.from(signature.slice(7), "utf8");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export function privateContactReference(value: unknown) {
  return typeof value === "string" && value ? createHmac("sha256", process.env.SESSION_SECRET ?? process.env.META_APP_SECRET ?? "unconfigured").update(value).digest("hex").slice(0, 20) : null;
}
