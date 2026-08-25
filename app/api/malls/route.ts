import { and, asc, eq, inArray } from "drizzle-orm";
import { getDb } from "../../../db";
import { merchants, platformTenantDomains, platformTenantMerchants, platformTenants } from "../../../db/schema";

export async function GET() {
  try {
    const db = getDb();
    const malls = await db.select().from(platformTenants).where(and(eq(platformTenants.kind, "mall"), eq(platformTenants.status, "active"))).orderBy(asc(platformTenants.name));
    const mallIds = malls.map((mall) => mall.id);
    const assignments = mallIds.length ? await db.select().from(platformTenantMerchants).where(and(inArray(platformTenantMerchants.tenantId, mallIds), eq(platformTenantMerchants.status, "active"))) : [];
    const merchantIds = [...new Set(assignments.map((assignment) => assignment.merchantId))];
    const merchantList = merchantIds.length ? await db.select({ id: merchants.id, isPublic: merchants.isPublic, status: merchants.status }).from(merchants).where(inArray(merchants.id, merchantIds)) : [];
    const domains = mallIds.length ? await db.select().from(platformTenantDomains).where(inArray(platformTenantDomains.tenantId, mallIds)) : [];
    return Response.json({ malls: malls.map((mall) => { const members = assignments.filter((assignment) => assignment.tenantId === mall.id); const visible = members.filter((member) => { const merchant = merchantList.find((item) => item.id === member.merchantId); return merchant?.isPublic && ["active", "pilot"].includes(merchant.status); }); return { id: mall.id, name: mall.name, slug: mall.slug, city: mall.city, country: mall.country, tagline: mall.tagline, logoUrl: mall.logoUrl, markUrl: mall.markUrl, theme: mall.theme, features: mall.features, storeCount: visible.length, domain: domains.find((domain) => domain.tenantId === mall.id && domain.isPrimary)?.hostname ?? null }; }) }, { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=300" } });
  } catch (error) {
    console.error("public mall directory failed", error);
    return Response.json({ error: "Digital malls are temporarily unavailable." }, { status: 500 });
  }
}
