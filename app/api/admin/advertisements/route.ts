import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../../db";
import { advertisingCampaigns, auditEvents, merchants } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

async function administrator() { const user = await getChatGPTUser(); return user?.platformRole === "administrator" ? user : null; }
const cleanDate = (value?: string | null) => value ? new Date(value) : null;

export async function GET() {
  if (!await administrator()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const db = getDb();
  const [campaigns, merchantList] = await Promise.all([
    db.select({ id: advertisingCampaigns.id, merchantId: advertisingCampaigns.merchantId, placement: advertisingCampaigns.placement, headline: advertisingCampaigns.headline, description: advertisingCampaigns.description, callToAction: advertisingCampaigns.callToAction, status: advertisingCampaigns.status, sortOrder: advertisingCampaigns.sortOrder, startsAt: advertisingCampaigns.startsAt, endsAt: advertisingCampaigns.endsAt, updatedAt: advertisingCampaigns.updatedAt, merchantName: merchants.name, merchantSlug: merchants.slug, bannerUrl: merchants.bannerUrl }).from(advertisingCampaigns).innerJoin(merchants, eq(advertisingCampaigns.merchantId, merchants.id)).orderBy(asc(advertisingCampaigns.sortOrder), asc(advertisingCampaigns.id)),
    db.select({ id: merchants.id, name: merchants.name, slug: merchants.slug, bannerUrl: merchants.bannerUrl }).from(merchants).where(and(eq(merchants.isPublic, true), inArray(merchants.status, ["pilot", "active"]))).orderBy(asc(merchants.name)),
  ]);
  return Response.json({ campaigns, merchants: merchantList.filter((merchant) => Boolean(merchant.bannerUrl)) });
}

export async function POST(request: Request) {
  const user = await administrator();
  if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { merchantId?: number; placement?: string; headline?: string; description?: string; callToAction?: string; status?: string; sortOrder?: number; startsAt?: string | null; endsAt?: string | null };
  if (!Number.isInteger(body.merchantId) || !["home", "marketplace"].includes(body.placement ?? "") || !body.headline?.trim()) return Response.json({ error: "Choose a store and placement, then enter a headline." }, { status: 400 });
  const db = getDb();
  const [merchant] = await db.select({ id: merchants.id, bannerUrl: merchants.bannerUrl, isPublic: merchants.isPublic, status: merchants.status }).from(merchants).where(eq(merchants.id, body.merchantId!)).limit(1);
  if (!merchant?.bannerUrl || !merchant.isPublic || !["pilot", "active"].includes(merchant.status)) return Response.json({ error: "Only a public, active store with a banner can be advertised." }, { status: 409 });
  const startsAt = cleanDate(body.startsAt); const endsAt = cleanDate(body.endsAt);
  if ((startsAt && Number.isNaN(startsAt.valueOf())) || (endsAt && Number.isNaN(endsAt.valueOf())) || (startsAt && endsAt && endsAt <= startsAt)) return Response.json({ error: "Choose a valid campaign schedule." }, { status: 400 });
  const status = ["draft", "active", "paused"].includes(body.status ?? "") ? body.status! : "draft";
  const [campaign] = await db.insert(advertisingCampaigns).values({ merchantId: body.merchantId!, placement: body.placement!, headline: body.headline.trim(), description: body.description?.trim() || null, callToAction: body.callToAction?.trim() || "Visit store", status, sortOrder: Number.isInteger(body.sortOrder) ? body.sortOrder! : 0, startsAt, endsAt, createdBy: Number(user.userId) }).returning();
  await db.insert(auditEvents).values({ actorRef: user.userId, action: "advertisement.created", resourceType: "advertising_campaign", resourceId: String(campaign.id), metadata: { merchantId: body.merchantId, placement: body.placement, status } });
  return Response.json({ campaign }, { status: 201 });
}

export async function PATCH(request: Request) {
  const user = await administrator();
  if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { id?: number; status?: string; action?: string };
  if (!Number.isInteger(body.id)) return Response.json({ error: "A valid campaign is required." }, { status: 400 });
  const db = getDb();
  if (body.action === "delete") await db.delete(advertisingCampaigns).where(eq(advertisingCampaigns.id, body.id!));
  else {
    if (!["draft", "active", "paused"].includes(body.status ?? "")) return Response.json({ error: "Choose a valid campaign status." }, { status: 400 });
    await db.update(advertisingCampaigns).set({ status: body.status!, updatedAt: new Date() }).where(eq(advertisingCampaigns.id, body.id!));
  }
  await db.insert(auditEvents).values({ actorRef: user.userId, action: body.action === "delete" ? "advertisement.deleted" : "advertisement.status_changed", resourceType: "advertising_campaign", resourceId: String(body.id), metadata: { status: body.status ?? null } });
  return Response.json({ ok: true });
}
