import { asc, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { auditEvents, merchants, platformTenantDomains, platformTenantMerchants, platformTenants } from "../../../../db/schema";
import { getChatGPTUser } from "../../../chatgpt-auth";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 120);
const hostnameOf = (value: string) => value.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].split(":")[0];

async function administrator() {
  const user = await getChatGPTUser();
  return user?.platformRole === "administrator" ? user : null;
}

export async function GET() {
  if (!await administrator()) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const db = getDb();
  let [demo] = await db.select().from(platformTenants).where(eq(platformTenants.slug, "harbour-square-demo")).limit(1);
  if (!demo) [demo] = await db.insert(platformTenants).values({ name: "Harbour Square", slug: "harbour-square-demo", kind: "mall", status: "active", country: "Namibia", city: "Walvis Bay", tagline: "The coast's favourite stores, now closer.", theme: { primary: "#d6a94f", surface: "#082633", accent: "#f8f1df" }, features: { concierge: true, merchantApplications: true, promotions: true, events: true } }).returning();
  const [lightwork] = await db.select().from(merchants).where(eq(merchants.slug, "lightwork-clothing")).limit(1);
  if (demo && lightwork) await db.insert(platformTenantMerchants).values({ tenantId: demo.id, merchantId: lightwork.id, status: "active", featured: true }).onConflictDoNothing();
  const [platforms, domains, assignments, merchantList] = await Promise.all([
    db.select().from(platformTenants).orderBy(asc(platformTenants.name)),
    db.select().from(platformTenantDomains).orderBy(asc(platformTenantDomains.hostname)),
    db.select().from(platformTenantMerchants),
    db.select({ id: merchants.id, name: merchants.name, category: merchants.category, status: merchants.status, isPublic: merchants.isPublic }).from(merchants).orderBy(asc(merchants.name)),
  ]);
  return Response.json({ platforms: platforms.map((platform) => ({ ...platform, domains: domains.filter((domain) => domain.tenantId === platform.id), merchants: assignments.filter((assignment) => assignment.tenantId === platform.id) })), merchants: merchantList });
}

export async function POST(request: Request) {
  const user = await administrator();
  if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { name?: string; kind?: string; city?: string; tagline?: string; hostname?: string };
  const name = body.name?.trim(); const slug = slugify(name ?? "");
  if (!name || slug.length < 2) return Response.json({ error: "A valid mall name is required." }, { status: 400 });
  const db = getDb();
  try {
    const platform = await db.transaction(async (tx) => {
      const [created] = await tx.insert(platformTenants).values({ name, slug, kind: body.kind === "marketplace" ? "marketplace" : "mall", country: "Namibia", city: body.city?.trim() || null, tagline: body.tagline?.trim() || `The digital home of ${name}.`, theme: { primary: "#18c98e", surface: "#07111f", accent: "#ffffff" }, features: { concierge: true, merchantApplications: true, promotions: true } }).returning();
      const hostname = body.hostname ? hostnameOf(body.hostname) : "";
      if (hostname) await tx.insert(platformTenantDomains).values({ tenantId: created.id, hostname, isPrimary: true });
      await tx.insert(auditEvents).values({ actorRef: user.userId, action: "platform.created", resourceType: "platform_tenant", resourceId: String(created.id), metadata: { name, hostname: hostname || null } });
      return created;
    });
    return Response.json({ platform }, { status: 201 });
  } catch (error) {
    console.error("platform creation failed", error);
    return Response.json({ error: "That mall name or domain is already in use." }, { status: 409 });
  }
}

export async function PATCH(request: Request) {
  const user = await administrator();
  if (!user) return Response.json({ error: "Administrator access required." }, { status: 403 });
  const body = await request.json() as { action?: string; platformId?: number; domainId?: number; merchantId?: number; name?: string; city?: string; tagline?: string; status?: string; hostname?: string; primary?: string; surface?: string };
  if (!Number.isInteger(body.platformId)) return Response.json({ error: "A valid mall is required." }, { status: 400 });
  const db = getDb(); const platformId = body.platformId!;
  try {
    if (body.action === "assign_merchant" && Number.isInteger(body.merchantId)) await db.insert(platformTenantMerchants).values({ tenantId: platformId, merchantId: body.merchantId!, status: "active" }).onConflictDoUpdate({ target: [platformTenantMerchants.tenantId, platformTenantMerchants.merchantId], set: { status: "active" } });
    else if (body.action === "remove_merchant" && Number.isInteger(body.merchantId)) await db.delete(platformTenantMerchants).where(eq(platformTenantMerchants.id, body.merchantId!));
    else if (body.action === "add_domain" && body.hostname) await db.insert(platformTenantDomains).values({ tenantId: platformId, hostname: hostnameOf(body.hostname), isPrimary: false });
    else if (body.action === "remove_domain" && Number.isInteger(body.domainId)) await db.delete(platformTenantDomains).where(eq(platformTenantDomains.id, body.domainId!));
    else if (body.action === "update") {
      if (!body.name?.trim()) return Response.json({ error: "Mall name is required." }, { status: 400 });
      await db.update(platformTenants).set({ name: body.name.trim(), city: body.city?.trim() || null, tagline: body.tagline?.trim() || null, status: body.status === "inactive" ? "inactive" : "active", theme: { primary: body.primary || "#18c98e", surface: body.surface || "#07111f", accent: "#ffffff" }, updatedAt: new Date() }).where(eq(platformTenants.id, platformId));
    } else return Response.json({ error: "A valid mall-management action is required." }, { status: 400 });
    await db.insert(auditEvents).values({ actorRef: user.userId, action: `platform.${body.action}`, resourceType: "platform_tenant", resourceId: String(platformId), metadata: { merchantId: body.merchantId ?? null, domainId: body.domainId ?? null } });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("platform update failed", error);
    return Response.json({ error: "The mall update could not be completed. Check for duplicate domains." }, { status: 409 });
  }
}
