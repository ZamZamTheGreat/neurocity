import { createHash, createHmac } from "node:crypto";

export const documentTypes = new Set(["business_registration", "representative_identification", "proof_of_business_address", "bank_confirmation_letter"]);
export const allowedDocumentMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
export const maxDocumentBytes = 10 * 1024 * 1024;

function getR2() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) throw new Error("Private document storage is not configured.");
  return { bucket, endpoint, accessKeyId, secretAccessKey, region: process.env.R2_REGION ?? "auto" };
}

const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();
const sortParameters = ([left]: [string, string], [right]: [string, string]) => left < right ? -1 : left > right ? 1 : 0;

export function createPresignedR2Url(method: "GET" | "PUT" | "HEAD" | "DELETE", key: string, expiresIn = 600, responseContentDisposition?: string, signedHeaders: Record<string, string> = {}) {
  const { bucket, endpoint, accessKeyId, secretAccessKey, region } = getR2();
  const now = new Date();
  const date = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const shortDate = date.slice(0, 8);
  const scope = `${shortDate}/${region}/s3/aws4_request`;
  const url = new URL(endpoint);
  if (url.protocol !== "https:") throw new Error("Storage requires HTTPS.");
  if (key.split("/").some((part) => part === "." || part === "..")) throw new Error("Invalid storage key.");
  const basePath = url.pathname.replace(/\/$/, "");
  url.pathname = `${basePath}/${encode(bucket)}/${key.split("/").map(encode).join("/")}`;
  const headerEntries = Object.entries({ ...signedHeaders, host: url.host }).map(([name, value]) => [name.toLowerCase(), value.trim().replace(/\s+/g, " ")] as [string, string]).sort(sortParameters);
  const headerNames = headerEntries.map(([name]) => name).join(";");
  const canonicalHeaders = headerEntries.map(([name, value]) => `${name}:${value}\n`).join("");
  const parameters = new Map<string, string>([
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${accessKeyId}/${scope}`],
    ["X-Amz-Date", date],
    ["X-Amz-Expires", String(Math.min(3600, Math.max(1, expiresIn)))],
    ["X-Amz-SignedHeaders", headerNames],
  ]);
  if (responseContentDisposition) parameters.set("response-content-disposition", responseContentDisposition);
  const canonicalQuery = [...parameters].sort(sortParameters).map(([name, value]) => `${encode(name)}=${encode(value)}`).join("&");
  const canonicalRequest = `${method}\n${url.pathname}\n${canonicalQuery}\n${canonicalHeaders}\n${headerNames}\nUNSIGNED-PAYLOAD`;
  const stringToSign = `AWS4-HMAC-SHA256\n${date}\n${scope}\n${createHash("sha256").update(canonicalRequest).digest("hex")}`;
  const signingKey = hmac(hmac(hmac(hmac(`AWS4${secretAccessKey}`, shortDate), region), "s3"), "aws4_request");
  parameters.set("X-Amz-Signature", createHmac("sha256", signingKey).update(stringToSign).digest("hex"));
  url.search = [...parameters].sort(sortParameters).map(([name, value]) => `${encode(name)}=${encode(value)}`).join("&");
  return url.toString();
}
