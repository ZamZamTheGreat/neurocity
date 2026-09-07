import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { productVariants, products } from "../../../../../db/schema";
import { createPresignedR2Url } from "../../../../../lib/r2";
import { createUploadUrl, verifiedObject } from "../../../../../lib/upload-security";
import { requirePilotMerchant } from "../../auth";

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(request: Request) {
  const access = await requirePilotMerchant();
  if (!access) return Response.json({ error: "Merchant access required." }, { status: 403 });
  const variantId = Number(new URL(request.url).searchParams.get("variantId"));
  const [variant] = await getDb().select({ imageUrl: productVariants.imageUrl, productId: products.id }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(and(eq(productVariants.id, variantId), eq(products.merchantId, access.merchantId))).limit(1);
  if (!variant?.imageUrl) return Response.json({ error: "Variant image not found." }, { status: 404 });
  if (!variant.imageUrl.startsWith("r2://")) return Response.redirect(new URL(variant.imageUrl, request.url), 302);
  const key = variant.imageUrl.slice(5);
  if (!key.startsWith(`merchants/${access.merchantId}/products/${variant.productId}/variants/`)) return Response.json({ error: "Image unavailable." }, { status: 403 });
  if (!await verifiedObject(key).catch(() => null)) return Response.json({ error: "Image requires a verified upload." }, { status: 409 });
  return Response.redirect(createPresignedR2Url("GET", key, 300), 302);
}

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const { variantId, filename, mimeType, sizeBytes } = await request.json() as { variantId?: number; filename?: string; mimeType?: string; sizeBytes?: number };
  if (!Number.isInteger(variantId) || !filename || !mimeType || !imageTypes.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes! < 1 || sizeBytes! > 10 * 1024 * 1024) return Response.json({ error: "Upload a JPG, PNG or WebP image no larger than 10 MB." }, { status: 400 });
  const [variant] = await getDb().select({ id: productVariants.id, productId: products.id }).from(productVariants).innerJoin(products, eq(products.id, productVariants.productId)).where(and(eq(productVariants.id, variantId!), eq(products.merchantId, access.merchantId))).limit(1);
  if (!variant) return Response.json({ error: "Variant not found." }, { status: 404 });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const key = `merchants/${access.merchantId}/products/${variant.productId}/variants/${variant.id}/${randomUUID()}-${safeName}`;
  return Response.json({ uploadUrl: createUploadUrl(key, access.user.userId, mimeType, sizeBytes!), storageValue: `r2://${key}` });
}
