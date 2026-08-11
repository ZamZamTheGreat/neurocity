import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { merchants } from "../../../../../db/schema";
import { createPresignedR2Url } from "../../../../../lib/r2";

export async function GET(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const type = new URL(request.url).searchParams.get("type");
  if (type !== "logo" && type !== "banner") return Response.json({ error: "Invalid image type." }, { status: 400 });
  const [store] = await getDb().select({ id: merchants.id, logoUrl: merchants.logoUrl, bannerUrl: merchants.bannerUrl }).from(merchants).where(and(eq(merchants.slug, slug), eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "onboarding", "active"]))).limit(1);
  const value = type === "logo" ? store?.logoUrl : store?.bannerUrl;
  if (!store || !value) return Response.json({ error: "Image not found." }, { status: 404 });
  if (!value.startsWith("r2://")) return Response.redirect(new URL(value, request.url), 302);
  const key = value.slice(5);
  if (!key.startsWith(`merchants/${store.id}/`)) return Response.json({ error: "Image unavailable." }, { status: 403 });
  return Response.redirect(createPresignedR2Url("GET", key, 300), 302);
}
