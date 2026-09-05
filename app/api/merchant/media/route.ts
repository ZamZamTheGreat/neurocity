import { createUploadUrl, verifiedObject } from "../../../../lib/upload-security";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { merchants } from "../../../../db/schema";
import { createPresignedR2Url } from "../../../../lib/r2";
import { requirePilotMerchant } from "../auth";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const mediaTypes = new Set(["logo", "banner"]);

export async function GET(request: Request) {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant access required." }, { status: 403 });
  const type = new URL(request.url).searchParams.get("type");
  if (!type || !mediaTypes.has(type)) return Response.json({ error: "Invalid image type." }, { status: 400 });
  const [merchant] = await getDb().select({ logoUrl: merchants.logoUrl, bannerUrl: merchants.bannerUrl }).from(merchants).where(eq(merchants.id, access.merchantId)).limit(1);
  const value = type === "logo" ? merchant?.logoUrl : merchant?.bannerUrl;
  if (!value) return Response.json({ error: "Image not found." }, { status: 404 });
  if (!value.startsWith("r2://")) return Response.redirect(new URL(value, request.url), 302);
  const key = value.slice(5);
  if (!key.startsWith(`merchants/${access.merchantId}/`)) return Response.json({ error: "Image unavailable." }, { status: 403 });
  if (!await verifiedObject(key).catch(() => null)) return Response.json({ error: "Image requires a verified upload." }, { status: 409 });
  return Response.redirect(createPresignedR2Url("GET", key, 300), 302);
}

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const { type, filename, mimeType, sizeBytes } = await request.json() as { type?: string; filename?: string; mimeType?: string; sizeBytes?: number };
  if (!type || !mediaTypes.has(type) || !filename || !mimeType || !imageTypes.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes! < 1 || sizeBytes! > 10 * 1024 * 1024) return Response.json({ error: "Upload a JPG, PNG or WebP image no larger than 10 MB." }, { status: 400 });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const key = `merchants/${access.merchantId}/${type}/${randomUUID()}-${safeName}`;
  return Response.json({ uploadUrl: createUploadUrl(key, access.user.userId, mimeType, sizeBytes!), storageValue: `r2://${key}` });
}
