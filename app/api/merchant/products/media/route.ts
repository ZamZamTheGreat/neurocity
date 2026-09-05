import { createUploadUrl } from "../../../../../lib/upload-security";
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
  const productId = Number(new URL(request.url).searchParams.get("productId"));
  const [product] = await getDb().select({ imageUrl: products.imageUrl }).from(products).where(and(eq(products.id, productId), eq(products.merchantId, access.merchantId))).limit(1);
  if (!product?.imageUrl) return Response.json({ error: "Image not found." }, { status: 404 });
  if (!product.imageUrl.startsWith("r2://")) return Response.redirect(new URL(product.imageUrl, request.url), 302);
  const key = product.imageUrl.slice(5);
  if (!key.startsWith(`merchants/${access.merchantId}/products/${productId}/`)) return Response.json({ error: "Image unavailable." }, { status: 403 });
  return Response.redirect(createPresignedR2Url("GET", key, 300), 302);
}

export async function POST(request: Request) {
  const access = await requirePilotMerchant(["owner", "manager"]);
  if (!access) return Response.json({ error: "Owner or manager access required." }, { status: 403 });
  const { productId, filename, mimeType, sizeBytes } = await request.json() as { productId?: number; filename?: string; mimeType?: string; sizeBytes?: number };
  if (!Number.isInteger(productId) || !filename || !mimeType || !imageTypes.has(mimeType) || !Number.isInteger(sizeBytes) || sizeBytes! < 1 || sizeBytes! > 10 * 1024 * 1024) return Response.json({ error: "Upload a JPG, PNG or WebP image no larger than 10 MB." }, { status: 400 });
  const [product] = await getDb().select({ id: products.id }).from(products).where(and(eq(products.id, productId!), eq(products.merchantId, access.merchantId))).limit(1);
  if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
  const safeName = filename.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
  const key = `merchants/${access.merchantId}/products/${product.id}/${randomUUID()}-${safeName}`;
  return Response.json({ uploadUrl: createUploadUrl(key, access.user.userId, mimeType, sizeBytes!), storageValue: `r2://${key}` });
}
