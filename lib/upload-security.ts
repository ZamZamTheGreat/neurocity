import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { connect } from "node:net";
import sharpModule from "sharp";
import { PDFDocument } from "pdf-lib";
import { createPresignedR2Url, maxDocumentBytes } from "./r2";

type Ticket = { key: string; userId: string; mimeType: string; size: number; expires: number };
type ImagePipeline = {
  rotate(): ImagePipeline;
  png(): ImagePipeline;
  jpeg(): ImagePipeline;
  webp(): ImagePipeline;
  toBuffer(): Promise<Buffer>;
};
const sharp = sharpModule as unknown as (input: Buffer, options: { limitInputPixels: number; failOn: "warning"; animated: boolean }) => ImagePipeline;
function signingKey() {
  const key = process.env.R2_SECRET_ACCESS_KEY;
  if (!key) throw new Error("Private storage is unavailable.");
  return key;
}
const sign = (value: string) => createHmac("sha256", signingKey()).update(`upload-v1:${value}`).digest();

export function createUploadUrl(key: string, userId: string, mimeType: string, size: number) {
  const payload = Buffer.from(JSON.stringify({ key, userId, mimeType, size, expires: Date.now() + 600_000 })).toString("base64url");
  return `/api/uploads?ticket=${payload}.${sign(payload).toString("base64url")}`;
}

export function verifyUploadTicket(token: string, userId: string): Ticket {
  if (token.length > 4096) throw new Error("Invalid upload.");
  const [payload, signature, extra] = token.split(".");
  const received = Buffer.from(signature ?? "", "base64url");
  if (!payload || extra || received.length !== 32 || !timingSafeEqual(received, sign(payload))) throw new Error("Invalid upload.");
  const ticket = JSON.parse(Buffer.from(payload, "base64url").toString()) as Ticket;
  if (ticket.userId !== userId || !Number.isFinite(ticket.expires) || ticket.expires < Date.now() || !Number.isInteger(ticket.size) || ticket.size < 1 || ticket.size > maxDocumentBytes || typeof ticket.key !== "string" || ticket.key.split("/").some((part) => part === "." || part === "..")) throw new Error("Invalid upload.");
  return ticket;
}

export function validateFileType(bytes: Uint8Array, mime: string) {
  const data = Buffer.from(bytes);
  const valid = mime === "image/png" ? data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && data.subarray(-8, -4).toString() === "IEND"
    : mime === "image/jpeg" ? data[0] === 255 && data[1] === 216 && data[2] === 255 && data[data.length - 2] === 255 && data[data.length - 1] === 217
    : mime === "image/webp" ? data.subarray(0, 4).toString() === "RIFF" && data.subarray(8, 12).toString() === "WEBP" && data.length >= 16 && data.readUInt32LE(4) + 8 === data.length
    : mime === "application/pdf" ? /^%PDF-1\.[0-7]/.test(data.subarray(0, 8).toString()) && /%%EOF\s*$/.test(data.subarray(-1024).toString())
    : false;
  if (!valid) throw new Error("File content does not match its declared type.");
}

// Private clamd INSTREAM protocol. No file paths or user-selected hosts are sent.
// Missing scanner, timeout, size-limit responses and scan errors fail closed.
export async function scanFile(bytes: Uint8Array, allowSanitizationOnly = false) {
  const host = process.env.CLAMAV_HOST;
  const port = Number(process.env.CLAMAV_PORT ?? 3310);
  if (!host) {
    if (!allowSanitizationOnly || process.env.UPLOAD_MALWARE_SCAN_MODE === "required") throw new Error("File scanning is temporarily unavailable.");
    return "sanitization-only" as const;
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("File scanning is temporarily unavailable.");
  await new Promise<void>((resolve, reject) => {
    const socket = connect({ host, port });
    let response = "";
    const fail = () => { socket.destroy(); reject(new Error("File scanning failed or the file was rejected.")); };
    const timer = setTimeout(fail, 20_000);
    socket.on("close", () => clearTimeout(timer));
    socket.on("error", fail);
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      const length = Buffer.alloc(4); length.writeUInt32BE(bytes.length);
      socket.write(length); socket.write(bytes); socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk) => {
      response += chunk.toString();
      if (response.length > 4096) return fail();
      if (response.includes("\0")) {
        if (response.trim().replace(/\0$/, "") === "stream: OK") { socket.destroy(); resolve(); }
        else fail();
      }
    });
    socket.on("end", () => { if (!response.includes("\0")) fail(); });
  });
  return "clamav-v1" as const;
}

export async function storeScannedUpload(ticket: Ticket, bytes: Uint8Array) {
  if (bytes.length !== ticket.size) throw new Error("File size does not match the upload request.");
  validateFileType(bytes, ticket.mimeType);
  const scanResult = await scanFile(bytes, ticket.mimeType.startsWith("image/"));
  // Full decode rejects malformed images and decompression bombs. Re-encoding
  // strips metadata and trailing/polyglot payloads before anything is published.
  let stored: Buffer<ArrayBufferLike> = Buffer.from(bytes);
  if (ticket.mimeType.startsWith("image/")) {
    const decoder = sharp(stored, { limitInputPixels: 20_000_000, failOn: "warning", animated: false }).rotate();
    stored = await (ticket.mimeType === "image/png" ? decoder.png() : ticket.mimeType === "image/webp" ? decoder.webp() : decoder.jpeg()).toBuffer();
    if (stored.length > maxDocumentBytes) throw new Error("Processed image is too large.");
  } else if (ticket.mimeType === "application/pdf") {
    // Rebuild only the page graphics. Document actions, annotations, forms,
    // JavaScript and embedded attachments are not imported into the new file.
    const source = await PDFDocument.load(stored, { updateMetadata: false });
    if (source.isEncrypted || source.getPageCount() < 1 || source.getPageCount() > 100) throw new Error("Unsupported PDF.");
    const clean = await PDFDocument.create();
    for (const page of await clean.embedPages(source.getPages())) {
      clean.addPage([page.width, page.height]).drawPage(page);
    }
    stored = Buffer.from(await clean.save());
    if (stored.length > maxDocumentBytes) throw new Error("Processed PDF is too large.");
  }
  const headers = { "content-type": ticket.mimeType, "if-none-match": "*", "x-amz-meta-security-scan": scanResult === "clamav-v1" ? "clamav-v1" : "sanitized-v1", "x-amz-meta-sha256": createHash("sha256").update(stored).digest("hex") };
  const response = await fetch(createPresignedR2Url("PUT", ticket.key, 60, undefined, headers), {
    method: "PUT", body: new Uint8Array(stored).buffer, signal: AbortSignal.timeout(20_000),
    headers,
  });
  if (!response.ok) throw new Error("File could not be stored. Request a new upload and retry.");
}

export async function verifiedObject(key: string) {
  const response = await fetch(createPresignedR2Url("HEAD", key, 60), { method: "HEAD", signal: AbortSignal.timeout(10_000) });
  const size = Number(response.headers.get("content-length"));
  const securityStatus = response.headers.get("x-amz-meta-security-scan");
  const sanitizedRaster = securityStatus === "sanitized-v1" && response.headers.get("content-type")?.startsWith("image/");
  if (!response.ok || !(securityStatus === "clamav-v1" || sanitizedRaster) || !Number.isInteger(size) || size < 1 || size > maxDocumentBytes) throw new Error("Upload requires validation. Please upload the file again.");
  return response;
}
