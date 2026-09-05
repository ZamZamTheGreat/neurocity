import { createUploadUrl, verifiedObject } from "../../../../../lib/upload-security";
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { products } from "../../../../../db/schema";
import { createPresignedR2Url } from "../../../../../lib/r2";
import { requirePilotMerchant } from "../../auth";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant access required." }, { status: 403 });
  const url = new URL(request.url); const productId = Number(url.searchParams.get("productId")); const slot = Math.max(0, Math.min(2, Number(url.searchParams.get("slot") ?? 0)));
  const [product] = await getDb().select({ imageUrl: products.imageUrl, imageUrls: products.imageUrls }).from(products).where(and(eq(products.id, productId), eq(products.merchantId, access.merchantId))).limit(1);
  const source = ((product?.imageUrls as string[] | null) ?? [])[slot] ?? (slot === 0 ? product?.imageUrl : null);
  if (!source) return Response.json({ error: "Image not found." }, { status: 404 });
  if (!source.startsWith("r2://")) return Response.redirect(new URL(source, request.url), 302);
  const key = source.slice(5);
  if (!key.startsWith(`merchants/${access.merchantId}/products/${productId}/`)) return Response.json({ error: "Image unavailable." }, { status: 403 });
  if (!await verifiedObject(key).catch(() => null)) return Response.json({ error: "Image requires a verified upload." }, { status: 409 });
  return Response.redirect(createPresignedR2Url("GET", key, 300), 302);
}

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const { productId, filename, mimeType, sizeBytes, slot = 0 } = await request.json() as { productId?: number; filename?: string; mimeType?: string; sizeBytes?: number; slot?: number };
  if (!Number.isInteger(productId) || !Number.isInteger(slot) || slot < 0 || slot > 2 || !filename || !mimeType || !imageTypes.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes! < 1 || sizeBytes! > 10 * 1024 * 1024) return Response.json({ error: "Upload up to three JPG, PNG or WebP images no larger than 10 MB each." }, { status: 400 });
  const [product] = await getDb().select({ id: products.id }).from(products).where(and(eq(products.id, productId!), eq(products.merchantId, access.merchantId))).limit(1);
  if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const key = `merchants/${access.merchantId}/products/${product.id}/slot-${slot + 1}-${randomUUID()}-${safeName}`;
  return Response.json({ uploadUrl: createUploadUrl(key, access.user.userId, mimeType, sizeBytes!), storageValue: `r2://${key}` });
}
