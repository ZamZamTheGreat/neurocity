import { and, asc, eq, inArray, isNull, lte, or, gt } from "drizzle-orm";
import { getDb } from "../../../db";
import { advertisingCampaigns, merchants, products } from "../../../db/schema";
import { cachedPublicData, publicCacheHeaders } from "../../../lib/server-cache";

export async function GET(request: Request) {
  const placement = new URL(request.url).searchParams.get("placement");
  if (!placement || !["home", "marketplace", "home_featured"].includes(placement)) return Response.json({ advertisements: [] });
  const advertisements = await cachedPublicData(`advertisements:${placement}`, 20, async () => { const now = new Date();
  const rows = await getDb().select({
    id: advertisingCampaigns.id, placement: advertisingCampaigns.placement, headline: advertisingCampaigns.headline,
    description: advertisingCampaigns.description, callToAction: advertisingCampaigns.callToAction,
    merchantName: merchants.name, merchantSlug: merchants.slug, bannerUrl: merchants.bannerUrl,
    productId: products.id, productName: products.name, productImageUrl: products.imageUrl, productPrice: products.price, productSalePrice: products.salePrice, pricingModel: products.pricingModel, itemType: products.itemType, badge: products.badge,
  }).from(advertisingCampaigns).innerJoin(merchants, eq(advertisingCampaigns.merchantId, merchants.id)).leftJoin(products, eq(advertisingCampaigns.productId, products.id)).where(and(
    eq(advertisingCampaigns.placement, placement), eq(advertisingCampaigns.status, "active"),
    or(isNull(advertisingCampaigns.startsAt), lte(advertisingCampaigns.startsAt, now)),
    or(isNull(advertisingCampaigns.endsAt), gt(advertisingCampaigns.endsAt, now)),
    eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "active"]),
    placement === "home_featured" ? eq(products.status, "published") : undefined,
  )).orderBy(asc(advertisingCampaigns.sortOrder), asc(advertisingCampaigns.id));
  return rows.map((row) => ({
    ...row,
    bannerUrl: row.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(row.merchantSlug)}/media?type=banner` : row.bannerUrl,
    productImageUrl: row.productImageUrl?.startsWith("r2://") && row.productId ? `/api/stores/${encodeURIComponent(row.merchantSlug)}/media?type=product&productId=${row.productId}` : row.productImageUrl,
    storeUrl: `/stores/${encodeURIComponent(row.merchantSlug)}${row.productId ? `#product-${row.productId}` : ""}`,
  })); });
  return Response.json({ advertisements }, { headers: publicCacheHeaders(20, 60) });
}
