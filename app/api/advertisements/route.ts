import { and, asc, eq, inArray, isNull, lte, or, gt } from "drizzle-orm";
import { getDb } from "../../../db";
import { advertisingCampaigns, merchants } from "../../../db/schema";
import { cachedPublicData, publicCacheHeaders } from "../../../lib/server-cache";

export async function GET(request: Request) {
  const placement = new URL(request.url).searchParams.get("placement");
  if (!placement || !["home", "marketplace"].includes(placement)) return Response.json({ advertisements: [] });
  const advertisements = await cachedPublicData(`advertisements:${placement}`, 20, async () => { const now = new Date();
  const rows = await getDb().select({
    id: advertisingCampaigns.id, placement: advertisingCampaigns.placement, headline: advertisingCampaigns.headline,
    description: advertisingCampaigns.description, callToAction: advertisingCampaigns.callToAction,
    merchantName: merchants.name, merchantSlug: merchants.slug, bannerUrl: merchants.bannerUrl,
  }).from(advertisingCampaigns).innerJoin(merchants, eq(advertisingCampaigns.merchantId, merchants.id)).where(and(
    eq(advertisingCampaigns.placement, placement), eq(advertisingCampaigns.status, "active"),
    or(isNull(advertisingCampaigns.startsAt), lte(advertisingCampaigns.startsAt, now)),
    or(isNull(advertisingCampaigns.endsAt), gt(advertisingCampaigns.endsAt, now)),
    eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "active"]),
  )).orderBy(asc(advertisingCampaigns.sortOrder), asc(advertisingCampaigns.id));
  return rows.map((row) => ({
    ...row,
    bannerUrl: row.bannerUrl?.startsWith("r2://") ? `/api/stores/${encodeURIComponent(row.merchantSlug)}/media?type=banner` : row.bannerUrl,
    storeUrl: `/stores/${encodeURIComponent(row.merchantSlug)}`,
  })); });
  return Response.json({ advertisements }, { headers: publicCacheHeaders(20, 60) });
}
