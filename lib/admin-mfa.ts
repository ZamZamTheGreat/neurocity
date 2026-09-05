import { createHmac, timingSafeEqual } from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function decodeBase32(value: string) {
  const cleaned = value.toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = "";
  for (const character of cleaned) bits += alphabet.indexOf(character).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  return Buffer.from(bytes);
}

export function adminMfaConfigured() {
  return decodeBase32(process.env.ADMIN_MFA_SECRET ?? "").length >= 10;
}

export function totpCode(secret: string, now = Date.now()) {
  const counter = Math.floor(now / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret)).update(message).digest();
  const offset = digest[digest.length - 1] & 15;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}

export function verifyAdminMfa(code: unknown, now = Date.now()) {
  const secret = process.env.ADMIN_MFA_SECRET ?? "";
  if (!adminMfaConfigured() || typeof code !== "string" || !/^\d{6}$/.test(code)) return false;
  const supplied = Buffer.from(code);
  return [-30_000, 0, 30_000].some((offset) => {
    const expected = Buffer.from(totpCode(secret, now + offset));
    return supplied.length === expected.length && timingSafeEqual(supplied, expected);
  });
}
